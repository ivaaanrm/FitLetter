import subprocess
import tempfile
from pathlib import Path


def compile_latex(latex_code: str) -> bytes:
    """
    Write LaTeX to a temp file, run pdflatex, and return the PDF bytes.
    Cleans up all temp files afterwards.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = Path(tmpdir) / "cover_letter.tex"
        pdf_path = Path(tmpdir) / "cover_letter.pdf"

        tex_path.write_text(latex_code, encoding="utf-8")

        # Run pdflatex twice: first pass generates counters/references,
        # second pass resolves them for a consistent final document.
        pdflatex_cmd = [
            "pdflatex",
            "-interaction=nonstopmode",
            "-output-directory", tmpdir,
            str(tex_path),
        ]
        for _ in range(2):
            result = subprocess.run(
                pdflatex_cmd,
                capture_output=True,
                text=True,
                timeout=60,
            )

        if not pdf_path.exists():
            log = result.stdout + result.stderr
            raise RuntimeError(f"pdflatex failed:\n{log[-3000:]}")

        return pdf_path.read_bytes()
