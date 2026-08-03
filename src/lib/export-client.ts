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
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
