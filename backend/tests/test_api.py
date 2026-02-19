"""Test the /api/generate endpoint (mocked services)."""
from io import BytesIO
from unittest.mock import patch

import fitz
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _pdf_bytes(text: str = "Jane Doe - Engineer") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), text)
    return doc.tobytes()


MINIMAL_TEX = r"\documentclass{article}\begin{document}Hello\end{document}"
FAKE_PDF = b"%PDF-1.4 fake"


def _form(cv=None, template=None, company="Acme", job="Software Engineer role"):
    return {
        "company_name": (None, company),
        "job_description": (None, job),
        "cv_pdf": ("cv.pdf", cv or _pdf_bytes(), "application/pdf"),
        "template_tex": ("template.tex", template or MINIMAL_TEX, "text/plain"),
    }


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_generate_returns_pdf():
    with patch("routes.generate.generate_latex", return_value=MINIMAL_TEX), \
         patch("routes.generate.compile_latex", return_value=FAKE_PDF):
        r = client.post("/api/generate", files=_form())
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_invalid_cv_extension():
    files = _form()
    files["cv_pdf"] = ("cv.docx", b"data", "application/octet-stream")
    r = client.post("/api/generate", files=files)
    assert r.status_code == 422


def test_invalid_template_extension():
    files = _form()
    files["template_tex"] = ("template.pdf", b"data", "application/pdf")
    r = client.post("/api/generate", files=files)
    assert r.status_code == 422


def test_generation_error_returns_500():
    with patch("routes.generate.generate_latex", side_effect=Exception("API down")):
        r = client.post("/api/generate", files=_form())
    assert r.status_code == 500
    assert "API down" in r.json()["detail"]


def test_compilation_error_returns_500():
    with patch("routes.generate.generate_latex", return_value=MINIMAL_TEX), \
         patch("routes.generate.compile_latex", side_effect=RuntimeError("pdflatex failed")):
        r = client.post("/api/generate", files=_form())
    assert r.status_code == 500
    assert "pdflatex failed" in r.json()["detail"]
