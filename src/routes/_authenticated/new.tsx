import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { createPaper } from "@/lib/papers.functions";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2 } from "lucide-react";

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
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [courseCode, setCourseCode] = useState("GNS 102");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { id } = await create({ data: { topic: topic.trim(), course_code: courseCode.trim() } });
      // Kick off Paystack immediately
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Could not read your account email.");
      const origin = window.location.origin;
      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          amount: 3500,
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
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-xl rounded-3xl border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-2xl font-semibold">Start a new paper</h1>
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
