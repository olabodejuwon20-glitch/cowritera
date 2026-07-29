import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview } from "@/lib/admin.functions";
import { Users, FolderKanban, CheckCircle2, Wallet, Ticket, Info, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — Co-Research AI" }, { name: "description", content: "Admin dashboard" }] }),
  component: Overview,
});

function formatNaira(kobo: number) {
  return "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

function Overview() {
  const fn = useServerFn(adminOverview);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your command center. Check this daily to monitor growth, revenue and platform activity.
        </p>
      </header>

      <Tip>
        This dashboard aggregates live data across users, projects and payments. Numbers refresh each time you open the page.
      </Tip>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total users" value={data.totals.users.toLocaleString()} icon={Users} />
            <Stat label="Total projects" value={data.totals.papers.toLocaleString()} icon={FolderKanban} />
            <Stat label="Active projects" value={data.totals.active.toLocaleString()} icon={CheckCircle2} />
            <Stat label="Total revenue" value={formatNaira(data.totals.revenueKobo)} icon={Wallet} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="New users — last 7 days">
              <MiniBars data={data.series.growthDays.map((d) => ({ label: d.date.slice(5), value: d.count }))} />
            </Card>
            <Card title="Revenue — last 14 days (₦)">
              <MiniBars data={data.series.revenueDays.map((d) => ({ label: d.date.slice(5), value: Math.round(d.kobo / 100) }))} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Recent registrations">
              <ul className="text-sm divide-y">
                {data.recent.users.length === 0 && <Empty label="No users yet" />}
                {data.recent.users.map((u: any) => (
                  <li key={u.id} className="py-2 flex justify-between gap-3">
                    <span className="truncate">{u.full_name || "Unnamed"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Recent payments">
              <ul className="text-sm divide-y">
                {data.recent.payments.length === 0 && <Empty label="No payments yet" />}
                {data.recent.payments.map((p: any) => (
                  <li key={p.id} className="py-2 flex justify-between gap-3">
                    <span className="truncate">{formatNaira(p.amount_kobo)} <span className="text-xs text-muted-foreground">· {p.status}</span></span>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Recent projects">
              <ul className="text-sm divide-y">
                {data.recent.papers.length === 0 && <Empty label="No projects yet" />}
                {data.recent.papers.map((p: any) => (
                  <li key={p.id} className="py-2 flex justify-between gap-3">
                    <span className="truncate">{p.topic || "Untitled"}</span>
                    <span className="text-xs text-muted-foreground">{p.paid ? "Paid" : "Draft"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Quick actions">
            <div className="flex flex-wrap gap-2">
              <QuickLink to="/admin/users" label="View users" />
              <QuickLink to="/admin/projects" label="View projects" />
              <QuickLink to="/admin/finance" label="View payments" />
              <QuickLink to="/admin/coupons" label="Manage coupons" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      {children}
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to as any} className="rounded-xl border px-3 py-2 text-sm hover:bg-primary-soft">
      {label}
    </Link>
  );
}

function Empty({ label }: { label: string }) {
  return <li className="py-6 text-center text-xs text-muted-foreground">{label}</li>;
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft/50 px-3 py-2 text-sm">
      <Info className="h-4 w-4 mt-0.5 text-primary" />
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

function MiniBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-t bg-primary/70" style={{ height: `${(d.value / max) * 100}%`, minHeight: 2 }} title={`${d.label}: ${d.value}`} />
          <div className="text-[10px] text-muted-foreground truncate w-full text-center">{d.label}</div>
        </div>
      ))}
    </div>
  );
}
