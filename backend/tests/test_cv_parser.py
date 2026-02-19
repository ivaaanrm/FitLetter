"""Test CV PDF text extraction."""
import fitz
import pytest
from services.cv_parser import extract_text_from_pdf


def _make_pdf(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), text)
    return doc.tobytes()


def test_extracts_text():
    pdf = _make_pdf("John Doe - Software Engineer")
    result = extract_text_from_pdf(pdf)
    assert "John Doe" in result


def test_empty_pdf_returns_empty_string():
    doc = fitz.open()
    doc.new_page()
    result = extract_text_from_pdf(doc.tobytes())
    assert result == ""


def test_invalid_bytes_raises():
    with pytest.raises(Exception):
        extract_text_from_pdf(b"not a pdf")
