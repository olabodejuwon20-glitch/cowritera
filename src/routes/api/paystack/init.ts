import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/paystack/init")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
          return Response.json({ error: "Paystack not configured" }, { status: 500 });
        }
        let body: { email?: string; amount?: number; callback_url?: string } = {};
        try { body = await request.json(); } catch { /* noop */ }

        const email = (body.email ?? "").trim();
        if (!email || !email.includes("@")) {
          return Response.json({ error: "Valid email required" }, { status: 400 });
        }
        const amountKobo = Math.max(100, Math.round((body.amount ?? 3500) * 100));

        const origin = new URL(request.url).origin;
        const callback_url = body.callback_url ?? `${origin}/demo?paid=1`;

        const res = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount: amountKobo,
            currency: "NGN",
            callback_url,
            metadata: { product: "Co-Research AI Project Pass" },
          }),
        });
        const data = (await res.json()) as {
          status?: boolean;
          message?: string;
          data?: { authorization_url?: string; reference?: string };
        };
        if (!res.ok || !data.status || !data.data?.authorization_url) {
          return Response.json({ error: data.message ?? "Paystack init failed" }, { status: 502 });
        }
        return Response.json({
          authorization_url: data.data.authorization_url,
          reference: data.data.reference,
        });
      },
    },
  },
});
