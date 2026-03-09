"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const STEPS = [
  { label: "Extracting CV", icon: "document" },
  { label: "Generating LaTeX", icon: "code" },
  { label: "Compiling PDF", icon: "check" },
] as const;

const STEP_DELAYS = [2_000, 15_000];

type Status = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [texUrl, setTexUrl] = useState<string | null>(null);

  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (texUrl) URL.revokeObjectURL(texUrl);
      stepTimers.current.forEach(clearTimeout);
    };
  }, [pdfUrl, texUrl]);

  function startStepAnimation() {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
    setCurrentStep(0);
    let accumulated = 0;
    STEP_DELAYS.forEach((delay, i) => {
      accumulated += delay;
      const id = setTimeout(() => setCurrentStep(i + 1), accumulated);
      stepTimers.current.push(id);
    });
  }

  function stopStepAnimation() {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cvFile || !apiKey.trim()) return;

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    if (texUrl) {
      URL.revokeObjectURL(texUrl);
      setTexUrl(null);
    }

    setStatus("loading");
    setErrorMsg("");
    startStepAnimation();

    const body = new FormData();
    body.append("company_name", companyName.trim());
    body.append("job_description", jobDescription.trim());
    body.append("cv_pdf", cvFile);
    if (templateFile) body.append("template_tex", templateFile);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "X-API-Key": apiKey.trim() },
        body,
      });

      stopStepAnimation();

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message ?? data.error ?? `Server error ${res.status}`);
        setStatus("error");
        return;
      }

      const data = await res.json();
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0))],
        { type: "application/pdf" },
      );
      const texBlob = new Blob([data.tex], { type: "text/plain" });
      setPdfUrl(URL.createObjectURL(pdfBlob));
      setTexUrl(URL.createObjectURL(texBlob));
      setCurrentStep(STEPS.length - 1);
      setStatus("success");
    } catch (err) {
      stopStepAnimation();
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error");
      setStatus("error");
    }
  }

  const isLoading = status === "loading";
  const canSubmit =
    apiKey.trim() !== "" &&
    companyName.trim() !== "" &&
    jobDescription.trim() !== "" &&
    cvFile !== null &&
    !isLoading;

  return (
    <main className="bg-gradient-animated min-h-screen px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <nav className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-card-border/80 bg-background-soft/80 px-5 py-3 shadow-[0_10px_32px_rgba(80,65,31,0.08)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <p className="font-display text-xl leading-none text-foreground">FitLetter</p>
              <p className="text-xs text-muted">LaTeX cover letters tailored with Claude</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowApiKeyModal(true)}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5",
                apiKey
                  ? "border-primary/40 bg-primary/10 text-primary shadow-[0_10px_20px_rgba(27,127,106,0.14)] hover:bg-primary/20"
                  : "border-card-border bg-white text-foreground hover:border-primary/40 hover:text-primary hover:shadow-[0_10px_20px_rgba(27,127,106,0.14)]",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              ].join(" ")}
            >
              <svg
                className="h-4 w-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {apiKey ? (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </>
                ) : (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </>
                )}
              </svg>
              {apiKey ? "API Key Set" : "Add API Key"}
            </button>
            <a
              href="https://github.com/ivaaanrm/FitLetter"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-[0_10px_20px_rgba(27,127,106,0.14)] hidden sm:inline-flex"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .5C5.65.5.5 5.7.5 12.12c0 5.14 3.29 9.5 7.86 11.04.58.11.79-.26.79-.58v-2.24c-3.2.71-3.88-1.39-3.88-1.39-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.22 1.78 1.22 1.03 1.8 2.7 1.28 3.35.98.1-.76.4-1.28.74-1.57-2.55-.3-5.23-1.3-5.23-5.78 0-1.28.45-2.32 1.19-3.14-.12-.3-.52-1.5.11-3.13 0 0 .97-.32 3.18 1.2a10.9 10.9 0 0 1 5.78 0c2.2-1.52 3.17-1.2 3.17-1.2.63 1.63.23 2.83.11 3.13.74.82 1.19 1.86 1.19 3.14 0 4.5-2.69 5.47-5.25 5.76.41.36.78 1.06.78 2.14v3.17c0 .32.21.7.8.58a11.64 11.64 0 0 0 7.84-11.04C23.5 5.7 18.35.5 12 .5" />
              </svg>
              GitHub Repo
            </a>
          </div>
        </nav>

        <header className="mb-8 max-w-2xl">
          <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
            Write a polished cover letter in one pass
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Upload your CV, paste the job posting, and optionally include your
            LaTeX template. FitLetter returns both `.tex` and compiled PDF.
          </p>
        </header>

        <div className="rounded-[1.6rem] border border-card-border bg-card/95 p-6 shadow-[0_18px_54px_rgba(94,67,18,0.12)] sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">


            {showApiKeyModal && (
              <ApiKeyModal
                value={apiKey}
                onSave={(key) => {
                  setApiKey(key);
                  setShowApiKeyModal(false);
                }}
                onClose={() => setShowApiKeyModal(false)}
              />
            )}

            <InputField
              label="Company name"
              type="text"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Acme Corp"
              disabled={isLoading}
            />

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Job description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting here..."
                rows={7}
                disabled={isLoading}
                className="w-full resize-y rounded-xl border border-card-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted/90 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FileUpload
                label="CV (PDF)"
                accept=".pdf"
                file={cvFile}
                disabled={isLoading}
                onChange={setCvFile}
                icon="pdf"
              />
              <FileUpload
                label="LaTeX template (optional)"
                accept=".tex"
                file={templateFile}
                disabled={isLoading}
                onChange={setTemplateFile}
                icon="tex"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full cursor-pointer rounded-xl bg-cta py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(210,90,23,0.3)] transition-all duration-150 hover:bg-cta-hover hover:shadow-[0_14px_34px_rgba(188,78,18,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:scale-100"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="spinner h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </span>
              ) : (
                "Generate cover letter"
              )}
            </button>
          </form>

          {isLoading && (
            <div className="animate-slide-up mt-8">
              <ProgressSteps currentStep={currentStep} />
            </div>
          )}

          {status === "success" && pdfUrl && texUrl && (
            <div className="animate-slide-up mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <svg
                    className="h-3.5 w-3.5 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-emerald-900">
                  Cover letter ready
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={texUrl}
                  download="cover-letter.tex"
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-primary/30 hover:text-primary"
                >
                  <DownloadIcon />
                  Download .tex
                </a>
                <a
                  href={pdfUrl}
                  download="cover-letter.pdf"
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(27,127,106,0.25)] transition-colors duration-150 hover:bg-primary-light"
                >
                  <DownloadIcon />
                  Download PDF
                </a>
              </div>
            </div>
          )}

          {status === "error" && errorMsg && (
            <div className="animate-slide-up mt-8 rounded-xl border border-rose-200 bg-rose-50 p-5">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-200/70">
                  <svg
                    className="h-3.5 w-3.5 text-rose-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-rose-900">
                  Generation failed
                </span>
              </div>
              <p className="ml-8 mt-1 text-sm text-rose-700">{errorMsg}</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Powered by Claude. Your API key is never stored.
        </p>
      </div>
    </main>
  );
}

function InputField({
  label,
  hint,
  type,
  value,
  onChange,
  placeholder,
  disabled,
  mono,
}: {
  label: string;
  hint?: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          "w-full rounded-xl border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/90 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-50",
          mono ? "font-mono" : "",
        ].join(" ")}
      />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="space-y-1">
      {STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.label}>
            <div className="flex items-center gap-3 py-1.5">
              <div
                className={[
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  done
                    ? "bg-primary text-white"
                    : active
                      ? "bg-primary/10 text-primary ring-2 ring-primary/35"
                      : "bg-white text-muted ring-1 ring-card-border",
                ].join(" ")}
              >
                {done ? (
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <StepIcon name={step.icon} active={active} />
                )}
              </div>

              <span
                className={[
                  "text-sm transition-colors duration-200",
                  done
                    ? "text-muted line-through"
                    : active
                      ? "font-semibold text-foreground"
                      : "text-muted",
                ].join(" ")}
              >
                {step.label}
                {active && (
                  <span className="step-pulse ml-1.5 inline-block text-primary">
                    ...
                  </span>
                )}
              </span>
            </div>

            {!isLast && <div className="ml-3.5 h-3 w-px bg-card-border" />}
          </div>
        );
      })}
    </div>
  );
}

function StepIcon({
  name,
  active,
}: {
  name: string;
  active: boolean;
}) {
  const cls = `h-3.5 w-3.5 ${active ? "text-primary" : "text-muted"}`;
  switch (name) {
    case "document":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case "search":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "code":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "check":
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    default:
      return null;
  }
}

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
  icon: "pdf" | "tex";
}

function FileUpload({
  label,
  accept,
  file,
  disabled,
  onChange,
  icon,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) onChange(dropped);
    },
    [disabled, onChange],
  );

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "drop-zone-glow w-full rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-all duration-200",
          file
            ? "border-primary/40 bg-primary/5 text-primary"
            : dragOver
              ? "border-primary bg-primary/10 text-primary"
              : "border-card-border bg-white text-muted hover:border-primary/35",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        ].join(" ")}
      >
        {file ? (
          <span className="flex items-center justify-center gap-2">
            <FileIcon type={icon} />
            <span className="max-w-[160px] truncate font-semibold">
              {file.name}
            </span>
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-xs">Click or drag to upload</span>
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function ApiKeyModal({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (key: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enter API key"
    >
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="animate-slide-up relative w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-[0_24px_60px_rgba(45,32,12,0.25)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
            <svg
              className="h-4.5 w-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Anthropic API key
            </h2>
            <p className="text-xs text-muted">Your key is never stored on our servers</p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="sk-ant-..."
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(draft);
          }}
          className="w-full rounded-xl border border-card-border bg-white px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted/90 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/45"
        />

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-card-border bg-white py-2.5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-primary/35 hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="flex-1 cursor-pointer rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-light"
          >
            Save key
          </button>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ type }: { type: "pdf" | "tex" }) {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      {type === "pdf" ? (
        <>
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </>
      ) : (
        <>
          <polyline points="10 12 8 14 10 16" />
          <polyline points="14 12 16 14 14 16" />
        </>
      )}
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
