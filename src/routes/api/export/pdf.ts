import { createFileRoute } from "@tanstack/react-router";
import { buildPdf } from "@/lib/paper-export";
import { parseExportRequest } from "@/lib/export-validation";
import type { PaperDraft } from "@/lib/paper-draft";

async function respond(draft?: Partial<PaperDraft>) {
  const bytes = await buildPdf(draft);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="GNS102-Term-Paper.pdf"',
    },
  });
}

export const Route = createFileRoute("/api/export/pdf")({
  server: {
    handlers: {
      GET: async () => respond(),
      POST: async ({ request }) => {
        const result = await parseExportRequest(request);
        if (!result.ok) {
          return new Response(result.message, { status: result.status });
        }
        return respond(result.draft);
      },
    },
  },
});
