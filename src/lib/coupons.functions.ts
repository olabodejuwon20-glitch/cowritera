import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

const CouponInput = z.object({
  code: z.string().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes only"),
  type: z.enum(["full_unlock", "discount"]),
  discount_percent: z.number().int().min(1).max(100).nullable().optional(),
  discount_amount_kobo: z.number().int().min(0).nullable().optional(),
  max_uses: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CouponInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      code: data.code.toUpperCase(),
      type: data.type,
      discount_percent: data.type === "discount" ? data.discount_percent ?? null : null,
      discount_amount_kobo: data.type === "discount" ? data.discount_amount_kobo ?? null : null,
      max_uses: data.max_uses ?? null,
      active: data.active ?? true,
      notes: data.notes ?? null,
      expires_at: data.expires_at ?? null,
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("coupons")
      .insert(payload as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const UpdateInput = CouponInput.partial().extend({ id: z.string().uuid() });

export const adminUpdateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data as any;
    if (rest.code) rest.code = String(rest.code).toUpperCase();
    const { error } = await context.supabase.from("coupons").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// User-facing redemption
export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().min(3).max(40), paper_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("redeem_coupon", {
      _code: data.code,
      _paper_id: data.paper_id,
    });
    if (error) throw new Error(error.message);
    return res as {
      ok: boolean;
      type?: "full_unlock" | "discount";
      unlocked?: boolean;
      already_paid?: boolean;
      discount_percent?: number | null;
      discount_amount_kobo?: number | null;
    };
  });
