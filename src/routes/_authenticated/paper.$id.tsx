import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, Sparkles, BookOpen, Lock, AlertTriangle, CheckCircle2, Ticket,
  Menu, MoreHorizontal, Download, Pencil, Check, FileDown, ClipboardList,
  GraduationCap, Wand2, RefreshCw, ChevronLeft, ChevronRight, Circle,
} from "lucide-react";

import { AppShell, AppBar } from "@/components/app-shell";
import { BottomSheet, SideDrawer } from "@/components/sheets";
import { getPaper, updateSection, updateProject } from "@/lib/papers.functions";
import { generateSection, researchNotes } from "@/lib/ai.functions";
import { verifyPayment } from "@/lib/paystack.functions";
import { redeemCoupon } from "@/lib/coupons.functions";
import { supabase } from "@/integrations/supabase/client";
import { setLastPaper } from "@/lib/last-paper";
import { useOnline } from "@/lib/use-pwa";
import { enqueueSave, flushOutbox, notify, tap, type PendingSave } from "@/lib/offline";

type Search = { paid?: string; reference?: string; trxref?: string };

export const Route = createFileRoute("/_authenticated/paper/$id")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    paid: typeof s.paid === "string" ? s.paid : undefined,
    reference: typeof s.reference === "string" ? s.reference : undefined,
    trxref: typeof s.trxref === "string" ? s.trxref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Workspace — Co-Research AI" },
      { name: "description", content: "Write, generate and export your term paper in the Co-Research AI workspace." },
      { property: "og:title", content: "Workspace — Co-Research AI" },
      { property: "og:description", content: "Write your term paper inside Co-Research AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaperPage,
});

/* ------------------------------------------------------------------ */
/* Step model — 13 tracked sections + a Finish step                     */
/* ------------------------------------------------------------------ */

type StepKind = "info" | "guide" | "analysis" | "doc" | "export";

type Step = {
  key: string;
  label: string;
  short: string;
  group: "Setup" | "Document" | "Finish";
  kind: StepKind;
  heading?: string;
  tracked: boolean;
};

const STEPS: Step[] = [
  { key: "project", label: "Project Information", short: "Project", group: "Setup", kind: "info", tracked: true },
  { key: "lecturer_guide", label: "Lecturer Guide", short: "Lecturer", group: "Setup", kind: "guide", tracked: true },
  { key: "ai_analysis", label: "AI Analysis", short: "Analysis", group: "Setup", kind: "analysis", tracked: true },
  { key: "cover", label: "Cover Page", short: "Cover", group: "Document", kind: "doc", tracked: true },
  { key: "outline", label: "Outline", short: "Outline", group: "Document", kind: "doc", tracked: true },
  { key: "introduction", label: "Introduction", short: "Intro", group: "Document", kind: "doc", heading: "1.0 INTRODUCTION", tracked: true },
  { key: "literature", label: "Literature Review", short: "Literature", group: "Document", kind: "doc", heading: "2.0 LITERATURE REVIEW", tracked: true },
  { key: "methodology", label: "Methodology", short: "Method", group: "Document", kind: "doc", heading: "3.0 METHODOLOGY", tracked: true },
  { key: "results", label: "Results", short: "Results", group: "Document", kind: "doc", heading: "4.0 RESULTS", tracked: true },
  { key: "discussion", label: "Discussion", short: "Discussion", group: "Document", kind: "doc", heading: "5.0 DISCUSSION", tracked: true },
  { key: "conclusion", label: "Conclusion", short: "Conclusion", group: "Document", kind: "doc", heading: "6.0 CONCLUSION", tracked: true },
  { key: "appendices", label: "Appendices", short: "Appendices", group: "Document", kind: "doc", heading: "APPENDICES", tracked: true },
  { key: "references", label: "References", short: "References", group: "Document", kind: "doc", heading: "REFERENCES", tracked: true },
  { key: "export", label: "Export", short: "Export", group: "Finish", kind: "export", tracked: false },
];

const TRACKED = STEPS.filter((s) => s.tracked);

/* ------------------------------------------------------------------ */

function PaperPage() {
  const { id } = Route.useParams();
  const search = useSearch({ from: "/_authenticated/paper/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnline();

  const fetchPaper = useServerFn(getPaper);
  const verify = useServerFn(verifyPayment);
  const save = useServerFn(updateSection);

  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [nav, setNav] = useState(false);
  const [aiSheet, setAiSheet] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);
  const [editSheet, setEditSheet] = useState(false);

  const paperQ = useQuery({
    queryKey: ["paper", id],
    queryFn: () => fetchPaper({ data: { id } }),
  });

  useEffect(() => {
    if (paperQ.data) setLastPaper(id, (paperQ.data as { topic?: string }).topic);
  }, [paperQ.data, id]);

  // Background sync: flush queued offline edits whenever we come back online.
  const sendPending = useCallback(
    (item: PendingSave) => save({ data: { id: item.paper_id, section_key: item.section_key, content: item.content } }),
    [save],
  );
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const n = await flushOutbox(sendPending);
      if (n > 0 && !cancelled) {
        qc.invalidateQueries({ queryKey: ["paper", id] });
        void notify("Changes synced", `${n} offline edit${n === 1 ? "" : "s"} saved to your project.`);
      }
    };
    void run();
    window.addEventListener("online", run);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
    };
  }, [sendPending, qc, id]);

  // Verify Paystack when returning from checkout
  useEffect(() => {
    const ref = search.reference ?? search.trxref;
    if (!ref) return;
    setVerifyMsg("Verifying payment…");
    verify({ data: { reference: ref, paper_id: id } })
      .then((r) => {
        setVerifyMsg(r.paid ? "Payment verified. Project unlocked." : "Payment not successful. Please retry.");
        qc.invalidateQueries({ queryKey: ["paper", id] });
        navigate({ to: "/paper/$id", params: { id }, search: {}, replace: true });
      })
      .catch((e) => setVerifyMsg((e as Error).message));
  }, [search.reference, search.trxref, id, verify, qc, navigate]);

  if (paperQ.isLoading) {
    return (
      <AppShell appBar={<AppBar title="Loading…" back />}>
        <div className="grid h-[60vh] place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }
  if (paperQ.error || !paperQ.data) {
    return (
      <AppShell appBar={<AppBar title="Paper" back />}>
        <div className="p-6 text-sm text-destructive">{(paperQ.error as Error)?.message ?? "Paper not found"}</div>
      </AppShell>
    );
  }

  const paper = paperQ.data as {
    id: string; topic: string; course_code: string; paid: boolean;
    sections: Record<string, string> | null; project: Record<string, unknown> | null;
  };
  const sections = (paper.sections ?? {}) as Record<string, string>;
  const project = (paper.project ?? {}) as Record<string, unknown>;
  const paid = paper.paid;

  const done = TRACKED.filter((s) =>
    s.kind === "info" ? !!(project.institution || project.group_name) : (sections[s.key] ?? "").trim().length > 0,
  ).length;
  const pct = Math.round((done / TRACKED.length) * 100);

  const step = STEPS[stepIndex];
  const content = sections[step.key] ?? "";

  return (
    <AppShell
      scroll={false}
      appBar={
        <AppBar
          title={paper.topic || "Untitled paper"}
          subtitle={`${paper.course_code} · ${done}/${TRACKED.length} sections`}
          leading={
            <button
              aria-label="Open sections"
              onClick={() => { tap(); setNav(true); }}
              className="grid h-11 w-11 place-items-center rounded-full active:scale-95 active:bg-primary-soft transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          }
          actions={
            <button
              aria-label="More actions"
              onClick={() => { tap(); setMoreSheet(true); }}
              className="grid h-11 w-11 place-items-center rounded-full active:scale-95 active:bg-primary-soft transition"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          }
        />
      }
      className="flex flex-col [&>div]:flex [&>div]:h-full [&>div]:min-h-0 [&>div]:flex-col"
    >
      {/* progress + step chips: fixed, never scrolls horizontally with the page */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="h-0.5 w-full bg-muted">
          <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2">
          {STEPS.map((s, i) => {
            const complete = s.tracked && (sections[s.key] ?? "").trim().length > 0;
            return (
              <button
                key={s.key}
                onClick={() => { tap(); setStepIndex(i); }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
                  i === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground active:bg-primary-soft"
                }`}
              >
                {complete ? <Check className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
                {s.short}
              </button>
            );
          })}
        </div>
      </div>

      {verifyMsg && (
        <div className="mx-3 mt-3 rounded-2xl border bg-card px-3 py-2 text-xs text-muted-foreground">{verifyMsg}</div>
      )}

      {!paid && <Paywall id={id} />}

      {/* Step body */}
      <div className="min-h-0 flex-1">
        {step.kind === "info" && <ProjectInfo paperId={id} project={project} />}
        {(step.kind === "guide" || step.kind === "analysis") && (
          <TextStep
            paperId={id}
            step={step}
            value={content}
            paid={paid}
            online={online}
            onSaved={() => qc.invalidateQueries({ queryKey: ["paper", id] })}
          />
        )}
        {step.kind === "doc" && (
          <DocView step={step} content={content} topic={paper.topic} project={project} />
        )}
        {step.kind === "export" && <ExportStep paper={paper} sections={sections} />}
      </div>

      {/* Floating AI action for document steps */}
      {step.kind === "doc" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex justify-center gap-3 px-4">
          <button
            onClick={() => { tap(); setEditSheet(true); }}
            className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full border bg-card px-5 text-sm font-medium shadow-[var(--shadow-soft)] active:scale-95 transition"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={() => { tap(12); setAiSheet(true); }}
            className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] active:scale-95 transition"
          >
            <Sparkles className="h-4 w-4" /> AI
          </button>
        </div>
      )}

      {/* Sections drawer */}
      <SideDrawer open={nav} onOpenChange={setNav} title="Project progress">
        <div className="px-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{pct}%</span>
            <span className="text-xs text-muted-foreground">{done} of {TRACKED.length} sections</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="mt-5 space-y-5">
          {(["Setup", "Document", "Finish"] as const).map((group) => (
            <div key={group}>
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
              <div className="space-y-0.5">
                {STEPS.map((s, i) =>
                  s.group !== group ? null : (
                    <button
                      key={s.key}
                      onClick={() => { tap(); setStepIndex(i); setNav(false); }}
                      className={`flex w-full min-h-11 items-center gap-2.5 rounded-2xl px-3 text-left text-sm ${
                        i === stepIndex ? "bg-primary-soft font-medium text-primary" : "active:bg-primary-soft"
                      }`}
                    >
                      {s.tracked && (sections[s.key] ?? "").trim() ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className="truncate">{s.label}</span>
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </SideDrawer>

      {/* AI bottom sheet */}
      <AiSheet
        open={aiSheet}
        onOpenChange={setAiSheet}
        paperId={id}
        step={step}
        paid={paid}
        hasContent={!!content.trim()}
      />

      {/* Edit bottom sheet */}
      <EditSheet
        open={editSheet}
        onOpenChange={setEditSheet}
        paperId={id}
        step={step}
        initial={content}
        paid={paid}
        online={online}
        onSaved={() => qc.invalidateQueries({ queryKey: ["paper", id] })}
      />

      {/* More sheet */}
      <BottomSheet open={moreSheet} onOpenChange={setMoreSheet} title="Project actions">
        <div className="space-y-1">
          <SheetRow icon={ClipboardList} label="Jump to sections" onClick={() => { setMoreSheet(false); setNav(true); }} />
          <SheetRow
            icon={FileDown}
            label="Go to Export"
            onClick={() => { setMoreSheet(false); setStepIndex(STEPS.length - 1); }}
          />
          <SheetRow
            icon={ChevronLeft}
            label="Previous section"
            onClick={() => { setMoreSheet(false); setStepIndex((i) => Math.max(0, i - 1)); }}
          />
          <SheetRow
            icon={ChevronRight}
            label="Next section"
            onClick={() => { setMoreSheet(false); setStepIndex((i) => Math.min(STEPS.length - 1, i + 1)); }}
          />
        </div>
      </BottomSheet>
    </AppShell>
  );
}

function SheetRow({ icon: Icon, label, onClick }: { icon: typeof Menu; label: string; onClick: () => void }) {
  return (
    <button
      onClick={() => { tap(); onClick(); }}
      className="flex w-full min-h-12 items-center gap-3 rounded-2xl px-3 text-left text-sm active:bg-primary-soft"
    >
      <Icon className="h-[18px] w-[18px] text-muted-foreground" />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Document canvas — fixed A4 page, isolated pan + pinch-zoom          */
/* ------------------------------------------------------------------ */

function DocView({
  step, content, topic, project,
}: { step: Step; content: string; topic: string; project: Record<string, unknown> }) {
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());
  const isCover = step.key === "cover";

  return (
    <div className="doc-canvas h-full px-3 py-4">
      <div className="doc-page">
        {isCover ? (
          <div className="text-center leading-relaxed">
            <div className="font-bold uppercase">{String(project.institution ?? "")}</div>
            <div className="uppercase">{String(project.faculty ?? "")}</div>
            <div className="mt-8 font-bold uppercase">{topic}</div>
            <div className="mt-8">{String(project.group_name ?? "")}</div>
            <div className="mt-8 whitespace-pre-wrap text-left">{content}</div>
          </div>
        ) : (
          <>
            {step.heading && <div className="mb-4 text-center font-bold uppercase">{step.heading}</div>}
            {paragraphs.length ? (
              paragraphs.map((p, i) => (
                <p key={i} className="mb-4 text-justify indent-8 whitespace-pre-wrap">{p}</p>
              ))
            ) : (
              <p className="text-center italic opacity-50">
                This section is empty. Tap AI to draft it, or Edit to write it yourself.
              </p>
            )}
          </>
        )}
      </div>
      <div className="h-24" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Edit sheet                                                          */
/* ------------------------------------------------------------------ */

function useSaver(paperId: string, sectionKey: string, online: boolean, onSaved: () => void) {
  const save = useServerFn(updateSection);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "queued" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(
    async (content: string) => {
      setErr(null);
      if (!online) {
        await enqueueSave({ paper_id: paperId, section_key: sectionKey, content });
        setState("queued");
        return;
      }
      setState("saving");
      try {
        await save({ data: { id: paperId, section_key: sectionKey, content } });
        setState("saved");
        onSaved();
      } catch (e) {
        await enqueueSave({ paper_id: paperId, section_key: sectionKey, content });
        setErr((e as Error).message);
        setState("queued");
      }
    },
    [online, paperId, sectionKey, save, onSaved],
  );

  return { run, state, err };
}

function EditSheet({
  open, onOpenChange, paperId, step, initial, paid, online, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; paperId: string; step: Step;
  initial: string; paid: boolean; online: boolean; onSaved: () => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => { if (open) setValue(initial); }, [open, initial]);
  const { run, state, err } = useSaver(paperId, step.key, online, onSaved);
  const words = useMemo(() => (value.trim() ? value.trim().split(/\s+/).length : 0), [value]);
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={step.label} description={`${words} words`}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!paid}
        rows={14}
        placeholder={paid ? "Write this section…" : "Unlock the Project Pass to edit."}
        className="w-full rounded-2xl border bg-background px-4 py-3 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
      />
      {err && <div className="mt-2 text-xs text-destructive">{err}</div>}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onOpenChange(false)}
          className="min-h-12 flex-1 rounded-2xl border text-sm active:bg-primary-soft"
        >
          Close
        </button>
        <button
          disabled={!paid || state === "saving"}
          onClick={async () => { tap(); await run(value); onOpenChange(false); }}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-60 transition"
        >
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {state === "queued" ? "Saved offline" : "Save"}
        </button>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* AI sheet                                                            */
/* ------------------------------------------------------------------ */

function AiSheet({
  open, onOpenChange, paperId, step, paid, hasContent,
}: { open: boolean; onOpenChange: (v: boolean) => void; paperId: string; step: Step; paid: boolean; hasContent: boolean }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateSection);
  const research = useServerFn(researchNotes);
  const save = useServerFn(updateSection);
  const [notes, setNotes] = useState<string | null>(null);

  const genM = useMutation({
    mutationFn: async () => {
      const r = await gen({ data: { paper_id: paperId, section_key: step.key } });
      await save({ data: { id: paperId, section_key: step.key, content: r.content } });
      return r;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper", paperId] });
      void notify("Draft ready", `${step.label} has been generated.`);
      onOpenChange(false);
    },
  });

  const researchM = useMutation({
    mutationFn: () => research({ data: { paper_id: paperId, section_key: step.key } }),
    onSuccess: (r) => setNotes(r.notes),
  });

  const busy = genM.isPending || researchM.isPending;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={`AI · ${step.label}`} description={paid ? undefined : "Unlock the Project Pass to use AI."}>
      <div className="space-y-2">
        <button
          disabled={!paid || busy}
          onClick={() => { tap(12); genM.mutate(); }}
          className="flex w-full min-h-14 items-center gap-3 rounded-2xl bg-primary px-4 text-left text-sm font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-60 transition"
        >
          {genM.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : hasContent ? <RefreshCw className="h-5 w-5" /> : <Wand2 className="h-5 w-5" />}
          <span>
            {hasContent ? "Regenerate this section" : "Generate this section"}
            <span className="block text-[11px] font-normal opacity-80">Writes it straight into your document</span>
          </span>
        </button>
        <button
          disabled={!paid || busy}
          onClick={() => { tap(); researchM.mutate(); }}
          className="flex w-full min-h-14 items-center gap-3 rounded-2xl border px-4 text-left text-sm active:bg-primary-soft disabled:opacity-60"
        >
          {researchM.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
          <span>
            Research notes
            <span className="block text-[11px] text-muted-foreground">Sources and angles to weave in</span>
          </span>
        </button>
      </div>

      {(genM.error || researchM.error) && (
        <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {(genM.error || researchM.error)?.message}
        </div>
      )}

      {notes && (
        <div className="mt-4 rounded-2xl border bg-surface p-3">
          <div className="mb-1 flex items-center justify-between text-xs font-medium">
            <span>Research notes</span>
            <button className="text-muted-foreground" onClick={() => setNotes(null)}>Dismiss</button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{notes}</pre>
        </div>
      )}
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Setup steps                                                         */
/* ------------------------------------------------------------------ */

function ProjectInfo({ paperId, project }: { paperId: string; project: Record<string, unknown> }) {
  const qc = useQueryClient();
  const update = useServerFn(updateProject);
  const [form, setForm] = useState({
    institution: String(project.institution ?? ""),
    faculty: String(project.faculty ?? ""),
    department: String(project.department ?? ""),
    group_name: String(project.group_name ?? ""),
    lecturer_name: String(project.lecturer_name ?? ""),
  });
  const m = useMutation({
    mutationFn: () => update({ data: { id: paperId, project: form } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper", paperId] }),
  });

  const fields: [keyof typeof form, string, string][] = [
    ["institution", "Institution", "e.g. University of Lagos"],
    ["faculty", "Faculty", "e.g. Faculty of Science"],
    ["department", "Department", "e.g. Computer Science"],
    ["group_name", "Group name", "e.g. AGP 002"],
    ["lecturer_name", "Lecturer", "Optional"],
  ];

  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <div className="rounded-3xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GraduationCap className="h-4 w-4 text-primary" /> Project information
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Used on your cover page and in every export.</p>
        <div className="mt-4 space-y-3">
          {fields.map(([k, label, ph]) => (
            <label key={k} className="block">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <input
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                placeholder={ph}
                className="mt-1 min-h-12 w-full rounded-2xl border bg-background px-4 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          ))}
        </div>
        <button
          onClick={() => { tap(); m.mutate(); }}
          disabled={m.isPending}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-60 transition"
        >
          {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {m.isSuccess ? "Saved" : "Save details"}
        </button>
      </div>
    </div>
  );
}

function TextStep({
  paperId, step, value, paid, online, onSaved,
}: { paperId: string; step: Step; value: string; paid: boolean; online: boolean; onSaved: () => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const { run, state, err } = useSaver(paperId, step.key, online, onSaved);
  const gen = useServerFn(generateSection);
  const save = useServerFn(updateSection);
  const qc = useQueryClient();

  const analyse = useMutation({
    mutationFn: async () => {
      const r = await gen({ data: { paper_id: paperId, section_key: step.key } });
      await save({ data: { id: paperId, section_key: step.key, content: r.content } });
      return r;
    },
    onSuccess: (r) => {
      setText(r.content);
      qc.invalidateQueries({ queryKey: ["paper", paperId] });
    },
  });

  const isAnalysis = step.kind === "analysis";

  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <div className="rounded-3xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isAnalysis ? <Sparkles className="h-4 w-4 text-primary" /> : <ClipboardList className="h-4 w-4 text-primary" />}
          {step.label}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {isAnalysis
            ? "Co-Research reads your topic and lecturer instructions, then tells you exactly what the marker expects."
            : "Paste the exact instructions your lecturer gave — length, font, citation style, deadline. Every AI draft will follow them."}
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={isAnalysis ? 14 : 10}
          placeholder={isAnalysis ? "Run the analysis to fill this in…" : "e.g. Maximum 8 pages, Times New Roman 12pt, APA citations, submit before 12 May."}
          className="mt-4 w-full rounded-2xl border bg-background px-4 py-3 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-primary/40"
        />

        {(err || analyse.error) && (
          <div className="mt-2 text-xs text-destructive">{err ?? (analyse.error as Error)?.message}</div>
        )}

        <div className="mt-3 flex gap-2">
          {isAnalysis && (
            <button
              disabled={!paid || analyse.isPending}
              onClick={() => { tap(12); analyse.mutate(); }}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border text-sm active:bg-primary-soft disabled:opacity-60"
            >
              {analyse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Run analysis
            </button>
          )}
          <button
            onClick={() => { tap(); void run(text); }}
            disabled={state === "saving"}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-60 transition"
          >
            {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {state === "queued" ? "Saved offline" : state === "saved" ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function ExportStep({
  paper, sections,
}: { paper: { topic: string; course_code: string; project: Record<string, unknown> | null }; sections: Record<string, string> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const project = (paper.project ?? {}) as Record<string, unknown>;

  const draft = useMemo(() => {
    const toParas = (k: string) => (sections[k] ?? "").split(/\n{2,}/).filter((p) => p.trim());
    return {
      topic: paper.topic,
      submissionLine: [project.institution, project.faculty, project.department, project.group_name]
        .filter(Boolean)
        .join(" · "),
      introduction: toParas("introduction"),
      literature: toParas("literature"),
      methodology: toParas("methodology"),
      results: toParas("results"),
      discussion: toParas("discussion"),
      conclusion: toParas("conclusion"),
      appendices: toParas("appendices"),
      references: toParas("references"),
    };
  }, [paper.topic, project, sections]);

  async function download(kind: "docx" | "pdf") {
    tap(12);
    setBusy(kind);
    try {
      const res = await fetch(`/api/export/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${paper.course_code || "Term"}-Paper.${kind}`;
      a.click();
      URL.revokeObjectURL(url);
      void notify("Export ready", `Your ${kind.toUpperCase()} has been downloaded.`);
    } finally {
      setBusy(null);
    }
  }

  const filled = Object.values(sections).filter((v) => (v ?? "").trim()).length;

  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <div className="rounded-3xl border bg-card p-5 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <FileDown className="h-7 w-7" />
        </span>
        <h2 className="mt-3 font-semibold">Export your paper</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {filled} section{filled === 1 ? "" : "s"} written · Times New Roman 12pt, 1-inch margins.
        </p>
        <div className="mt-5 space-y-2">
          <button
            onClick={() => void download("docx")}
            disabled={busy !== null}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-60 transition"
          >
            {busy === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Word (.docx)
          </button>
          <button
            onClick={() => void download("pdf")}
            disabled={busy !== null}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm active:bg-primary-soft disabled:opacity-60"
          >
            {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paywall                                                             */
/* ------------------------------------------------------------------ */

function Paywall({ id }: { id: string }) {
  const [sheet, setSheet] = useState(false);
  return (
    <>
      <button
        onClick={() => { tap(); setSheet(true); }}
        className="mx-3 mt-3 flex items-center gap-2 rounded-2xl border border-amber-300/50 bg-amber-50/70 px-3 py-2.5 text-left text-xs dark:bg-amber-950/20"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="flex-1">
          <span className="block font-medium">Project Pass required</span>
          <span className="text-muted-foreground">AI generation is locked until this project is unlocked.</span>
        </span>
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <BottomSheet open={sheet} onOpenChange={setSheet} title="Unlock this project" description="One pass, unlimited generation and edits for this topic.">
        <PayButton id={id} />
        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or use a code <span className="h-px flex-1 bg-border" />
        </div>
        <RedeemCoupon paperId={id} />
      </BottomSheet>
    </>
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
      className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-medium text-primary-foreground active:scale-[0.98] disabled:opacity-60 transition"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      Pay ₦3,500 with Paystack
    </button>
  );
}

function RedeemCoupon({ paperId }: { paperId: string }) {
  const qc = useQueryClient();
  const redeem = useServerFn(redeemCoupon);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null); setErr(null);
    try {
      const r = await redeem({ data: { code: code.trim(), paper_id: paperId } });
      if (r.type === "full_unlock" || r.unlocked) {
        setMsg("Code accepted. Project unlocked.");
        qc.invalidateQueries({ queryKey: ["paper", paperId] });
      } else if (r.type === "discount") {
        const off = r.discount_percent
          ? `${r.discount_percent}% off`
          : `₦${((r.discount_amount_kobo ?? 0) / 100).toLocaleString()} off`;
        setMsg(`Code applied: ${off}. Continue with Paystack to finish.`);
      }
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="flex min-h-12 items-center gap-2 rounded-2xl border bg-background px-3">
        <Ticket className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="COUPON CODE"
          className="w-full bg-transparent py-3 font-mono text-sm uppercase outline-none"
        />
      </div>
      <button
        disabled={busy || !code.trim()}
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm active:bg-primary-soft disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Redeem code
      </button>
      {msg && <div className="mt-2 text-xs text-primary">{msg}</div>}
      {err && <div className="mt-2 text-xs text-destructive">{err}</div>}
    </form>
  );
}
