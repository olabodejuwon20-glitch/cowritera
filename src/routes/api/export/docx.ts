import { createFileRoute } from "@tanstack/react-router";
import { buildDocx } from "@/lib/paper-export";
import { parseExportRequest } from "@/lib/export-validation";
import type { PaperDraft } from "@/lib/paper-draft";

async function respond(draft?: Partial<PaperDraft>) {
  const bytes = await buildDocx(draft);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": 'attachment; filename="GNS102-Term-Paper.docx"',
    },
  });
}

export const Route = createFileRoute("/api/export/docx")({
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
