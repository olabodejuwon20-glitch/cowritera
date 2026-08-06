import type { ExportInput } from "./export-types";

type Kind = "docx" | "pdf";

const MIME: Record<Kind, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

function sanitizeFileName(name: string | undefined | null, kind: Kind, input?: ExportInput) {
  const raw = String(name ?? "").trim();
  if (!raw) {
    // Prefer a sample vs generic name depending on whether this was a user draft
    const base = input && Object.keys(input).length > 0 ? "Co-Research-AI-Term-Paper" : "Co-Research-AI-Sample-Term-Paper";
    return `${base}.${kind}`;
  }
  // Remove control characters and common filesystem-illegal characters
  let cleaned = raw.replace(/[\u0000-\u001f<>:\\"/\\\\|?*]+/g, "");
  // Collapse multiple whitespace to a single space and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  // Ensure it ends with the requested extension exactly once
  if (!cleaned.toLowerCase().endsWith(`.${kind}`)) cleaned = `${cleaned}.${kind}`;
  return cleaned;
}

/**
 * Builds the document in the browser and saves it with the correct extension
 * and MIME type. Generating client-side avoids any chance of a server/CDN
 * error page being downloaded as an ".html" file.
 */
export async function downloadPaper(kind: Kind, filename: string, input?: ExportInput) {
  const { buildDocx, buildPdf } = await import("./paper-export");
  const bytes = kind === "pdf" ? await buildPdf(input) : await buildDocx(input);
  const blob = new Blob([bytes as unknown as BlobPart], { type: MIME[kind] });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const outName = sanitizeFileName(filename, kind, input);
  a.download = outName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Determine whether this was the sample/demo export (no user payload)
  const isSample = !input || Object.keys(input).length === 0;

  // Revoke the object URL shortly after
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  // Emit a global event so UI code can react (show a finalize popup, share links, etc.)
  try {
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      const ev = new CustomEvent("cowritera:exportFinished", {
        detail: { kind, filename: a.download, isSample },
      });
      window.dispatchEvent(ev);
    }
  } catch (e) {
    // Non-fatal: don't block the download flow for event dispatch errors
    // eslint-disable-next-line no-console
    console.warn("failed to emit exportFinished event", e);
  }
}
