import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, AppBar } from "@/components/app-shell";
import { createPaper } from "@/lib/papers.functions";
import { supabase } from "@/integrations/supabase/client";
import { redeemCoupon } from "@/lib/coupons.functions";
import { AlertTriangle, Loader2, Ticket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { title: "New paper — Co-Research AI" },
      { name: "description", content: "Start a new term paper project with Co-Research AI." },
      { property: "og:title", content: "New paper — Co-Research AI" },
      { property: "og:description", content: "Start a new term paper project." },
    ],
  }),
  component: NewPaperPage,
});

function NewPaperPage() {
  const create = useServerFn(createPaper);
  const redeem = useServerFn(redeemCoupon);
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [courseCode, setCourseCode] = useState("GNS 102");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { id } = await create({ data: { topic: topic.trim(), course_code: courseCode.trim() } });

      // Apply coupon code (if any) before checkout
      let amount = 3500;
      if (code.trim()) {
        try {
          const r = await redeem({ data: { code: code.trim(), paper_id: id } });
          if (r.type === "full_unlock" || r.unlocked || r.already_paid) {
            navigate({ to: "/paper/$id", params: { id } });
            return;
          }
          if (r.type === "discount") {
            if (r.discount_percent) amount = Math.max(100, Math.round(amount * (1 - r.discount_percent / 100)));
            else if (r.discount_amount_kobo) amount = Math.max(100, amount - Math.round(r.discount_amount_kobo / 100));
            setNote(`Code applied — new total ₦${amount.toLocaleString()}.`);
          }
        } catch (ce) {
          setErr((ce as Error).message);
          setBusy(false);
          return;
        }
      }

      // Kick off Paystack
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Could not read your account email.");
      const origin = window.location.origin;
      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          amount,
          callback_url: `${origin}/paper/${id}?paid=1`,
          paper_id: id,
        }),
      });
      const body = (await res.json()) as { authorization_url?: string; error?: string };
      if (!res.ok || !body.authorization_url) {
        // fallback: still navigate to the paper (user can retry from workspace)
        setErr(body.error ?? "Could not start Paystack. You can retry from the paper page.");
        navigate({ to: "/paper/$id", params: { id } });
        return;
      }
      window.location.href = body.authorization_url;
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <AppShell appBar={<AppBar title="New paper" back />}>
      <div className="px-4 py-5">
        <div className="w-full rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h1 className="text-xl font-semibold">Start a new paper</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One Project Pass unlocks unlimited generation and editing for this topic. The topic locks once payment succeeds.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Course code</span>
              <input
                required
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Research topic</span>
              <textarea
                required
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. The impact of ride-hailing platforms on urban transport in Lagos"
                className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="mt-1 block text-xs text-muted-foreground">Choose carefully — you cannot swap this for a completely different topic later.</span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Have a code?</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border bg-background px-3">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setNote(null); }}
                  placeholder="COUPON CODE (optional)"
                  className="flex-1 bg-transparent py-2.5 text-sm font-mono uppercase outline-none"
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">Full-unlock codes skip payment entirely; discount codes reduce the amount at checkout.</span>
            </label>
            {note && <div className="rounded-xl border border-primary/30 bg-primary-soft p-3 text-sm text-primary">{note}</div>}
            {err && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5" /> {err}
              </div>
            )}
            <button
              type="submit"
              disabled={busy || topic.trim().length < 4}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue to payment (₦3,500)
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
