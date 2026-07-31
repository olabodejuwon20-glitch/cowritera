import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { WorkspaceShell, Card, PageTitle, CardSkeleton } from "@/components/workspace-shell";
import { getAmbassadorDashboard } from "@/lib/ambassadors.functions";
import { nairaFromKobo } from "@/lib/ambassadors.shared";
import {
  Megaphone, Copy, Share2, MousePointerClick, UserPlus, BadgeCheck, Wallet,
  Clock, FileText, MessageCircle, Video, Link2, Download, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/ambassador")({
  head: () => ({
    meta: [
      { title: "Ambassador workspace — Co-Research AI" },
      { name: "description", content: "Track your referrals, commissions, payouts and campaign resources as a Co-Research AI Campus Ambassador." },
      { property: "og:title", content: "Ambassador workspace — Co-Research AI" },
      { property: "og:description", content: "Your Campus Ambassador dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AmbassadorPage,
});

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { ended: true, d: 0, h: 0, m: 0, s: 0 };
  return {
    ended: false,
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff / 3_600_000) % 24),
    m: Math.floor((diff / 60_000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

function AmbassadorPage() {
  const fn = useServerFn(getAmbassadorDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["ambassador-dashboard"], queryFn: () => fn() });
  const amb: any = data?.ambassador ?? null;
  const campaign: any = (data as any)?.campaign ?? null;
  const countdown = useCountdown(campaign?.ends_at);

  const referralUrl = useMemo(() => {
    if (!amb) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/r/${amb.referral_code}`;
  }, [amb]);

  async function copy(text: string, label = "Copied to clipboard") {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Could not copy — long-press to copy manually.");
    }
  }

  async function share() {
    const text = `Write your term paper 10x faster with Co-Research AI. Use my link: ${referralUrl}`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Co-Research AI", text, url: referralUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copy(text, "Share message copied");
  }

  if (isLoading) {
    return (
      <WorkspaceShell title="Ambassador" status="Loading" wide>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      </WorkspaceShell>
    );
  }

  if (error) {
    return (
      <WorkspaceShell title="Ambassador" wide>
        <Card className="p-6 text-sm text-destructive">{(error as Error).message}</Card>
      </WorkspaceShell>
    );
  }

  if (!amb) {
    return (
      <WorkspaceShell title="Ambassador" status="Invitation only" wide>
        <Card className="p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Megaphone className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">The Campus Ambassador programme is invitation-only</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Ambassadors are hand-picked and invited by the Co-Research AI team. If you received an invitation email,
            open the link inside it while signed in with that same email address.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-xl border px-4 py-2 text-sm font-medium hover:bg-surface">
            Back to my projects
          </Link>
        </Card>
      </WorkspaceShell>
    );
  }

  const d: any = data;

  return (
    <WorkspaceShell
      title="Ambassador"
      status={campaign ? campaign.name : "Campus programme"}
      breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Ambassador" }]}
      wide
    >
      <PageTitle
        eyebrow="Partner programme"
        title="Campus Ambassador workspace"
        description="Share your link, grow your campus, and earn on every verified Project Pass."
      />

      {/* Campaign + countdown */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{campaign?.name ?? "No active campaign yet"}</h2>
              {campaign && (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium capitalize text-primary">
                  {campaign.status}
                </span>
              )}
            </div>
            {campaign?.description && <p className="mt-2 text-sm text-muted-foreground">{campaign.description}</p>}
            {campaign?.eligibility && (
              <p className="mt-2 text-xs text-muted-foreground"><strong>Eligibility:</strong> {campaign.eligibility}</p>
            )}
            {campaign && (
              <p className="mt-2 text-sm">
                <strong>{nairaFromKobo(campaign.commission_kobo)}</strong>{" "}
                <span className="text-muted-foreground">per successful paid referral</span>
              </p>
            )}
          </div>
          {countdown && (
            <div className="rounded-2xl border bg-surface px-4 py-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {countdown.ended ? "Campaign ended" : "Campaign ends in"}
              </p>
              {!countdown.ended && (
                <div className="mt-1 flex items-end gap-2 font-semibold tabular-nums">
                  <TimeCell v={countdown.d} l="d" /><TimeCell v={countdown.h} l="h" />
                  <TimeCell v={countdown.m} l="m" /><TimeCell v={countdown.s} l="s" />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Referral link */}
      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Your referral link</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-surface px-3 py-2 text-sm">{referralUrl}</code>
          <button onClick={() => copy(referralUrl, "Referral link copied")} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-surface">
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button onClick={share} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
        <button
          onClick={() => copy(amb.referral_code, "Referral code copied")}
          className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Referral code: <strong className="text-foreground">{amb.referral_code}</strong>
        </button>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <Stat icon={MousePointerClick} label="Link clicks" value={d.clicks} />
        <Stat icon={UserPlus} label="Registrations" value={d.registrations} />
        <Stat icon={BadgeCheck} label="Paid referrals" value={d.paidReferrals} />
        <Stat icon={Wallet} label="Total earnings" value={nairaFromKobo(d.totalEarnedKobo)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending commission</p>
          <p className="mt-1 text-2xl font-semibold">{nairaFromKobo(d.pendingKobo)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Credited only after a referred student completes a verified payment.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid out to you</p>
          <p className="mt-1 text-2xl font-semibold">{nairaFromKobo(d.totalPaidOutKobo)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{d.payouts.length} payout(s) recorded.</p>
        </Card>
      </div>

      {/* Marketing resources */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Marketing resources</h2>
        {d.resources.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No resources yet — your campaign manager will drop flyers, WhatsApp scripts and videos here.
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.resources.map((r: any) => (
              <li key={r.id}>
                <Card className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
                      <ResourceIcon kind={r.kind} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.kind}</p>
                    </div>
                  </div>
                  {r.body && (
                    <p className="whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm text-muted-foreground">{r.body}</p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {r.body && (
                      <button onClick={() => copy(String(r.body).replace("{{link}}", referralUrl), "Message copied")} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs hover:bg-surface">
                        <Copy className="h-3.5 w-3.5" /> Copy message
                      </button>
                    )}
                    {(r.signed_url || r.url) && (
                      <a href={r.signed_url || r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs hover:bg-surface">
                        <Download className="h-3.5 w-3.5" /> Open
                      </a>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Announcements */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Announcements</h2>
        {d.announcements.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No announcements yet.</Card>
        ) : (
          <ul className="space-y-3">
            {d.announcements.map((a: any) => (
              <li key={a.id}>
                <Card className="p-4">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payout history */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payout history</h2>
        {d.payouts.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No payouts yet. Earnings are settled by the team.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-xs text-muted-foreground">
                <tr><Th>Date</Th><Th>Amount</Th><Th>Status</Th><Th>Note</Th></tr>
              </thead>
              <tbody>
                {d.payouts.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <Td>{new Date(p.paid_at).toLocaleDateString()}</Td>
                    <Td>{nairaFromKobo(p.amount_kobo)}</Td>
                    <Td className="capitalize">{p.status}</Td>
                    <Td>{p.note ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </WorkspaceShell>
  );
}

function TimeCell({ v, l }: { v: number; l: string }) {
  return (
    <span className="text-lg">
      {String(v).padStart(2, "0")}
      <span className="ml-0.5 text-[11px] text-muted-foreground">{l}</span>
    </span>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-4">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function ResourceIcon({ kind }: { kind: string }) {
  if (kind === "whatsapp") return <MessageCircle className="h-4 w-4" />;
  if (kind === "video") return <Video className="h-4 w-4" />;
  if (kind === "link") return <Link2 className="h-4 w-4" />;
  if (kind === "asset") return <Clock className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-left font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
}
