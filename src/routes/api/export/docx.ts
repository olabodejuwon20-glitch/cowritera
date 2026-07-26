import { createFileRoute } from "@tanstack/react-router";
import { buildDocx } from "@/lib/paper-export";

export const Route = createFileRoute("/api/export/docx")({
  server: {
    handlers: {
      GET: async () => {
        const bytes = await buildDocx();
        return new Response(bytes as unknown as BodyInit, {
          headers: {
            "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "content-disposition": 'attachment; filename="GNS102-Term-Paper.docx"',
          },
        });
      },
    },
  },
});
