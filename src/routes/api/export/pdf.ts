import { createFileRoute } from "@tanstack/react-router";
import { buildPdf } from "@/lib/paper-export";
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
        let draft: Partial<PaperDraft> | undefined;
        try { draft = (await request.json()) as Partial<PaperDraft>; } catch { /* noop */ }
        return respond(draft);
      },
    },
  },
});
