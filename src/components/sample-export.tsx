import { useState } from "react";
import { FileText, FileType2, Download, Loader2 } from "lucide-react";

type Kind = "docx" | "pdf";

async function downloadSample(kind: Kind) {
  const { downloadPaper } = await import("@/lib/export-client");
  await downloadPaper(kind, `Co-Research-AI-Sample-Term-Paper.${kind}`);
}

/**
 * Replaces the old interactive demo page: users pick a format and the sample
 * term paper is generated and downloaded straight to their device.
 */
export function SampleExportButtons({ variant = "primary" }: { variant?: "primary" | "outline" | "inverse" }) {
  const [busy, setBusy] = useState<Kind | null>(null);

  async function go(kind: Kind) {
    setBusy(kind);
    try {
      await downloadSample(kind);
    } finally {
      setBusy(null);
    }
  }

  const base =
    "inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition disabled:opacity-60";
  const cls =
    variant === "primary"
      ? `${base} bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] hover:brightness-110`
      : variant === "inverse"
        ? `${base} bg-background text-foreground hover:brightness-105`
        : `${base} border bg-background/70 hover:bg-primary-soft`;

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={() => void go("docx")} disabled={busy !== null} className={cls}>
        {busy === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Download sample (Word)
      </button>
      <button
        type="button"
        onClick={() => void go("pdf")}
        disabled={busy !== null}
        className={`${base} border bg-background/70 hover:bg-primary-soft`}
      >
        {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType2 className="h-4 w-4" />}
        Download sample (PDF)
      </button>
    </div>
  );
}

/** Compact single-line variant for cards and footers. */
export function SampleExportLinks({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const go = async (kind: Kind) => {
    setBusy(kind);
    try {
      await downloadSample(kind);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {(["docx", "pdf"] as Kind[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => void go(k)}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-primary-soft disabled:opacity-60"
        >
          {busy === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Sample {k === "docx" ? "Word" : "PDF"}
        </button>
      ))}
    </div>
  );
}
