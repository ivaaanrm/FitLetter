"use client";

import { useRef, useState, useEffect } from "react";

const STEPS = [
  "Extracting CV",
  "Researching company",
  "Generating LaTeX",
  "Compiling PDF",
];

// Approximate durations (ms) before advancing to the next step visually.
// The last step stays active until the request resolves.
const STEP_DELAYS = [2_000, 8_000, 25_000];

type Status = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      stepTimers.current.forEach(clearTimeout);
    };
  }, [downloadUrl]);

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
    if (!cvFile || !templateFile) return;

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setStatus("loading");
    setErrorMsg("");
    startStepAnimation();

    const body = new FormData();
    body.append("company_name", companyName.trim());
    body.append("job_description", jobDescription.trim());
    body.append("cv_pdf", cvFile);
    body.append("template_tex", templateFile);

    try {
      const res = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        body,
      });

      stopStepAnimation();

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message ?? data.error ?? `Server error ${res.status}`);
        setStatus("error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
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
    companyName.trim() !== "" &&
    jobDescription.trim() !== "" &&
    cvFile !== null &&
    templateFile !== null &&
    !isLoading;

  return (
    <main className="min-h-screen bg-slate-900 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">
          Cover Letter Maker
        </h1>
        <p className="text-slate-400 mb-8 text-sm">
          Paste the job details, upload your CV and LaTeX template, and Claude
          will research the company and write a tailored cover letter.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Company name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          {/* Job description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job posting here…"
              rows={8}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y transition-colors"
            />
          </div>

          {/* File uploads */}
          <div className="grid grid-cols-2 gap-4">
            <FileUpload
              label="CV (PDF)"
              accept=".pdf"
              file={cvFile}
              disabled={isLoading}
              onChange={setCvFile}
            />
            <FileUpload
              label="LaTeX template (.tex)"
              accept=".tex"
              file={templateFile}
              disabled={isLoading}
              onChange={setTemplateFile}
            />
          </div>

          {/* Generate button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2.5 text-sm hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? "Generating…" : "Generate cover letter"}
          </button>
        </form>

        {/* Progress */}
        {isLoading && (
          <div className="mt-8">
            <ProgressSteps currentStep={currentStep} />
          </div>
        )}

        {/* Success */}
        {status === "success" && downloadUrl && (
          <div className="mt-8 p-4 rounded-lg bg-green-950 border border-green-800 flex items-center justify-between">
            <span className="text-sm text-green-300 font-medium">
              Cover letter ready
            </span>
            <a
              href={downloadUrl}
              download="cover-letter.pdf"
              className="rounded-lg bg-green-600 text-white text-sm font-semibold px-4 py-2 hover:bg-green-500 transition-colors cursor-pointer"
            >
              Download PDF
            </a>
          </div>
        )}

        {/* Error */}
        {status === "error" && errorMsg && (
          <div className="mt-8 p-4 rounded-lg bg-red-950 border border-red-800">
            <p className="text-sm text-red-300 font-medium">Generation failed</p>
            <p className="text-sm text-red-400 mt-1">{errorMsg}</p>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <ol className="space-y-3">
      {STEPS.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={[
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 transition-colors",
                done
                  ? "bg-blue-600 text-white"
                  : active
                  ? "bg-blue-900 text-blue-300 ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900"
                  : "bg-slate-800 text-slate-600",
              ].join(" ")}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={[
                "text-sm transition-colors",
                done
                  ? "text-slate-600 line-through"
                  : active
                  ? "text-slate-100 font-medium"
                  : "text-slate-600",
              ].join(" ")}
            >
              {label}
              {active && (
                <span className="ml-2 inline-block animate-pulse text-blue-400">
                  …
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}

function FileUpload({
  label,
  accept,
  file,
  disabled,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={[
          "w-full rounded-lg border-2 border-dashed px-3 py-4 text-sm text-center transition-colors",
          file
            ? "border-blue-500 bg-blue-950/40 text-blue-300"
            : "border-slate-700 bg-slate-800/50 text-slate-500 hover:border-blue-500 hover:bg-blue-950/20 hover:text-slate-300",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {file ? (
          <span className="font-medium truncate block">{file.name}</span>
        ) : (
          <span>Click to upload</span>
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
