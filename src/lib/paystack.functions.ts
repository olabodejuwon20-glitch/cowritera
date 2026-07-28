import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VerifyInput = z.object({
  reference: z.string().min(4),
  paper_id: z.string().uuid(),
});

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VerifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = (await res.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string; reference?: string };
    };
    if (!res.ok || !body.status) throw new Error("Could not verify payment with Paystack.");
    const paidOk = body.data?.status === "success";

    await supabase.from("payments").insert({
      user_id: userId,
      paper_id: data.paper_id,
      paystack_reference: data.reference,
      amount_kobo: body.data?.amount ?? 0,
      currency: body.data?.currency ?? "NGN",
      status: paidOk ? "success" : (body.data?.status ?? "failed"),
    });

    if (paidOk) {
      const { error } = await supabase
        .from("papers")
        .update({ paid: true, status: "active" })
        .eq("id", data.paper_id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    }
    return { paid: paidOk };
  });
