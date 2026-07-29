import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { getPaper, updateSection } from "@/lib/papers.functions";
import { generateSection, researchNotes } from "@/lib/ai.functions";
import { verifyPayment } from "@/lib/paystack.functions";
import { redeemCoupon } from "@/lib/coupons.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, BookOpen, Save, Lock, AlertTriangle, CheckCircle2, Ticket } from "lucide-react";

type Search = { paid?: string; reference?: string; trxref?: string };

export const Route = createFileRoute("/_authenticated/paper/$id")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    paid: typeof s.paid === "string" ? s.paid : undefined,
    reference: typeof s.reference === "string" ? s.reference : undefined,
    trxref: typeof s.trxref === "string" ? s.trxref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Paper — Co-Research AI" },
      { name: "description", content: "Write, generate, and edit your term paper inside Co-Research AI." },
      { property: "og:title", content: "Paper — Co-Research AI" },
      { property: "og:description", content: "Write your term paper inside Co-Research AI." },
    ],
  }),
  component: PaperPage,
});

const SECTIONS = [
  { key: "introduction", label: "1.0 Introduction" },
  { key: "literature", label: "2.0 Literature Review" },
  { key: "methodology", label: "3.0 Methodology" },
  { key: "results", label: "4.0 Results" },
  { key: "discussion", label: "5.0 Discussion" },
  { key: "conclusion", label: "6.0 Conclusion" },
  { key: "appendices", label: "7.0 Appendices" },
  { key: "references", label: "References" },
] as const;

function PaperPage() {
  const { id } = Route.useParams();
  const search = useSearch({ from: "/_authenticated/paper/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchPaper = useServerFn(getPaper);
  const verify = useServerFn(verifyPayment);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const paperQ = useQuery({
    queryKey: ["paper", id],
    queryFn: () => fetchPaper({ data: { id } }),
  });

  // Verify Paystack when returning from checkout
  useEffect(() => {
    const ref = search.reference ?? search.trxref;
    if (!ref) return;
    setVerifyMsg("Verifying payment…");
    verify({ data: { reference: ref, paper_id: id } })
      .then((r) => {
        setVerifyMsg(r.paid ? "Payment verified. Project unlocked." : "Payment not successful. Please retry.");
        qc.invalidateQueries({ queryKey: ["paper", id] });
        // strip query
        navigate({ to: "/paper/$id", params: { id }, search: {}, replace: true });
      })
      .catch((e) => setVerifyMsg((e as Error).message));
  }, [search.reference, search.trxref, id, verify, qc, navigate]);

  if (paperQ.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }
  if (paperQ.error) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="p-8 text-destructive">{(paperQ.error as Error).message}</div>
      </div>
    );
  }
  const paper = paperQ.data!;
  const sections = (paper.sections ?? {}) as Record<string, string>;
  const paid: boolean = paper.paid;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{paper.course_code}</div>
            <h1 className="mt-1 text-2xl font-semibold break-words">{paper.topic}</h1>
            <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> Topic is locked to this Project Pass.
            </div>
          </div>
          <div className="text-xs">
            {paid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft text-primary px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Project Pass active
              </span>
            ) : (
              <PayButton id={id} />
            )}
          </div>
        </div>

        {verifyMsg && (
          <div className="mt-4 rounded-xl border bg-card px-3 py-2 text-sm text-muted-foreground">{verifyMsg}</div>
        )}

        {!paid && (
          <div className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
              <div className="flex-1">
                <div className="font-medium">Awaiting Project Pass</div>
                <div className="text-muted-foreground">
                  AI generation and research are locked until this project's ₦3,500 Project Pass is paid.
                </div>
                <RedeemCoupon paperId={id} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {SECTIONS.map((s) => (
            <SectionEditor
              key={s.key}
              paperId={id}
              sectionKey={s.key}
              title={s.label}
              initial={sections[s.key] ?? ""}
              paid={paid}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function PayButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) return;
    const origin = window.location.origin;
    const res = await fetch("/api/paystack/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, amount: 3500, callback_url: `${origin}/paper/${id}?paid=1`, paper_id: id }),
    });
    const body = (await res.json()) as { authorization_url?: string };
    if (body.authorization_url) window.location.href = body.authorization_url;
    else setBusy(false);
  }
  return (
    <button
      onClick={pay}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60"
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      Buy Project Pass — ₦3,500
    </button>
  );
}

function SectionEditor({
  paperId, sectionKey, title, initial, paid,
}: { paperId: string; sectionKey: string; title: string; initial: string; paid: boolean }) {
  const qc = useQueryClient();
  const [content, setContent] = useState(initial);
  const [notes, setNotes] = useState<string | null>(null);
  useEffect(() => setContent(initial), [initial]);

  const save = useServerFn(updateSection);
  const gen = useServerFn(generateSection);
  const research = useServerFn(researchNotes);

  const saveM = useMutation({
    mutationFn: () => save({ data: { id: paperId, section_key: sectionKey, content } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper", paperId] }),
  });
  const genM = useMutation({
    mutationFn: () => gen({ data: { paper_id: paperId, section_key: sectionKey } }),
    onSuccess: (r) => setContent(r.content),
  });
  const researchM = useMutation({
    mutationFn: () => research({ data: { paper_id: paperId, section_key: sectionKey } }),
    onSuccess: (r) => setNotes(r.notes),
  });

  const words = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content]);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            disabled={!paid || researchM.isPending}
            onClick={() => researchM.mutate()}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-primary-soft disabled:opacity-50"
          >
            {researchM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
            Research
          </button>
          <button
            disabled={!paid || genM.isPending}
            onClick={() => genM.mutate()}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-xs hover:brightness-110 disabled:opacity-50"
          >
            {genM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {content ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {(genM.error || researchM.error || saveM.error) && (
        <div className="mt-3 text-xs text-destructive">
          {(genM.error || researchM.error || saveM.error)?.message}
        </div>
      )}

      {notes && (
        <div className="mt-4 rounded-xl border bg-surface p-3">
          <div className="text-xs font-medium mb-1 flex items-center justify-between">
            <span>Research notes</span>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setNotes(null)}>Dismiss</button>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-sans">{notes}</pre>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        placeholder={paid ? "Write here or click Generate to have Co-Research AI draft this section…" : "Unlock this project to start writing."}
        disabled={!paid}
        className="mt-4 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70"
      />

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{words} words</span>
        <button
          onClick={() => saveM.mutate()}
          disabled={!paid || saveM.isPending || content === initial}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 hover:bg-primary-soft disabled:opacity-50"
        >
          {saveM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saveM.isSuccess && content === initial ? "Saved" : "Save"}
        </button>
      </div>
    </section>
  );
}
