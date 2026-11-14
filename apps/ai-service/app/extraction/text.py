"""Đọc text từ PDF/DOCX; PDF không có lớp text thì OCR bằng Tesseract (vie+eng, 200 DPI)."""

import io
import re
import unicodedata
from dataclasses import dataclass, field

import pymupdf as fitz  # PyMuPDF
import pytesseract
from docx import Document
from PIL import Image

OCR_DPI = 200
OCR_LANG = "vie+eng"
MIN_CHARS_PER_PAGE = 100  # dưới ngưỡng này coi là PDF scan
TOO_SHORT_CHARS = 300


@dataclass
class ExtractedText:
    text: str
    page_count: int | None
    ocr_used: bool
    flags: list[str] = field(default_factory=list)


def normalize_text(text: str) -> str:
    """Chuẩn hoá để offset ổn định: NFC, xuống dòng thống nhất, gọn khoảng trắng.

    Đây là mốc tham chiếu cho offset của trích dẫn (README 10.3): cùng hàm, cùng kết quả.
    """
    text = unicodedata.normalize("NFC", text).replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\x00", "").replace(" ", " ")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _flags(text: str, ocr_used: bool) -> list[str]:
    flags = []
    if ocr_used:
        flags.append("ocr")
    if len(text) < TOO_SHORT_CHARS:
        flags.append("too_short")
    return flags


def extract_pdf(data: bytes) -> ExtractedText:
    with fitz.open(stream=data, filetype="pdf") as doc:
        pages = doc.page_count
        native = "\n".join(page.get_text() for page in doc)
        if len(native.strip()) >= MIN_CHARS_PER_PAGE * pages:
            text = normalize_text(native)
            return ExtractedText(text, pages, False, _flags(text, False))
        images = [page.get_pixmap(dpi=OCR_DPI).tobytes("png") for page in doc]
    ocr = "\n".join(
        pytesseract.image_to_string(Image.open(io.BytesIO(png)), lang=OCR_LANG)  # type: ignore[attr-defined]
        for png in images
    )
    text = normalize_text(ocr)
    return ExtractedText(text, pages, True, _flags(text, True))


def extract_docx(data: bytes) -> ExtractedText:
    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text for cell in row.cells))
    text = normalize_text("\n".join(parts))
    return ExtractedText(text, None, False, _flags(text, False))


PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def extract_text(data: bytes, mime_type: str) -> ExtractedText:
    if mime_type == PDF_MIME:
        return extract_pdf(data)
    if mime_type == DOCX_MIME:
        return extract_docx(data)
    raise ValueError(f"Unsupported mime type: {mime_type}")
