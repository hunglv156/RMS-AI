import shutil
import subprocess

import pymupdf
import pytest

from app.extraction import (
    DocumentLimitError,
    EncryptedPDFError,
    ExtractionLimits,
    InvalidPDFError,
    OCRError,
    extract_document,
    normalize_text,
    validate_pdf,
)

ocr = pytest.mark.skipif(shutil.which("tesseract") is None, reason="Tesseract is not installed")


def make_pdf(*texts, encrypted=False):
    with pymupdf.open() as doc:
        for text in texts:
            page = doc.new_page(width=400, height=220)
            if text:
                page.insert_text((25, 50), text, fontsize=16)
        if encrypted:
            return doc.tobytes(
                encryption=pymupdf.PDF_ENCRYPT_AES_256,
                owner_pw="owner-secret",
                user_pw="reader-secret",
            )
        return doc.tobytes()


def image_pdf():
    with pymupdf.open(stream=make_pdf("Python developer\nDatabase experience")) as source:
        image = source[0].get_pixmap(dpi=200).tobytes("png")
    with pymupdf.open() as doc:
        page = doc.new_page(width=400, height=220)
        page.insert_image(page.rect, stream=image)
        return doc.tobytes()


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("\r\n  Alice  \rPython\t\r\n\r\n\nSQL  \n", "  Alice\nPython\n\nSQL"),
        (" \n\t\r\n", ""),
        ("a  b\n   c\n\n\nlast", "a  b\n   c\n\nlast"),
        ("Tiếng Việt\r\nword-\nwrap", "Tiếng Việt\nword-\nwrap"),
    ],
)
def test_normalization(raw, expected):
    assert normalize_text(raw) == expected
    assert normalize_text(normalize_text(raw)) == expected


def test_text_layer_offsets():
    result = extract_document(make_pdf("Python developer", "SQL experience"))
    assert result.text == "Python developer\n\nSQL experience"
    assert result.flags == ()
    assert result.extractor_version == "extract-v1"
    assert result.normalization_version == "norm-v1"
    assert result.tool_versions["pymupdf"] == pymupdf.VersionBind
    for page, expected in zip(result.pages, ["Python developer", "SQL experience"]):
        assert result.text[page.start_offset : page.end_offset] == expected
        assert page.method == "text_layer"
        assert page.ocr_mean_confidence is None
    assert result.pages[1].page_number == 2
    assert result.pages[1].start_offset == result.pages[0].end_offset + 2


@pytest.mark.parametrize("kind", ["white", "near_white", "tiny", "invisible", "background"])
def test_hidden_text_retained(kind):
    with pymupdf.open() as doc:
        page = doc.new_page()
        page.insert_text((50, 50), "Visible experience")
        color = (1, 1, 1) if kind == "white" else (0.97, 0.97, 0.97)
        if kind == "background":
            color = (0.2, 0.4, 0.6)
            page.draw_rect(pymupdf.Rect(40, 65, 300, 90), fill=color)
        page.insert_text(
            (50, 80),
            "Hidden keywords",
            fontsize=0.5 if kind == "tiny" else 11,
            color=color if kind in {"white", "near_white", "background"} else (0, 0, 0),
            render_mode=3 if kind == "invisible" else 0,
        )
        result = extract_document(doc.tobytes())
    assert "Hidden keywords" in result.text
    assert "hidden_text" in result.flags
    assert "hidden_text" in result.pages[0].flags


@ocr
def test_image_only_ocr():
    pdf = image_pdf()
    with pymupdf.open(stream=pdf) as doc:
        assert doc[0].get_text() == ""
    result = extract_document(pdf)
    assert "Python developer" in result.text
    assert "Database experience" in result.text
    page = result.pages[0]
    assert page.method == "ocr"
    assert page.ocr_mean_confidence > 60
    assert result.text[page.start_offset : page.end_offset] == result.text
    assert result.tool_versions["tesseract"].startswith("tesseract")


@ocr
def test_empty_page_and_mixed_offsets():
    result = extract_document(make_pdf("First page", "", "Last page", ""))
    assert result.text == "First page\n\nLast page"
    assert normalize_text(result.text) == result.text
    assert result.flags == ("empty_page",)
    for page, expected in zip(result.pages, ["First page", "", "Last page", ""]):
        assert result.text[page.start_offset : page.end_offset] == expected
    empty = extract_document(make_pdf(""))
    assert empty.text == ""
    assert empty.flags == ("empty_page", "no_text")
    assert empty.pages[0].ocr_mean_confidence is None


@pytest.mark.parametrize("data", [b"", b"not a PDF", b"%PDF-1.7\nbroken"])
def test_invalid_pdf(data):
    with pytest.raises(InvalidPDFError):
        extract_document(data)


@pytest.mark.parametrize("data", [None, "%PDF-1.7", 123])
def test_non_bytes_pdf_input(data):
    with pytest.raises(InvalidPDFError, match="bytes-like"):
        validate_pdf(data)


def test_encrypted_pdf():
    with pytest.raises(EncryptedPDFError):
        extract_document(make_pdf("Private", encrypted=True))
    with pymupdf.open(stream=make_pdf("Private")) as doc:
        owner_only = doc.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw="owner")
    with pytest.raises(EncryptedPDFError):
        validate_pdf(owner_only)


def test_limits():
    pdf = make_pdf("One", "Two")
    assert validate_pdf(pdf) == 2
    with pytest.raises(DocumentLimitError):
        extract_document(pdf, limits=ExtractionLimits(max_bytes=len(pdf) - 1))
    with pytest.raises(DocumentLimitError):
        extract_document(pdf, limits=ExtractionLimits(max_pages=1))
    with pytest.raises(DocumentLimitError):
        extract_document(make_pdf(""), limits=ExtractionLimits(max_page_pixels=10))
    with pytest.raises(ValueError):
        ExtractionLimits(max_pages=0)
    with pytest.raises(ValueError):
        extract_document(pdf, dpi=0)
    with pytest.raises(ValueError):
        extract_document(pdf, ocr_lang="--help")


def test_ocr_failure_and_timeout(monkeypatch):
    def fail(*args, **kwargs):
        raise FileNotFoundError("tesseract")

    monkeypatch.setattr(subprocess, "run", fail)
    with pytest.raises(OCRError):
        extract_document(make_pdf(""))
    # Text-layer documents remain usable without the OCR binary.
    assert extract_document(make_pdf("Developer")).tool_versions["tesseract"] is None

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired("tesseract", 60)

    monkeypatch.setattr(subprocess, "run", timeout)
    with pytest.raises(OCRError):
        extract_document(make_pdf(""))


def test_low_confidence_flag(monkeypatch):
    from app.extraction import document

    monkeypatch.setattr(document, "_ocr", lambda *args: ("Uncertain words", 42.0))
    result = extract_document(make_pdf(""))
    assert "low_ocr_confidence" in result.flags
    assert "low_ocr_confidence" in result.pages[0].flags


def test_ocr_replaces_invalid_utf8(monkeypatch):
    from app.extraction import document

    monkeypatch.setattr(
        document.subprocess,
        "run",
        lambda *args, **kwargs: type(
            "Result",
            (),
            {
                "stdout": b"level\tblock_num\tpar_num\tline_num\tconf\ttext\n5\t1\t1\t1\t90\tA\xffB\n"
            },
        )(),
    )
    result = extract_document(make_pdf(""))
    assert result.text == "A\ufffdB"
