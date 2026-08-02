import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertAdmin,
  randomCode,
  randomToken,
  withSignedUrls,
  CodeInput,
  IdInput,
  TokenInput,
  CampaignInput,
  InviteInput,
  PayoutInput,
  AnnouncementInput,
  ResourceInput,
} from "./ambassadors.shared";
import { serviceDb, listUserEmails } from "./service-db";

/* ------------------------------- public ---------------------------------- */

export const trackReferralClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CodeInput.parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseUrl, supabasePublishableKey } = await import("@/integrations/supabase/env");
    const url = supabaseUrl();
    const key = supabasePublishableKey();
    if (!url || !key) return { ok: false as const };
    const anon = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input as any, { ...init, headers });
      } },
    });
    const { data: ok } = await anon.rpc("track_referral_click", { _code: data.code });
    return { ok: !!ok };
  });

/* ------------------------------ ambassador -------------------------------- */

export const attachReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CodeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("attach_referral", { _code: data.code });
    if (error) return { ok: false as const, reason: "insert_failed" };
    const out = (res ?? {}) as { ok?: boolean; reason?: string };
    return out.ok ? { ok: true as const } : { ok: false as const, reason: out.reason ?? "invalid_code" };
  });

export const acceptAmbassadorInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TokenInput.parse(d))
  .handler(async ({ data, context }) => {
    const email = String((context.claims as any)?.email ?? "").toLowerCase();
    const { data: res, error } = await context.supabase.rpc("accept_ambassador_invite", {
      _token: data.token,
      _email: email,
    });
    if (error) throw new Error(error.message);
    const out = (res ?? {}) as { ok?: boolean; referral_code?: string };
    return { ok: true as const, referral_code: out.referral_code };
  });

export const getAmbassadorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await serviceDb(context.supabase);


    const { data: amb } = await db
      .from("ambassadors")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!amb) return { ambassador: null };

    const [campaignRes, clicksRes, referralsRes, payoutsRes, annRes, resRes] = await Promise.all([
      amb.campaign_id
        ? db.from("campaigns").select("*").eq("id", amb.campaign_id).maybeSingle()
        : Promise.resolve({ data: null }),
      db
        .from("referral_clicks")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", amb.id),
      db
        .from("referrals")
        .select("id, status, commission_kobo, credited_at, created_at")
        .eq("ambassador_id", amb.id)
        .order("created_at", { ascending: false }),
      db
        .from("ambassador_payouts")
        .select("*")
        .eq("ambassador_id", amb.id)
        .order("paid_at", { ascending: false }),
      db
        .from("campaign_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("marketing_resources")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const referrals = ((referralsRes as any).data ?? []) as any[];
    const payouts = ((payoutsRes as any).data ?? []) as any[];
    const paidReferrals = referrals.filter((r) => r.status === "paid");
    const totalEarnedKobo = paidReferrals.reduce((s, r) => s + Number(r.commission_kobo ?? 0), 0);
    const totalPaidOutKobo = payouts
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount_kobo ?? 0), 0);

    const campaignId = amb.campaign_id;
    const resources = (await withSignedUrls(((resRes as any).data ?? []) as any[])).filter(
      (r: any) => !r.campaign_id || r.campaign_id === campaignId,
    );
    const announcements = (((annRes as any).data ?? []) as any[]).filter(
      (a) => !a.campaign_id || a.campaign_id === campaignId,
    );

    return {
      ambassador: amb,
      campaign: ((campaignRes as any).data ?? null) as any,
      clicks: (clicksRes as any).count ?? 0,
      registrations: referrals.length,
      paidReferrals: paidReferrals.length,
      totalEarnedKobo,
      totalPaidOutKobo,
      pendingKobo: Math.max(0, totalEarnedKobo - totalPaidOutKobo),
      referrals,
      payouts,
      announcements,
      resources,
    };
  });

/* --------------------------------- admin ---------------------------------- */

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
    return { ok: true, id: (row as any).id as string };
  });

export const adminInviteAmbassador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteInput.parse(d))
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
  .inputValidator((d: unknown) => IdInput.parse(d))
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
    const { data: rows, error } = await db
      .from("ambassadors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    if (list.length === 0) return [] as any[];

    const ids = list.map((a) => a.id);
    const [refs, payouts, profiles, users] = await Promise.all([
      db.from("referrals").select("ambassador_id, status, commission_kobo").in("ambassador_id", ids),
      db.from("ambassador_payouts").select("ambassador_id, amount_kobo, status").in("ambassador_id", ids),
      db.from("profiles").select("id, full_name").in("id", list.map((a) => a.user_id)),
      listUserEmails(),
    ]);
    const emailById = users;
    const nameById = new Map(((profiles.data ?? []) as any[]).map((p) => [p.id, p.full_name]));

    return list.map((a) => {
      const mine = ((refs.data ?? []) as any[]).filter((r) => r.ambassador_id === a.id);
      const earned = mine
        .filter((r) => r.status === "paid")
        .reduce((s, r) => s + Number(r.commission_kobo ?? 0), 0);
      const paidOut = ((payouts.data ?? []) as any[])
        .filter((p) => p.ambassador_id === a.id && p.status === "paid")
        .reduce((s, p) => s + Number(p.amount_kobo ?? 0), 0);
      return {
        ...a,
        name: nameById.get(a.user_id) || "Unnamed",
        email: emailById.get(a.user_id) ?? "",
        registrations: mine.length,
        paid_referrals: mine.filter((r) => r.status === "paid").length,
        earned_kobo: earned,
        paid_out_kobo: paidOut,
        pending_kobo: Math.max(0, earned - paidOut),
      };
    });
  });

export const adminRecordPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PayoutInput.parse(d))
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
  .inputValidator((d: unknown) => AnnouncementInput.parse(d))
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
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("campaign_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResourceInput.parse(d))
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
    return withSignedUrls((data ?? []) as any[]);
  });

export const adminDeleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("marketing_resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
