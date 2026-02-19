# Cover Letter Maker — Design Document
**Date:** 2026-02-19
**Status:** Approved

---

## Overview

A personal local web app that generates a professional, personalized LaTeX cover letter by combining:
- The user's CV (PDF)
- A job description (text)
- A company name
- A custom LaTeX template (.tex)

Claude (`claude-opus-4-6`) researches the company via its built-in `web_search` tool, then generates tailored cover letter content. The LaTeX template provides structure and formatting; Claude writes all body text from scratch. The result is compiled to PDF and downloaded in the browser.

---

## Architecture

```
cover-letter-maker/
├── backend/              ← FastAPI (Python 3.12, managed by uv)
├── frontend/             ← Next.js 15 (TypeScript, Tailwind CSS)
├── docs/plans/           ← Design documents
└── skills/               ← Reference copy of Claude Code skill
```

**Local dev:**
- Backend: `uv run uvicorn main:app --reload` on `http://localhost:8000`
- Frontend: `npm run dev` on `http://localhost:3000`
- Run both: `make dev`

---

## Backend

### Stack
- Python 3.12, FastAPI, uv
- PyMuPDF — PDF text extraction
- anthropic SDK — Claude API with `web_search` tool
- python-dotenv — `ANTHROPIC_API_KEY` from `.env`

### API

```
POST /api/generate
Content-Type: multipart/form-data

Fields:
  cv_pdf          file     required  CV as PDF
  template_tex    file     required  LaTeX template (.tex)
  job_description string   required  Pasted job description
  company_name    string   required  Company name for research

Response:
  200  application/pdf       Compiled PDF binary (browser download)
  422  application/json      { "error": "ValidationError", "details": [...] }
  500  application/json      { "error": "CompileError", "message": "..." }

GET /api/health
  200  { "status": "ok" }
```

### Services

**cv_parser.py** — Opens PDF with PyMuPDF, extracts full text.

**claude_agent.py** — Agentic loop:
1. Loads system prompt from `prompts/cover_letter.md`
2. Sends CV text + job description + company name + template to Claude
3. Claude calls `web_search` to research company (mission, values, culture, news)
4. Claude generates complete LaTeX — using template structure, rewriting all body text
5. Loop ends when `stop_reason == "end_turn"`
6. Returns raw LaTeX string

**latex_compiler.py** — Writes LaTeX to a temp `.tex` file, runs `pdflatex -interaction=nonstopmode`, reads and returns the resulting `.pdf` bytes, cleans up temp files.

---

## Frontend

### Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS

### UI

Single page with:
- Company name input
- Job description textarea
- CV PDF upload
- LaTeX template (.tex) upload
- Generate button (disabled while processing)
- Progress steps (Extracting CV → Researching company → Generating LaTeX → Compiling PDF)
- Download PDF button (appears on success)
- Inline error display on failure

The frontend POSTs `multipart/form-data` directly to `http://localhost:8000/api/generate` and uses the response blob to trigger a browser download.

---

## Claude Agentic Flow

**Model:** `claude-opus-4-6`
**Tools:** `web_search_20250305`

**System prompt instructs Claude to:**
1. Search for company mission, values, recent news, and culture
2. Cross-reference company values with the candidate's CV strengths
3. Match writing tone to the company's culture
4. Use the LaTeX template **only for structure and formatting** (headers, fonts, layout) — rewrite all body text entirely from scratch
5. Return **only** valid LaTeX code — no markdown, no explanation, no preamble

---

## cover-letter-generator Skill

Created at `~/.claude/skills/cover-letter-generator/README.md`.

- Invokable from Claude Code CLI as `/cover-letter-generator`
- Backend reads the same prompt file as its system prompt — single source of truth
- Skill instructs Claude to act as expert cover letter writer producing LaTeX output

---

## Environment

```
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Out of Scope

- User authentication (personal tool)
- Storage / history of past letters
- Built-in templates (user supplies their own)
- Deployment / hosting
