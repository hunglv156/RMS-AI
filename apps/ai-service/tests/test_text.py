import io

import pymupdf
import pytest
from docx import Document
from PIL import Image, ImageDraw, ImageFont

from app.extraction.text import DOCX_MIME, PDF_MIME, extract_text, normalize_text


def make_text_pdf(text: str, pages: int = 1) -> bytes:
    doc = pymupdf.open()
    for _ in range(pages):
        page = doc.new_page()
        page.insert_textbox(pymupdf.Rect(40, 40, 550, 800), text, fontsize=11)
    return bytes(doc.tobytes())


def make_scanned_pdf(text: str) -> bytes:
    """PDF chỉ có ảnh (không có lớp text) để buộc đi đường OCR."""
    img = Image.new("RGB", (1240, 700), "white")
    draw = ImageDraw.Draw(img)
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 44)
    except OSError:
        font = ImageFont.load_default(size=44)
    draw.multiline_text((40, 40), text, fill="black", font=font, spacing=20)
    png = io.BytesIO()
    img.save(png, format="PNG")
    doc = pymupdf.open()
    page = doc.new_page(width=620, height=350)
    page.insert_image(page.rect, stream=png.getvalue())
    return bytes(doc.tobytes())


LONG = "Senior Backend Engineer with Python and PostgreSQL experience. " * 12


def test_normalize_is_idempotent_and_stable() -> None:
    raw = "A  b\t c\r\n\r\n\r\n\r\nline  two  \n   \nend"
    once = normalize_text(raw)
    assert once == "A b c\n\nline two\n\nend"
    assert normalize_text(once) == once


def test_normalize_uses_nfc() -> None:
    decomposed = "Việt Nam"  # e + dấu mũ + dấu nặng
    assert normalize_text(decomposed) == "Việt Nam"


def test_pdf_with_text_layer_skips_ocr() -> None:
    result = extract_text(make_text_pdf(LONG), PDF_MIME)
    assert not result.ocr_used
    assert result.page_count == 1
    assert "Python" in result.text
    assert "ocr" not in result.flags


def test_scanned_pdf_uses_ocr_and_is_flagged() -> None:
    result = extract_text(
        make_scanned_pdf("Backend Engineer\nPython PostgreSQL Docker\nAgile Scrum"), PDF_MIME
    )
    assert result.ocr_used
    assert "ocr" in result.flags
    assert "Python" in result.text and "Docker" in result.text


def test_short_document_is_flagged() -> None:
    result = extract_text(make_text_pdf("Too short"), PDF_MIME)
    assert "too_short" in result.flags


def test_docx_text_and_tables() -> None:
    doc = Document()
    doc.add_paragraph("Nguyễn Văn A")
    doc.add_paragraph("Kỹ sư backend, Python và PostgreSQL")
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Docker"
    table.rows[0].cells[1].text = "Kubernetes"
    buf = io.BytesIO()
    doc.save(buf)
    result = extract_text(buf.getvalue(), DOCX_MIME)
    assert not result.ocr_used and result.page_count is None
    assert "Nguyễn Văn A" in result.text
    assert "Docker | Kubernetes" in result.text


def test_unsupported_mime() -> None:
    with pytest.raises(ValueError):
        extract_text(b"x", "text/plain")
