import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { admin: !!data };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();

    const [usersC, papersC, activeC, paidC, successPayments, recentUsers, recentPayments, recentPapers, growth7, revenue30] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("papers").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("papers").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("papers").select("*", { count: "exact", head: true }).eq("paid", true),
        supabaseAdmin.from("payments").select("amount_kobo").eq("status", "success"),
        supabaseAdmin.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(6),
        supabaseAdmin.from("payments").select("id, user_id, amount_kobo, status, created_at, paystack_reference").order("created_at", { ascending: false }).limit(6),
        supabaseAdmin.from("papers").select("id, user_id, topic, course_code, paid, status, created_at").order("created_at", { ascending: false }).limit(6),
        supabaseAdmin.from("profiles").select("created_at").gte("created_at", since7),
        supabaseAdmin.from("payments").select("amount_kobo, created_at, status").gte("created_at", since30).eq("status", "success"),
      ]);

    const totalRevenueKobo = (successPayments.data ?? []).reduce((s: number, r: any) => s + (r.amount_kobo ?? 0), 0);

    // growth series (last 7 days signup counts)
    const growthDays: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const key = d.toISOString().slice(0, 10);
      const count = (growth7.data ?? []).filter((r: any) => (r.created_at as string).slice(0, 10) === key).length;
      growthDays.push({ date: key, count });
    }
    // revenue series (last 14 days)
    const revenueDays: { date: string; kobo: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const key = d.toISOString().slice(0, 10);
      const kobo = (revenue30.data ?? [])
        .filter((r: any) => (r.created_at as string).slice(0, 10) === key)
        .reduce((s: number, r: any) => s + (r.amount_kobo ?? 0), 0);
      revenueDays.push({ date: key, kobo });
    }

    return {
      totals: {
        users: usersC.count ?? 0,
        papers: papersC.count ?? 0,
        active: activeC.count ?? 0,
        paid: paidC.count ?? 0,
        revenueKobo: totalRevenueKobo,
      },
      recent: {
        users: recentUsers.data ?? [],
        payments: recentPayments.data ?? [],
        papers: recentPapers.data ?? [],
      },
      series: { growthDays, revenueDays },
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: papers }, { data: authUsers }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, university, department, created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("papers").select("user_id, paid, status"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    ]);
    const emailById = new Map<string, string>();
    for (const u of authUsers?.users ?? []) emailById.set(u.id, u.email ?? "");
    return (profiles ?? []).map((p: any) => {
      const own = (papers ?? []).filter((r: any) => r.user_id === p.id);
      return {
        ...p,
        email: emailById.get(p.id) ?? "",
        papers: own.length,
        active_paper: own.some((r: any) => r.status === "active" && r.paid),
      };
    });
  });

export const adminListPapers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("papers")
      .select("id, user_id, topic, course_code, paid, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, paper_id, amount_kobo, currency, status, paystack_reference, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
