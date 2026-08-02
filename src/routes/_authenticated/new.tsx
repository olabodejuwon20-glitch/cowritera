import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MobileAppLayout, Card, PageTitle } from "@/components/mobile-app-layout";
import { createPaper } from "@/lib/papers.functions";
import { redeemCoupon } from "@/lib/coupons.functions";
import { initPayment } from "@/lib/paystack.functions";
import {
  ProjectDetailsFields,
  emptyDetails,
  cleanDetails,
  type ProjectDetails,
} from "@/components/project-details-form";
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
  const init = useServerFn(initPayment);
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState<ProjectDetails>(emptyDetails);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const clean = cleanDetails(details);
      const { id } = await create({
        data: {
          topic: topic.trim(),
          course_code: (clean.course_code || "GNS 102").trim(),
          details: clean,
        },
      });


      // Full-unlock codes redeem immediately; discount codes are applied server-side at init.
      const trimmedCode = code.trim();
      if (trimmedCode) {
        try {
          const r = await redeem({ data: { code: trimmedCode, paper_id: id } });
          if (r.type === "full_unlock" || r.unlocked || r.already_paid) {
            navigate({ to: "/paper/$id", params: { id } });
            return;
          }
        } catch (ce) {
          setErr((ce as Error).message);
          setBusy(false);
          return;
        }
      }

      const origin = window.location.origin;
      const res = await init({
        data: {
          paper_id: id,
          callback_url: `${origin}/paper/${id}?paid=1`,
          coupon_code: trimmedCode || null,
        },
      });
      if ("already_paid" in res && res.already_paid) {
        navigate({ to: "/paper/$id", params: { id } });
        return;
      }
      if ("authorization_url" in res && res.authorization_url) {
        if (trimmedCode) setNote(`Total: ₦${(res.amount_kobo / 100).toLocaleString()}`);
        window.location.href = res.authorization_url;
        return;
      }
      setErr("Could not start Paystack. You can retry from the paper page.");
      navigate({ to: "/paper/$id", params: { id } });
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <MobileAppLayout
      title="New Project"
      status="Set up your term paper"
      breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "My Projects", to: "/dashboard" }, { label: "New Project" }]}
    >
      <PageTitle
        eyebrow="Workspace"
        title="Start a new paper"
        description="One Project Pass unlocks unlimited generation and editing for this topic. The topic locks once payment succeeds."
      />
      <Card>
          <form onSubmit={onSubmit} className="space-y-4">
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

            <div className="rounded-2xl border p-3">
              <div className="text-sm font-medium">Project & cover page details</div>
              <p className="mt-1 text-xs text-muted-foreground">
                These appear on your cover page and in every export. You can edit them later.
              </p>
              <div className="mt-3">
                <ProjectDetailsFields value={details} onChange={setDetails} />
              </div>
            </div>

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
              className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue to payment (₦3,500)
            </button>
          </form>
      </Card>
    </MobileAppLayout>
  );
}
