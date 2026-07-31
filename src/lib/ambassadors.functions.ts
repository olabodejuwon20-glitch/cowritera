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

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------- public ---------------------------------- */

export const trackReferralClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(3).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: amb } = await supabaseAdmin
      .from("ambassadors")
      .select("id, status")
      .eq("referral_code", code)
      .maybeSingle();
    if (!amb || amb.status !== "active") return { ok: false as const };
    await supabaseAdmin.from("referral_clicks").insert({ ambassador_id: amb.id, referral_code: code });
    return { ok: true as const };
  });

/* ------------------------------ ambassador -------------------------------- */

export const attachReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(3).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();

    const { data: existing } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: false as const, reason: "already_referred" };

    const { data: amb } = await supabaseAdmin
      .from("ambassadors")
      .select("id, campaign_id, user_id, status")
      .eq("referral_code", code)
      .maybeSingle();
    if (!amb || amb.status !== "active") return { ok: false as const, reason: "invalid_code" };
    if (amb.user_id === context.userId) return { ok: false as const, reason: "self_referral" };

    const { error } = await supabaseAdmin.from("referrals").insert({
      ambassador_id: amb.id,
      campaign_id: amb.campaign_id,
      referred_user_id: context.userId,
      status: "registered",
    });
    if (error) return { ok: false as const, reason: "insert_failed" };
    return { ok: true as const };
  });

export const acceptAmbassadorInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = String((context.claims as any)?.email ?? "").toLowerCase();

    const { data: invite } = await supabaseAdmin
      .from("ambassador_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("This invitation link is not valid.");
    if (invite.status === "revoked") throw new Error("This invitation has been revoked.");
    if (new Date(invite.expires_at as string).getTime() < Date.now()) {
      throw new Error("This invitation has expired.");
    }
    if (String(invite.email).toLowerCase() !== email) {
      throw new Error(`This invitation was sent to ${invite.email}. Sign in with that email to accept it.`);
    }

    const { data: already } = await supabaseAdmin
      .from("ambassadors")
      .select("id, referral_code")
      .eq("user_id", context.userId)
      .maybeSingle();

    let referral_code = already?.referral_code as string | undefined;

    if (!already) {
      for (let attempt = 0; attempt < 6 && !referral_code; attempt++) {
        const candidate = randomCode(6);
        const { error } = await supabaseAdmin.from("ambassadors").insert({
          user_id: context.userId,
          campaign_id: invite.campaign_id,
          referral_code: candidate,
        });
        if (!error) referral_code = candidate;
        else if (!String(error.message).includes("duplicate")) throw new Error(error.message);
      }
      if (!referral_code) throw new Error("Could not generate a referral code. Please try again.");
    }

    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "ambassador" as any })
      .select("id");

    if (invite.status !== "accepted") {
      await supabaseAdmin
        .from("ambassador_invites")
        .update({ status: "accepted", accepted_by: context.userId, accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
    }

    return { ok: true as const, referral_code };
  });

export const getAmbassadorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: amb } = await supabaseAdmin
      .from("ambassadors")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!amb) return { ambassador: null as null };

    const [campaignRes, clicksRes, referralsRes, payoutsRes, annRes, resRes] = await Promise.all([
      amb.campaign_id
        ? supabaseAdmin.from("campaigns").select("*").eq("id", amb.campaign_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("referral_clicks")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", amb.id),
      supabaseAdmin
        .from("referrals")
        .select("id, status, commission_kobo, credited_at, created_at")
        .eq("ambassador_id", amb.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("ambassador_payouts")
        .select("*")
        .eq("ambassador_id", amb.id)
        .order("paid_at", { ascending: false }),
      supabaseAdmin
        .from("campaign_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("marketing_resources")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const referrals = (referralsRes as any).data ?? [];
    const payouts = (payoutsRes as any).data ?? [];
    const paidReferrals = referrals.filter((r: any) => r.status === "paid");
    const totalEarnedKobo = paidReferrals.reduce((s: number, r: any) => s + Number(r.commission_kobo ?? 0), 0);
    const totalPaidOutKobo = payouts
      .filter((p: any) => p.status === "paid")
      .reduce((s: number, p: any) => s + Number(p.amount_kobo ?? 0), 0);

    const resources = await withSignedUrls((resRes as any).data ?? []);

    const campaignId = amb.campaign_id;
    const announcements = ((annRes as any).data ?? []).filter(
      (a: any) => !a.campaign_id || a.campaign_id === campaignId,
    );

    return {
      ambassador: amb,
      campaign: (campaignRes as any).data ?? null,
      clicks: (clicksRes as any).count ?? 0,
      registrations: referrals.length,
      paidReferrals: paidReferrals.length,
      totalEarnedKobo,
      totalPaidOutKobo,
      pendingKobo: Math.max(0, totalEarnedKobo - totalPaidOutKobo),
      referrals,
      payouts,
      announcements,
      resources: resources.filter((r: any) => !r.campaign_id || r.campaign_id === campaignId),
    };
  });

async function withSignedUrls(rows: any[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(
    rows.map(async (r) => {
      if (!r.storage_path) return r;
      const { data } = await supabaseAdmin.storage
        .from("marketing-assets")
        .createSignedUrl(r.storage_path, 60 * 60 * 6);
      return { ...r, signed_url: data?.signedUrl ?? null };
    }),
  );
}

/* --------------------------------- admin ---------------------------------- */

const CampaignInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).nullable().optional(),
  starts_at: z.string().min(4),
  ends_at: z.string().min(4).nullable().optional(),
  commission_kobo: z.number().int().min(0).max(100_000_000),
  status: z.enum(["draft", "active", "paused", "ended"]),
  eligibility: z.string().max(2000).nullable().optional(),
});

export const adminListCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CampaignInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = {
      name: data.name,
      description: data.description ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at || null,
      commission_kobo: data.commission_kobo,
      status: data.status,
      eligibility: data.eligibility ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("campaigns").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase
      .from("campaigns")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminInviteAmbassador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        campaign_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const token = randomToken();
    const { error } = await context.supabase.from("ambassador_invites").insert({
      email: data.email.toLowerCase(),
      campaign_id: data.campaign_id ?? null,
      token,
      invited_by: context.userId,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true, token };
  });

export const adminListInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("ambassador_invites")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminRevokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("ambassador_invites")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAmbassadors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("ambassadors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    if (list.length === 0) return [];

    const ids = list.map((a: any) => a.id);
    const [refs, payouts, profiles, users] = await Promise.all([
      supabaseAdmin.from("referrals").select("ambassador_id, status, commission_kobo").in("ambassador_id", ids),
      supabaseAdmin.from("ambassador_payouts").select("ambassador_id, amount_kobo, status").in("ambassador_id", ids),
      supabaseAdmin.from("profiles").select("id, full_name").in("id", list.map((a: any) => a.user_id)),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);
    const emailById = new Map<string, string>();
    for (const u of users?.data?.users ?? []) emailById.set(u.id, u.email ?? "");
    const nameById = new Map((profiles.data ?? []).map((p: any) => [p.id, p.full_name]));

    return list.map((a: any) => {
      const mine = (refs.data ?? []).filter((r: any) => r.ambassador_id === a.id);
      const earned = mine
        .filter((r: any) => r.status === "paid")
        .reduce((s: number, r: any) => s + Number(r.commission_kobo ?? 0), 0);
      const paidOut = (payouts.data ?? [])
        .filter((p: any) => p.ambassador_id === a.id && p.status === "paid")
        .reduce((s: number, p: any) => s + Number(p.amount_kobo ?? 0), 0);
      return {
        ...a,
        name: nameById.get(a.user_id) || "Unnamed",
        email: emailById.get(a.user_id) ?? "",
        registrations: mine.length,
        paid_referrals: mine.filter((r: any) => r.status === "paid").length,
        earned_kobo: earned,
        paid_out_kobo: paidOut,
        pending_kobo: Math.max(0, earned - paidOut),
      };
    });
  });

export const adminRecordPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ambassador_id: z.string().uuid(),
        amount_kobo: z.number().int().min(100).max(100_000_000),
        note: z.string().max(300).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("ambassador_payouts").insert({
      ambassador_id: data.ambassador_id,
      amount_kobo: data.amount_kobo,
      note: data.note ?? null,
      status: "paid",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaign_id: z.string().uuid().nullable().optional(),
        title: z.string().min(2).max(160),
        body: z.string().min(2).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("campaign_announcements").insert({
      campaign_id: data.campaign_id ?? null,
      title: data.title,
      body: data.body,
      created_by: context.userId,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("campaign_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("campaign_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaign_id: z.string().uuid().nullable().optional(),
        title: z.string().min(2).max(160),
        kind: z.enum(["flyer", "whatsapp", "video", "asset", "link"]),
        body: z.string().max(4000).nullable().optional(),
        url: z.string().url().max(1000).nullable().optional(),
        storage_path: z.string().max(400).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("marketing_resources").insert({
      campaign_id: data.campaign_id ?? null,
      title: data.title,
      kind: data.kind,
      body: data.body ?? null,
      url: data.url ?? null,
      storage_path: data.storage_path ?? null,
      created_by: context.userId,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("marketing_resources")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return withSignedUrls(data ?? []);
  });

export const adminDeleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("marketing_resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
