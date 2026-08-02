import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Server-authoritative price for the Project Pass. Never trust client input.
export const PROJECT_PASS_KOBO = 350_000; // ₦3,500

async function computeExpectedAmountKobo(
  db: any,
  code: string | null | undefined,
): Promise<{ amount_kobo: number; coupon_id: string | null }> {
  const base = PROJECT_PASS_KOBO;
  if (!code || !code.trim()) return { amount_kobo: base, coupon_id: null };

  // Coupon details are resolved by a security-definer database routine, so no
  // coupon rows are exposed to clients and no privileged server key is needed.
  const { data: quote, error } = await db.rpc("coupon_quote", { _code: code.trim() });
  if (error) throw new Error(error.message);
  const c = (quote ?? {}) as {
    valid?: boolean;
    id?: string;
    type?: string;
    discount_percent?: number | null;
    discount_amount_kobo?: number | null;
  };
  if (!c.valid) return { amount_kobo: base, coupon_id: null };
  if (c.type === "full_unlock") {
    // Full-unlock codes should be redeemed via redeemCoupon, not through checkout.
    return { amount_kobo: base, coupon_id: c.id ?? null };
  }
  let amount = base;
  if (c.discount_percent) {
    amount = Math.round(amount * (1 - Number(c.discount_percent) / 100));
  } else if (c.discount_amount_kobo) {
    amount = amount - Number(c.discount_amount_kobo);
  }
  amount = Math.max(10_000, amount); // never below NGN 100
  return { amount_kobo: amount, coupon_id: c.id ?? null };
}

const InitInput = z.object({
  paper_id: z.string().uuid(),
  callback_url: z.string().url().optional(),
  coupon_code: z.string().min(1).max(40).optional().nullable(),
});

export const initPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const email = (claims as any)?.email;
    if (!email || typeof email !== "string") throw new Error("Account email required");

    // Verify paper ownership and unpaid state
    const { data: paper, error: paperErr } = await supabase
      .from("papers")
      .select("id, user_id, paid")
      .eq("id", data.paper_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (paperErr) throw new Error(paperErr.message);
    if (!paper) throw new Error("Paper not found");
    if (paper.paid) return { already_paid: true as const };

    const { amount_kobo } = await computeExpectedAmountKobo(supabase, data.coupon_code ?? null);

    const callback_url = data.callback_url ?? "";

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount_kobo,
        currency: "NGN",
        callback_url: callback_url || undefined,
        metadata: { product: "Co-Research AI Project Pass", paper_id: data.paper_id, user_id: userId },
      }),
    });
    const body = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };
    if (!res.ok || !body.status || !body.data?.authorization_url || !body.data?.reference) {
      throw new Error(body.message ?? "Paystack init failed");
    }

    // Record pending payment with server-computed expected amount so verify can match it.
    await supabase.from("payments").insert({
      user_id: userId,
      paper_id: data.paper_id,
      paystack_reference: body.data.reference,
      amount_kobo,
      currency: "NGN",
      status: "pending",
    });

    return {
      authorization_url: body.data.authorization_url,
      reference: body.data.reference,
      amount_kobo,
    };
  });

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

    // Look up the pending payment we created at init to know the expected amount.
    const { data: pending } = await supabase
      .from("payments")
      .select("amount_kobo, status")
      .eq("paystack_reference", data.reference)
      .eq("user_id", userId)
      .eq("paper_id", data.paper_id)
      .maybeSingle();
    const expectedKobo = pending?.amount_kobo ?? PROJECT_PASS_KOBO;

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const body = (await res.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string; reference?: string };
    };
    if (!res.ok || !body.status) throw new Error("Could not verify payment with Paystack.");

    const paidStatus = body.data?.status;
    const paidAmount = Number(body.data?.amount ?? 0);
    const paidCurrency = body.data?.currency ?? "NGN";
    const amountOk = paidAmount >= expectedKobo && paidCurrency === "NGN";
    const paidOk = paidStatus === "success" && amountOk;

    await supabase.from("payments").insert({
      user_id: userId,
      paper_id: data.paper_id,
      paystack_reference: data.reference,
      amount_kobo: paidAmount,
      currency: paidCurrency,
      status: paidOk ? "success" : paidStatus === "success" ? "amount_mismatch" : (paidStatus ?? "failed"),
    });

    if (paidOk) {
      const { error } = await supabase
        .from("papers")
        .update({ paid: true, status: "active" })
        .eq("id", data.paper_id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);

      // Credit an ambassador commission only after a verified payment.
      // Credit the referring ambassador (idempotent, verified inside the database).
      await supabase.rpc("credit_referral_for_user", { _user_id: userId });
    }
    return { paid: paidOk };
  });
