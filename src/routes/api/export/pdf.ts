import { createFileRoute } from "@tanstack/react-router";
import { buildPdf } from "@/lib/paper-export";

export const Route = createFileRoute("/api/export/pdf")({
  server: {
    handlers: {
      GET: async () => {
        const bytes = await buildPdf();
        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": 'attachment; filename="GNS102-Term-Paper.pdf"',
          },
        });
      },
    },
  },
});
