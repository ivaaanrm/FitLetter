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
        setErrorMsg(
          data.message ?? data.error ?? `Server error ${res.status}`,
        );
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
    <main className="bg-gradient-animated min-h-screen flex items-start justify-center py-12 px-4 sm:py-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <svg
                className="h-5 w-5 text-primary-light"
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
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-50 tracking-tight sm:text-3xl">
              Cover Letter Maker
            </h1>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
            Paste the job details and upload your CV. Optionally add your LaTeX
            template to preserve its formatting. Claude will tailor the cover
            letter to the job description.
          </p>
        </header>

        {/* Card */}
        <div className="rounded-2xl border border-card-border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl shadow-black/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* API key */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Anthropic API key
              </label>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowApiKeyModal(true)}
                className={[
                  "w-full rounded-xl border px-4 py-2.5 text-sm text-left transition-all duration-200 cursor-pointer flex items-center gap-3",
                  apiKey
                    ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                    : "border-slate-700/80 bg-slate-800/60 hover:border-primary/40 hover:bg-slate-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                {/* Lock icon */}
                <svg
                  className={[
                    "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                    apiKey ? "text-primary-light" : "text-slate-500",
                  ].join(" ")}
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
                <span
                  className={[
                    "flex-1 truncate",
                    apiKey
                      ? "text-slate-300 font-mono tracking-widest"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  {apiKey ? "••••••••••••••••" : "Click to enter API key"}
                </span>
                {apiKey && (
                  <span className="flex-shrink-0 text-xs text-primary-light/70 font-medium">
                    Set
                  </span>
                )}
              </button>
              <p className="mt-1.5 text-xs text-slate-500">
                Your key is sent directly to Anthropic and is never stored.
              </p>
            </div>

            {/* API key modal */}
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

            {/* Company name */}
            <InputField
              label="Company name"
              type="text"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Acme Corp"
              disabled={isLoading}
            />

            {/* Job description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Job description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting here..."
                rows={7}
                disabled={isLoading}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed resize-y transition-all duration-200"
              />
            </div>

            {/* File uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Generate button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-cta text-white font-semibold py-3 text-sm hover:bg-cta-hover active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer shadow-lg shadow-cta/20 hover:shadow-cta/30"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="h-4 w-4 spinner"
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

          {/* Progress */}
          {isLoading && (
            <div className="mt-8 animate-slide-up">
              <ProgressSteps currentStep={currentStep} />
            </div>
          )}

          {/* Success */}
          {status === "success" && pdfUrl && texUrl && (
            <div className="mt-8 animate-slide-up rounded-xl bg-teal-950/50 border border-teal-800/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <svg
                    className="h-3.5 w-3.5 text-primary-light"
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
                <span className="text-sm text-teal-300 font-semibold">
                  Cover letter ready
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={texUrl}
                  download="cover-letter.tex"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700/80 text-slate-200 text-sm font-semibold px-4 py-2.5 hover:bg-slate-600/80 transition-colors duration-150 cursor-pointer"
                >
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
                  Download .tex
                </a>
                <a
                  href={pdfUrl}
                  download="cover-letter.pdf"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2.5 hover:bg-primary-light transition-colors duration-150 cursor-pointer shadow-md shadow-primary/20"
                >
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
                  Download PDF
                </a>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && errorMsg && (
            <div className="mt-8 animate-slide-up rounded-xl bg-red-950/50 border border-red-800/60 p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20">
                  <svg
                    className="h-3.5 w-3.5 text-red-400"
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
                <span className="text-sm text-red-300 font-semibold">
                  Generation failed
                </span>
              </div>
              <p className="text-sm text-red-400/90 mt-1 ml-8">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by Claude &middot; Your API key is never stored
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          "w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
          mono ? "font-mono" : "",
        ].join(" ")}
      />
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
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
              {/* Step circle */}
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 transition-all duration-300",
                  done
                    ? "bg-primary text-white"
                    : active
                      ? "bg-primary/15 ring-2 ring-primary/60 text-primary-light"
                      : "bg-slate-800 text-slate-600 ring-1 ring-slate-700",
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

              {/* Label */}
              <span
                className={[
                  "text-sm transition-colors duration-200",
                  done
                    ? "text-slate-500 line-through"
                    : active
                      ? "text-slate-100 font-medium"
                      : "text-slate-600",
                ].join(" ")}
              >
                {step.label}
                {active && (
                  <span className="ml-1.5 inline-block step-pulse text-primary-light">
                    ...
                  </span>
                )}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="ml-3.5 w-px h-3 bg-slate-700/60" />
            )}
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
  const cls = `h-3.5 w-3.5 ${active ? "text-primary-light" : "text-slate-600"}`;
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

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
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
          "w-full rounded-xl border-2 border-dashed px-4 py-5 text-sm text-center transition-all duration-200 drop-zone-glow",
          file
            ? "border-primary/50 bg-primary/5 text-primary-light"
            : dragOver
              ? "border-primary bg-primary/10 text-primary-light"
              : "border-slate-700/60 bg-slate-800/30 text-slate-500 hover:border-primary/40 hover:text-slate-400",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer",
        ].join(" ")}
      >
        {file ? (
          <span className="flex items-center justify-center gap-2">
            <FileIcon type={icon} />
            <span className="font-medium truncate max-w-[160px]">
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-2xl shadow-black/40 animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <svg
              className="h-4.5 w-4.5 text-primary-light"
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
            <h2 className="text-base font-semibold text-slate-100">
              Anthropic API key
            </h2>
            <p className="text-xs text-slate-500">
              Your key is never stored on our servers
            </p>
          </div>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="sk-ant-..."
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(draft);
          }}
          className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/50 transition-all duration-200 font-mono"
        />

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700/80 bg-slate-800/40 text-slate-300 text-sm font-medium py-2.5 hover:bg-slate-700/60 transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="flex-1 rounded-xl bg-primary text-white text-sm font-semibold py-2.5 hover:bg-primary-light transition-colors duration-150 cursor-pointer shadow-md shadow-primary/20"
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
