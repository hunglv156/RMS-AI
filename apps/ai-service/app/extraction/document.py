"""PDF text layers with a bounded, offline Tesseract fallback."""

import csv
import io
import math
import re
import subprocess
from dataclasses import dataclass
from typing import Literal

import pymupdf

EXTRACTOR_VERSION = "extract-v1"
NORMALIZATION_VERSION = "norm-v1"


class ExtractionError(Exception):
    """Base class for document extraction failures (never contains CV text)."""


class InvalidPDFError(ExtractionError):
    """Input is not a readable PDF."""


class EncryptedPDFError(ExtractionError):
    """Encrypted documents are unsupported, even with an empty password."""


class DocumentLimitError(ExtractionError):
    """A configured byte, page or rendered-pixel limit was exceeded."""


class OCRError(ExtractionError):
    """Tesseract is unavailable, failed, or exceeded its time limit."""


@dataclass(frozen=True)
class ExtractionLimits:
    max_bytes: int = 25 * 1024 * 1024
    max_pages: int = 100
    max_page_pixels: int = 25_000_000
    ocr_timeout_seconds: float = 60

    def __post_init__(self):
        for value in (
            self.max_bytes,
            self.max_pages,
            self.max_page_pixels,
            self.ocr_timeout_seconds,
        ):
            if not math.isfinite(value) or value <= 0:
                raise ValueError("Extraction limits must be positive and finite")


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    start_offset: int
    end_offset: int
    method: Literal["text_layer", "ocr"]
    ocr_mean_confidence: float | None
    flags: tuple[str, ...]


@dataclass(frozen=True)
class ExtractedDocument:
    text: str
    pages: tuple[ExtractedPage, ...]
    flags: tuple[str, ...]
    extractor_version: str
    normalization_version: str
    tool_versions: dict[str, str | None]


def normalize_text(text: str) -> str:
    """norm-v1: preserve words/order; trim line ends and outer blank lines.

    Internal horizontal spacing and Unicode are preserved. No dehyphenation,
    spelling correction, date conversion, or inferred content is performed.
    """
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    result = []
    for line in lines:
        line = line.rstrip()
        if line or (result and result[-1]):
            result.append(line)
    if result and not result[-1]:
        result.pop()
    return "\n".join(result)


def _open_pdf(pdf_bytes: bytes, limits: ExtractionLimits) -> pymupdf.Document:
    if not isinstance(pdf_bytes, (bytes, bytearray, memoryview)):
        raise InvalidPDFError("PDF input must be bytes-like")
    if len(pdf_bytes) > limits.max_bytes:
        raise DocumentLimitError("PDF exceeds maximum byte size")
    if not pdf_bytes.startswith(b"%PDF-"):
        raise InvalidPDFError("Missing PDF magic number")
    try:
        document = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except (pymupdf.FileDataError, RuntimeError, ValueError) as exc:
        raise InvalidPDFError("Unreadable PDF") from exc
    try:
        if document.needs_pass or document.is_encrypted or document.metadata.get("encryption"):
            raise EncryptedPDFError("Encrypted PDF is unsupported")
        if document.page_count > limits.max_pages:
            raise DocumentLimitError("PDF exceeds maximum page count")
        if document.page_count == 0:
            raise InvalidPDFError("PDF has no pages")
    except Exception:
        document.close()
        raise
    return document


def validate_pdf(pdf_bytes: bytes, *, limits: ExtractionLimits = ExtractionLimits()) -> int:
    """Validate magic, readability, encryption and limits; return the page count."""
    with _open_pdf(pdf_bytes, limits) as document:
        return document.page_count


def _rgb(color: int) -> tuple[int, int, int]:
    return (color >> 16 & 255, color >> 8 & 255, color & 255)


def _hidden_text(page: pymupdf.Page) -> bool:
    # Heuristic: tiny spans, white/near-white spans, or matching a vector fill
    # under their centre. Image/gradient backgrounds and occlusion need review.
    spans = [
        span
        for block in page.get_text("dict", flags=pymupdf.TEXTFLAGS_TEXT)["blocks"]
        for line in block.get("lines", [])
        for span in line["spans"]
        if span["text"].strip()
    ]
    fills = [drawing for drawing in page.get_drawings() if drawing.get("fill") is not None]
    for span in spans:
        color = _rgb(span["color"])
        if span["size"] <= 1 or min(color) >= 245:
            return True
        centre = (pymupdf.Rect(span["bbox"]).tl + pymupdf.Rect(span["bbox"]).br) / 2
        for drawing in fills:
            fill = drawing["fill"]
            if (
                len(fill) == 3
                and centre in drawing["rect"]
                and max(abs(channel - bg * 255) for channel, bg in zip(color, fill)) <= 10
            ):
                return True
    # PDF rendering mode 3 and zero opacity are also suspicious.
    return any(
        trace["chars"] and (trace["type"] == 3 or trace["opacity"] <= 0.01)
        for trace in page.get_texttrace()
    )


def _tesseract_version() -> str | None:
    try:
        result = subprocess.run(
            ["tesseract", "--version"], capture_output=True, timeout=5, check=True
        )
        return result.stdout.decode("utf-8", errors="replace").splitlines()[0]
    except (OSError, subprocess.SubprocessError, IndexError):
        return None


def _ocr(page: pymupdf.Page, lang: str, dpi: int, limits: ExtractionLimits):
    width = math.ceil(page.rect.width * dpi / 72)
    height = math.ceil(page.rect.height * dpi / 72)
    if width * height > limits.max_page_pixels:
        raise DocumentLimitError("Page exceeds maximum rendered pixel count")
    png = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csRGB, alpha=False).tobytes("png")
    try:
        result = subprocess.run(
            ["tesseract", "stdin", "stdout", "-l", lang, "--dpi", str(dpi), "tsv"],
            input=png,
            capture_output=True,
            timeout=limits.ocr_timeout_seconds,
            check=True,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        # Do not expose stderr, which may include input-derived content.
        raise OCRError("Tesseract unavailable, failed, or timed out") from exc
    lines: list[str] = []
    confidences: list[float] = []
    previous = None
    for row in csv.DictReader(
        io.StringIO(result.stdout.decode("utf-8", errors="replace")),
        delimiter="\t",
        quoting=csv.QUOTE_NONE,
    ):
        if row["level"] != "5" or not row["text"].strip():
            continue
        key = tuple(row[field] for field in ("block_num", "par_num", "line_num"))
        if key != previous:
            if previous and key[:2] != previous[:2]:
                lines.append("")
            lines.append(row["text"])
        else:
            lines[-1] += " " + row["text"]
        previous = key
        confidence = float(row["conf"])
        if confidence >= 0:
            confidences.append(confidence)
    mean = sum(confidences) / len(confidences) if confidences else None
    return normalize_text("\n".join(lines)), mean


def extract_document(
    pdf_bytes: bytes,
    *,
    ocr_lang: str = "eng",
    dpi: int = 200,
    limits: ExtractionLimits = ExtractionLimits(),
) -> ExtractedDocument:
    """Extract pages locally; confidence is a word mean on Tesseract's 0–100 scale.

    Any alphanumeric text-layer content is meaningful, including short names.
    Hidden text is retained and flagged, never silently removed. Offsets exclude
    the two-newline separators; empty pages have zero-width spans. Empty pages
    introduce no extra separators, so the final text remains norm-v1 normalized.
    """
    if not isinstance(dpi, int) or isinstance(dpi, bool) or dpi <= 0:
        raise ValueError("dpi must be a positive integer")
    if not re.fullmatch(r"[A-Za-z0-9_]+(?:\+[A-Za-z0-9_]+)*", ocr_lang):
        raise ValueError("ocr_lang must name Tesseract language codes")
    parts: list[str] = []
    pages: list[ExtractedPage] = []
    flags: set[str] = set()
    offset = 0
    with _open_pdf(pdf_bytes, limits) as document:
        for number, page in enumerate(document, start=1):
            page_flags: set[str] = set()
            if _hidden_text(page):
                page_flags.add("hidden_text")
            text = normalize_text(page.get_text("text", sort=True))
            confidence = None
            method = "text_layer"
            if not any(char.isalnum() for char in text):
                text, confidence = _ocr(page, ocr_lang, dpi, limits)
                method = "ocr"
                if confidence is not None and confidence < 60:
                    page_flags.add("low_ocr_confidence")
            if not text:
                page_flags.add("empty_page")
            if text and parts:
                offset += 2
            start = offset
            if text:
                parts.append(text)
                offset += len(text)
            pages.append(
                ExtractedPage(number, start, offset, method, confidence, tuple(sorted(page_flags)))
            )
            flags.update(page_flags)
    text = "\n\n".join(parts)
    if not text:
        flags.add("no_text")
    return ExtractedDocument(
        text,
        tuple(pages),
        tuple(sorted(flags)),
        EXTRACTOR_VERSION,
        NORMALIZATION_VERSION,
        {"tesseract": _tesseract_version(), "pymupdf": pymupdf.VersionBind},
    )
