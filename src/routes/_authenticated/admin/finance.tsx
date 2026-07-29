import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListPayments } from "@/lib/admin.functions";
import { Loader2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Tip } from "./index";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  head: () => ({ meta: [{ title: "Finance — Admin" }, { name: "description", content: "Payments and revenue" }] }),
  component: FinancePage,
});

function formatNaira(kobo: number) {
  return "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

type Range = "today" | "week" | "month" | "all";

function inRange(d: string, r: Range) {
  const t = new Date(d).getTime();
  const now = Date.now();
  if (r === "today") return t >= new Date().setHours(0, 0, 0, 0);
  if (r === "week") return t >= now - 7 * 864e5;
  if (r === "month") return t >= now - 30 * 864e5;
  return true;
}

function FinancePage() {
  const fn = useServerFn(adminListPayments);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-payments"], queryFn: () => fn() });
  const [range, setRange] = useState<Range>("month");
  const [status, setStatus] = useState<"all" | "success" | "pending" | "failed">("all");

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (p: any) => inRange(p.created_at, range) && (status === "all" || p.status === status),
      ),
    [data, range, status],
  );

  const totals = useMemo(() => {
    const succ = rows.filter((r: any) => r.status === "success");
    return {
      revenue: succ.reduce((s: number, r: any) => s + (r.amount_kobo ?? 0), 0),
      successCount: succ.length,
      pendingCount: rows.filter((r: any) => r.status === "pending").length,
      failedCount: rows.filter((r: any) => r.status === "failed").length,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">All Paystack transactions on the platform.</p>
      </header>
      <Tip>Use this page to monitor incoming payments and confirm successful Project Pass purchases.</Tip>

      <div className="flex flex-wrap gap-2">
        {(["today", "week", "month", "all"] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-xl px-3 py-1.5 text-xs border ${range === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary-soft"}`}>
            {r[0].toUpperCase() + r.slice(1)}
          </button>
        ))}
        <span className="mx-2 h-6 w-px bg-border" />
        {(["all", "success", "pending", "failed"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-xl px-3 py-1.5 text-xs border ${status === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary-soft"}`}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={formatNaira(totals.revenue)} />
        <Stat label="Successful" value={String(totals.successCount)} />
        <Stat label="Pending" value={String(totals.pendingCount)} />
        <Stat label="Failed" value={String(totals.failedCount)} />
      </div>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}

      {data && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">No payments in this window.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Reference</th>
                <th className="text-left px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-mono text-xs">{p.paystack_reference ?? "—"}</td>
                  <td className="px-4 py-2">{formatNaira(p.amount_kobo)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${p.status === "success" ? "bg-primary-soft text-primary" : p.status === "pending" ? "bg-muted" : "bg-destructive/10 text-destructive"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
