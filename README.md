# FitLetter

FitLetter generates tailored cover letters from your CV and a job description.
It returns both a LaTeX file and a compiled PDF.

## Stack

- Frontend: Next.js + Tailwind CSS
- Backend: FastAPI
- AI: Anthropic Claude API

## Quick start

### 1. Install dependencies

```bash
make install
```

### 2. Run locally

```bash
make dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## How to use

1. Open the app in your browser.
2. Add your Anthropic API key in the UI.
3. Enter company name and job description.
4. Upload your CV (PDF) and optional LaTeX template.
5. Generate and download `.tex` and `.pdf`.

## Production

Production containers are defined in `docker-compose.yml` with `frontend/Dockerfile.prod` and `backend/Dockerfile.prod`.
