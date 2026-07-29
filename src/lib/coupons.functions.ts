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

// User-facing redemption. Implemented server-side (no exposed RPC) so the
// coupon table stays behind admin/select-active RLS and privileged writes
// only happen after we verify the caller owns the paper.
export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().min(3).max(40), paper_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify paper ownership + unpaid state via user's own client (RLS).
    const { data: paper, error: paperErr } = await context.supabase
      .from("papers")
      .select("id, user_id, paid")
      .eq("id", data.paper_id)
      .maybeSingle();
    if (paperErr) throw new Error(paperErr.message);
    if (!paper || paper.user_id !== userId) throw new Error("Paper not found");
    if (paper.paid) {
      return { ok: true, already_paid: true } as const;
    }

    const { data: coupon, error: cErr } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .ilike("code", data.code.trim())
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!coupon) throw new Error("Invalid code");
    if (!coupon.active) throw new Error("Code is not active");
    if (coupon.expires_at && new Date(coupon.expires_at as string).getTime() < Date.now()) {
      throw new Error("Code has expired");
    }
    if (coupon.max_uses != null && (coupon.uses ?? 0) >= coupon.max_uses) {
      throw new Error("Code has reached its usage limit");
    }

    if (coupon.type === "full_unlock") {
      const { error: upErr } = await supabaseAdmin
        .from("papers")
        .update({ paid: true, status: "active" })
        .eq("id", data.paper_id)
        .eq("user_id", userId);
      if (upErr) throw new Error(upErr.message);
      await supabaseAdmin.from("coupons").update({ uses: (coupon.uses ?? 0) + 1 }).eq("id", coupon.id);
      await supabaseAdmin.from("coupon_redemptions").insert({
        coupon_id: coupon.id,
        user_id: userId,
        paper_id: data.paper_id,
        amount_discount_kobo: 350000,
      });
      return { ok: true, type: "full_unlock" as const, unlocked: true };
    }

    return {
      ok: true,
      type: "discount" as const,
      discount_percent: coupon.discount_percent,
      discount_amount_kobo: coupon.discount_amount_kobo,
    };
  });

export const adminListRedemptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reds, error } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id, coupon_id, user_id, paper_id, amount_discount_kobo, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = reds ?? [];
    if (rows.length === 0) return [];

    const couponIds = [...new Set(rows.map((r: any) => r.coupon_id).filter(Boolean))];
    const paperIds = [...new Set(rows.map((r: any) => r.paper_id).filter(Boolean))];
    const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];

    const [coupons, papers, profiles, authUsers] = await Promise.all([
      supabaseAdmin.from("coupons").select("id, code, type").in("id", couponIds),
      paperIds.length
        ? supabaseAdmin.from("papers").select("id, topic, course_code, paid, status").in("id", paperIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);

    const couponById = new Map((coupons.data ?? []).map((c: any) => [c.id, c]));
    const paperById = new Map((papers.data ?? []).map((p: any) => [p.id, p]));
    const profileById = new Map((profiles.data ?? []).map((p: any) => [p.id, p]));
    const emailById = new Map<string, string>();
    for (const u of authUsers?.data?.users ?? []) emailById.set(u.id, u.email ?? "");

    return rows.map((r: any) => {
      const c: any = couponById.get(r.coupon_id);
      const p: any = paperById.get(r.paper_id);
      return {
        id: r.id,
        code: c?.code ?? "—",
        type: (c?.type ?? "discount") as "full_unlock" | "discount",
        user_name: (profileById.get(r.user_id) as any)?.full_name || "Unnamed",
        user_email: emailById.get(r.user_id) ?? "",
        paper_id: r.paper_id,
        paper_topic: p?.topic || "—",
        course_code: p?.course_code ?? "",
        amount_discount_kobo: r.amount_discount_kobo ?? 0,
        created_at: r.created_at,
        status: p ? (p.paid ? "Unlocked" : "Applied") : "Unknown",
      };
    });
  });
