import base64
import logging

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.claude_agent import generate_latex
from services.cv_parser import extract_text_from_pdf
from services.latex_compiler import compile_latex

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate")
async def generate_cover_letter(
    cv_pdf: UploadFile = File(..., description="CV as PDF"),
    job_description: str = Form(..., description="Job description text"),
    company_name: str = Form(..., description="Company name"),
    x_api_key: str = Header(..., description="Anthropic API key"),
    template_tex: UploadFile | None = File(None, description="LaTeX template (.tex), optional"),
) -> JSONResponse:
    logger.info("Request received: company=%r, cv=%r, template=%r", company_name, cv_pdf.filename, template_tex.filename if template_tex else None)

    # Validate file types
    if not cv_pdf.filename.endswith(".pdf"):
        raise HTTPException(status_code=422, detail="cv_pdf must be a PDF file.")
    if template_tex and not template_tex.filename.endswith(".tex"):
        raise HTTPException(status_code=422, detail="template_tex must be a .tex file.")

    # Parse CV
    cv_bytes = await cv_pdf.read()
    logger.info("[1/3] Parsing CV (%d bytes)", len(cv_bytes))
    try:
        cv_text = extract_text_from_pdf(cv_bytes)
        logger.info("[1/3] CV parsed — %d chars extracted", len(cv_text))
    except Exception as e:
        logger.exception("[1/3] CV parsing failed")
        raise HTTPException(status_code=422, detail=f"Failed to parse CV PDF: {e}")

    # Read template (if provided)
    template_content = None
    if template_tex:
        template_content = (await template_tex.read()).decode("utf-8")
        logger.info("[2/3] Template read — %d chars", len(template_content))
    else:
        logger.info("[2/3] No template provided — will generate from scratch")

    # Generate LaTeX via Claude
    logger.info("[2/3] Calling Claude...")
    try:
        latex_code = generate_latex(
            cv_text=cv_text,
            job_description=job_description,
            company_name=company_name,
            template_content=template_content,
            api_key=x_api_key,
        )
        logger.info("[2/3] Claude returned %d chars of LaTeX", len(latex_code))
    except Exception as e:
        logger.exception("[2/3] Claude generation failed")
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

    # Compile to PDF
    logger.info("[3/3] Compiling LaTeX...")
    try:
        pdf_bytes = compile_latex(latex_code)
        logger.info("[3/3] PDF compiled — %d bytes", len(pdf_bytes))
    except RuntimeError as e:
        logger.exception("[3/3] LaTeX compilation failed")
        raise HTTPException(status_code=500, detail=f"LaTeX compilation failed: {e}")

    logger.info("Done — returning PDF + LaTeX")
    return JSONResponse(content={
        "pdf": base64.b64encode(pdf_bytes).decode("ascii"),
        "tex": latex_code,
    })
