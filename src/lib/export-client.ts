import type { ExportInput } from "./export-types";

type Kind = "docx" | "pdf";

const MIME: Record<Kind, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

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
  a.download = filename.endsWith(`.${kind}`) ? filename : `${filename}.${kind}`;
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
