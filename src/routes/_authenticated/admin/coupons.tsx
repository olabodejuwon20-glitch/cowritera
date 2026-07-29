import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminCreateCoupon, adminDeleteCoupon, adminListCoupons, adminListRedemptions, adminUpdateCoupon } from "@/lib/coupons.functions";
import { useState } from "react";
import { Loader2, Ticket, Plus, Trash2, Pencil, X, History } from "lucide-react";
import { Tip } from "./index";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "Coupons — Admin" }, { name: "description", content: "Create and manage coupon codes" }] }),
  component: CouponsPage,
});

type Coupon = {
  id: string;
  code: string;
  type: "full_unlock" | "discount";
  discount_percent: number | null;
  discount_amount_kobo: number | null;
  max_uses: number | null;
  uses: number;
  active: boolean;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
};

function CouponsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCoupons);
  const create = useServerFn(adminCreateCoupon);
  const update = useServerFn(adminUpdateCoupon);
  const del = useServerFn(adminDeleteCoupon);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => list() });
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);

  const createM = useMutation({
    mutationFn: (v: any) => create({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setCreating(false); },
  });
  const updateM = useMutation({
    mutationFn: (v: any) => update({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setEditing(null); },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Coupons</h1>
          <p className="text-sm text-muted-foreground mt-1">Create codes to unlock a Project Pass for free or at a discount.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110">
          <Plus className="h-4 w-4" /> New coupon
        </button>
      </header>
      <Tip>
        Codes are case-insensitive. Pick <strong>Full unlock</strong> to give a free Project Pass, or <strong>Discount</strong> to reduce the Paystack amount. Leave "Max uses" empty for unlimited.
      </Tip>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}

      {data && data.length === 0 && !creating && (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Ticket className="h-10 w-10 mx-auto text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">No coupons yet. Create your first one to share with students.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Value</th>
                <th className="text-left px-4 py-2 font-medium">Uses</th>
                <th className="text-left px-4 py-2 font-medium">Active</th>
                <th className="text-left px-4 py-2 font-medium">Expires</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data as Coupon[]).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-2">{c.type === "full_unlock" ? "Full unlock" : "Discount"}</td>
                  <td className="px-4 py-2">
                    {c.type === "full_unlock"
                      ? "Free Project Pass"
                      : c.discount_percent
                        ? `${c.discount_percent}%`
                        : c.discount_amount_kobo
                          ? `₦${(c.discount_amount_kobo / 100).toLocaleString()}`
                          : "—"}
                  </td>
                  <td className="px-4 py-2">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td className="px-4 py-2">{c.active ? <span className="text-primary">Yes</span> : "No"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditing(c)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-primary-soft mr-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete coupon ${c.code}? This cannot be undone.`)) deleteM.mutate(c.id); }}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RedemptionHistory />

      {(creating || editing) && (
        <CouponModal
          initial={editing ?? undefined}
          busy={createM.isPending || updateM.isPending}
          error={(createM.error || updateM.error) as Error | null}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={(v) => editing ? updateM.mutate({ ...v, id: editing.id }) : createM.mutate(v)}
        />
      )}
    </div>
  );
}

type Redemption = {
  id: string;
  code: string;
  type: "full_unlock" | "discount";
  user_name: string;
  user_email: string;
  paper_id: string | null;
  paper_topic: string;
  course_code: string;
  amount_discount_kobo: number;
  created_at: string;
  status: string;
};

function RedemptionHistory() {
  const listRedemptions = useServerFn(adminListRedemptions);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-coupon-redemptions"],
    queryFn: () => listRedemptions(),
  });
  const rows = (data ?? []) as Redemption[];

  return (
    <section className="space-y-3 pt-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Redemption history</h2>
      </div>
      <p className="text-sm text-muted-foreground">Every time a student uses a code, it shows up here with the project it was applied to.</p>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No redemptions yet.
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">User</th>
                <th className="text-left px-4 py-2 font-medium">Project</th>
                <th className="text-left px-4 py-2 font-medium">Value</th>
                <th className="text-left px-4 py-2 font-medium">Redeemed at</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-mono font-medium">{r.code}</td>
                  <td className="px-4 py-2">
                    <div className="truncate max-w-[180px]">{r.user_name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[180px]">{r.user_email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="truncate max-w-[240px]">{r.paper_topic}</div>
                    {r.course_code && <div className="text-xs text-muted-foreground">{r.course_code}</div>}
                  </td>
                  <td className="px-4 py-2">
                    {r.type === "full_unlock" ? "Free Project Pass" : `₦${(r.amount_discount_kobo / 100).toLocaleString()}`}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "Unlocked" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CouponModal({
  initial, onClose, onSave, busy, error,
}: {
  initial?: Coupon;
  onClose: () => void;
  onSave: (v: any) => void;
  busy: boolean;
  error: Error | null;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [type, setType] = useState<"full_unlock" | "discount">(initial?.type ?? "full_unlock");
  const [discountPercent, setDiscountPercent] = useState<string>(initial?.discount_percent?.toString() ?? "");
  const [discountNaira, setDiscountNaira] = useState<string>(initial?.discount_amount_kobo ? String(initial.discount_amount_kobo / 100) : "");
  const [maxUses, setMaxUses] = useState<string>(initial?.max_uses?.toString() ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [expires, setExpires] = useState<string>(initial?.expires_at ? initial.expires_at.slice(0, 10) : "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      code: code.trim(),
      type,
      discount_percent: type === "discount" && discountPercent ? Number(discountPercent) : null,
      discount_amount_kobo: type === "discount" && discountNaira ? Math.round(Number(discountNaira) * 100) : null,
      max_uses: maxUses ? Number(maxUses) : null,
      active,
      notes: notes || null,
      expires_at: expires ? new Date(expires).toISOString() : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{initial ? "Edit coupon" : "New coupon"}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-primary-soft"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-muted-foreground">Code</span>
            <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAUNCH50" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm font-mono uppercase" />
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={() => setType("full_unlock")} className={`flex-1 rounded-xl border px-3 py-2 text-sm ${type === "full_unlock" ? "bg-primary text-primary-foreground border-primary" : ""}`}>
              Full unlock
            </button>
            <button type="button" onClick={() => setType("discount")} className={`flex-1 rounded-xl border px-3 py-2 text-sm ${type === "discount" ? "bg-primary text-primary-foreground border-primary" : ""}`}>
              Discount
            </button>
          </div>

          {type === "discount" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="text-muted-foreground">Percent off</span>
                <input value={discountPercent} onChange={(e) => { setDiscountPercent(e.target.value); if (e.target.value) setDiscountNaira(""); }} placeholder="e.g. 20" type="number" min={1} max={100} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Naira off</span>
                <input value={discountNaira} onChange={(e) => { setDiscountNaira(e.target.value); if (e.target.value) setDiscountPercent(""); }} placeholder="e.g. 500" type="number" min={0} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">Max uses (empty = unlimited)</span>
              <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" min={1} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Expires on</span>
              <input value={expires} onChange={(e) => setExpires(e.target.value)} type="date" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">Internal notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Active — students can redeem this code</span>
          </label>
        </div>

        {error && <div className="mt-3 text-xs text-destructive">{error.message}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border px-3 py-2 text-sm">Cancel</button>
          <button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </button>
        </div>
      </form>
    </div>
  );
}
