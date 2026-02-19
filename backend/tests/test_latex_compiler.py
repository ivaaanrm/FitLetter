"""Test LaTeX → PDF compilation."""
import pytest
from services.latex_compiler import compile_latex

MINIMAL_TEX = r"""
\documentclass{article}
\begin{document}
Hello, world.
\end{document}
"""

BROKEN_TEX = r"\input{/nonexistent/file/that/does/not/exist.tex}"


def test_compiles_to_pdf():
    pdf = compile_latex(MINIMAL_TEX)
    assert pdf[:4] == b"%PDF"


def test_broken_latex_raises():
    with pytest.raises(RuntimeError, match="pdflatex failed"):
        compile_latex(BROKEN_TEX)
