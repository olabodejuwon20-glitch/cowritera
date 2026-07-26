import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileText, BookOpen, ClipboardList, FlaskConical, BarChart3, MessageSquare,
  CheckCircle2, ListOrdered, Library, Download, ShieldCheck, Wand2, Sparkles,
  Info, X, ChevronLeft, Circle, Loader2, TrendingUp,
} from "lucide-react";
import { demoProject, sections } from "@/lib/demo-content";

const STORAGE_KEY = "coresearch.demo.completed.v1";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Interactive Demo — Co-Research AI" },
      { name: "description", content: "Explore a fully pre-generated GNS 102 term paper inside the Co-Research AI workspace. No signup required." },
      { property: "og:title", content: "Interactive Demo — Co-Research AI" },
      { property: "og:description", content: "See a lecturer-compliant term paper being built inside Co-Research AI." },
    ],
  }),
  component: DemoWorkspace,
});

type SectionKey =
  | "project" | "guide" | "analysis" | "cover" | "outline" | "introduction"
  | "literature" | "methodology" | "results" | "discussion" | "conclusion"
  | "references" | "export";

const navItems: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }>; group: string }[] = [
  { key: "project", label: "Project Information", icon: Info, group: "Setup" },
  { key: "guide", label: "Lecturer Guide", icon: ShieldCheck, group: "Setup" },
  { key: "analysis", label: "AI Analysis", icon: Sparkles, group: "Setup" },
  { key: "cover", label: "Cover Page", icon: FileText, group: "Document" },
  { key: "outline", label: "Outline", icon: ListOrdered, group: "Document" },
  { key: "introduction", label: "Introduction", icon: BookOpen, group: "Document" },
  { key: "literature", label: "Literature Review", icon: Library, group: "Document" },
  { key: "methodology", label: "Methodology", icon: FlaskConical, group: "Document" },
  { key: "results", label: "Results", icon: BarChart3, group: "Document" },
  { key: "discussion", label: "Discussion", icon: MessageSquare, group: "Document" },
  { key: "conclusion", label: "Conclusion", icon: CheckCircle2, group: "Document" },
  { key: "references", label: "References", icon: ClipboardList, group: "Document" },
  { key: "export", label: "Export", icon: Download, group: "Finish" },
];

const trackableSections: SectionKey[] = [
  "project", "guide", "analysis", "cover", "outline", "introduction",
  "literature", "methodology", "results", "discussion", "conclusion", "references",
];

function useCompletion() {
  const [completed, setCompleted] = useState<Set<SectionKey>>(() => new Set(trackableSections));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCompleted(new Set(JSON.parse(raw) as SectionKey[]));
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed))); } catch { /* noop */ }
  }, [completed]);
  const toggle = (k: SectionKey) =>
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  const reset = () => setCompleted(new Set());
  const markAll = () => setCompleted(new Set(trackableSections));
  return { completed, toggle, reset, markAll };
}

function DemoWorkspace() {
  const [active, setActive] = useState<SectionKey>("cover");
  const [showPurchase, setShowPurchase] = useState(false);
  const { completed, toggle, reset, markAll } = useCompletion();

  const total = trackableSections.length;
  const done = trackableSections.filter((k) => completed.has(k)).length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TopBar onPurchase={() => setShowPurchase(true)} percent={percent} done={done} total={total} />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_320px]">
        <Sidebar active={active} onSelect={setActive} completed={completed} percent={percent} done={done} total={total} onReset={reset} onMarkAll={markAll} />
        <main className="min-h-[calc(100vh-4rem)] bg-surface-2/40 overflow-auto">
          <div className="p-6 md:p-10">
            <SectionRenderer active={active} onLocked={() => setShowPurchase(true)} completed={completed} onToggle={toggle} />
          </div>
        </main>
        <RightPanel onLocked={() => setShowPurchase(true)} percent={percent} done={done} total={total} />
      </div>
      {showPurchase && <PurchaseModal onClose={() => setShowPurchase(false)} />}
    </div>
  );
}

function TopBar({ onPurchase, percent, done, total }: { onPurchase: () => void; percent: number; done: number; total: number }) {
  return (
    <div className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur flex items-center px-4 md:px-6">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to site
      </Link>
      <div className="mx-4 h-6 w-px bg-border" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Demo project</div>
        <div className="text-sm font-medium truncate">{demoProject.topic}</div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <div className="h-1.5 w-28 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-xs font-medium tabular-nums">{done}/{total}</span>
        </div>
        <button onClick={onPurchase} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:brightness-110">
          Unlock Project Pass
        </button>
      </div>
    </div>
  );
}

function Sidebar({ active, onSelect, completed, percent, done, total, onReset, onMarkAll }: {
  active: SectionKey; onSelect: (k: SectionKey) => void;
  completed: Set<SectionKey>; percent: number; done: number; total: number;
  onReset: () => void; onMarkAll: () => void;
}) {
  const groups = Array.from(new Set(navItems.map((i) => i.group)));
  return (
    <aside className="border-r bg-background hidden md:block">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">Project progress</div>
          <span className="text-xs tabular-nums font-semibold text-primary">{percent}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{done} of {total} sections</span>
          <button onClick={done === total ? onReset : onMarkAll} className="text-primary hover:underline">
            {done === total ? "Reset" : "Mark all"}
          </button>
        </div>
      </div>
      <nav className="p-3 space-y-6">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{g}</div>
            <ul className="space-y-1">
              {navItems.filter((i) => i.group === g).map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                const isDone = completed.has(item.key);
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => onSelect(item.key)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                        isActive
                          ? "bg-primary-soft text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground"
                      }`}
                    >
                      {item.key === "export" ? (
                        <Icon className="h-4 w-4" />
                      ) : isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.key !== "export" && !isDone && <Icon className="h-3.5 w-3.5 opacity-40" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function RightPanel({ onLocked, percent, done, total }: { onLocked: () => void; percent: number; done: number; total: number }) {
  return (
    <aside className="hidden lg:block border-l bg-background overflow-auto">
      <div className="p-5 space-y-5">
        <Panel title="Progress overview" icon={TrendingUp}>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums">{percent}%</span>
            <span className="text-xs text-muted-foreground">{done} / {total} sections</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {done === total ? "All sections complete — ready to export." : `${total - done} sections remaining.`}
          </p>
        </Panel>
        <Panel title="AI Assistant" icon={Sparkles}>

          <p className="text-xs text-muted-foreground">
            Ask the assistant to rewrite, tighten, or expand any section. In this demo, responses are pre-set.
          </p>
          <div className="mt-3 rounded-xl border bg-surface p-3 text-xs">
            <div className="font-medium text-primary">Suggested next</div>
            <p className="mt-1 text-muted-foreground">"Rewrite the introduction with a stronger opening hook."</p>
          </div>
          <button onClick={onLocked} className="mt-3 w-full rounded-xl bg-primary text-primary-foreground text-sm py-2 hover:brightness-110">
            Try in your project
          </button>
        </Panel>
        <Panel title="Lecturer Compliance" icon={ShieldCheck}>
          <ul className="space-y-2 text-xs">
            {[
              "Times New Roman, size 12",
              "1-inch margins on all sides",
              "Cover page with group members table",
              "Body under 8 pages",
              "At least 3 African authors cited",
            ].map((r) => (
              <li key={r} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Suggestions" icon={Wand2}>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>• Strengthen the transition between §2 and §3.</li>
            <li>• Add a comparative sentence about Kenyan studies.</li>
            <li>• Standardise citation format across §4.</li>
          </ul>
        </Panel>
      </div>
    </aside>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SectionRenderer({ active, onLocked, completed, onToggle }: { active: SectionKey; onLocked: () => void; completed: Set<SectionKey>; onToggle: (k: SectionKey) => void }) {
  const withTracker = (node: React.ReactNode) => (
    <div className="space-y-4">
      {active !== "export" && <SectionStatusBar sectionKey={active} completed={completed.has(active)} onToggle={() => onToggle(active)} />}
      {node}
    </div>
  );
  switch (active) {
    case "project": return withTracker(<ProjectInfo />);
    case "guide": return withTracker(<LecturerGuide />);
    case "analysis": return withTracker(<AIAnalysis />);
    case "cover": return withTracker(<CoverPage />);
    case "outline": return withTracker(<Outline />);
    case "introduction": return withTracker(<DocSection title="1.0 Introduction" paragraphs={sections.introduction} />);
    case "literature": return withTracker(<DocSection title="2.0 Literature Review" paragraphs={sections.literature} />);
    case "methodology": return withTracker(<DocSection title="3.0 Methodology" paragraphs={sections.methodology} />);
    case "results": return withTracker(<DocSection title={`4.0 Results\n4.1 ${demoProject.resultsSubtopic}`} paragraphs={sections.results} />);
    case "discussion": return withTracker(<DocSection title={`5.0 Discussion\n5.1 ${demoProject.discussionSubtopic}`} paragraphs={sections.discussion} />);
    case "conclusion": return withTracker(<DocSection title="6.0 Conclusion" paragraphs={sections.conclusion} />);
    case "references": return withTracker(<References />);
    case "export": return <ExportView onLocked={onLocked} />;
  }
}

function SectionStatusBar({ sectionKey, completed, onToggle }: { sectionKey: SectionKey; completed: boolean; onToggle: () => void }) {
  const label = navItems.find((i) => i.key === sectionKey)?.label ?? "";
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        {completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground/60" />}
        <span className="text-muted-foreground">
          {label} · <span className={completed ? "text-primary font-medium" : "text-foreground"}>{completed ? "Marked complete" : "In progress"}</span>
        </span>
      </div>
      <button
        onClick={onToggle}
        className={`text-xs font-medium rounded-lg px-3 py-1.5 transition ${
          completed ? "text-muted-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:brightness-110"
        }`}
      >
        {completed ? "Mark incomplete" : "Mark complete"}
      </button>
    </div>
  );
}

function ProjectInfo() {
  const rows = [
    ["Research topic", demoProject.topic],
    ["Main topic", demoProject.mainTopic],
    ["Course", `${demoProject.courseCode} — ${demoProject.courseTitle}`],
    ["Lecturer", demoProject.lecturer],
    ["Institution", demoProject.institution],
    ["Faculty", demoProject.faculty],
    ["Department", demoProject.department],
    ["Academic level", demoProject.academicLevel],
    ["Group name", demoProject.groupName],
  ];
  return (
    <PageWrap eyebrow="Setup" title="Project information">
      <div className="rounded-2xl border bg-card divide-y">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[180px_1fr] gap-4 px-5 py-3 text-sm">
            <div className="text-muted-foreground">{k}</div>
            <div className="font-medium">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <div className="text-sm font-medium">Group members</div>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">Name</th><th className="py-2">Matric number</th></tr>
          </thead>
          <tbody>
            {demoProject.members.map((m) => (
              <tr key={m.matric} className="border-t"><td className="py-2">{m.name}</td><td className="py-2 text-muted-foreground">{m.matric}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

function LecturerGuide() {
  return (
    <PageWrap eyebrow="Setup" title="Lecturer guide">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <ShieldCheck className="h-4 w-4" /> Mandatory rules from your lecturer
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{demoProject.lecturerInstructions}</p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[
            "Times New Roman, size 12",
            "1-inch margins on all sides",
            "Body must not exceed 8 pages",
            "Cover page + references in addition",
            "At least three African authors",
            "British spelling throughout",
          ].map((r) => (
            <li key={r} className="flex items-start gap-2 rounded-lg border bg-surface p-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </PageWrap>
  );
}

function AIAnalysis() {
  return (
    <PageWrap eyebrow="Setup" title="AI analysis">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { t: "Topic scope", d: "Well-defined, empirically tractable within an 8-page limit." },
          { t: "Discipline fit", d: "Social sciences — education & psychology literature applies." },
          { t: "Suggested method", d: "Mixed-methods survey + interviews at a single institution." },
          { t: "Citation depth", d: "Aim for 6–8 sources with at least 3 African authors." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border bg-card p-5">
            <div className="text-sm font-medium">{c.t}</div>
            <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>
    </PageWrap>
  );
}

function CoverPage() {
  return (
    <PageWrap eyebrow="Document" title="Cover page" description="Preview matches the exported Word document.">
      <div className="doc-page">
        <div className="text-center uppercase font-bold" style={{ fontSize: "14pt" }}>{demoProject.institution}</div>
        <div className="text-center mt-1" style={{ fontSize: "12pt" }}>{demoProject.faculty}</div>
        <div className="text-center" style={{ fontSize: "12pt" }}>{demoProject.department}</div>

        <div className="text-center mt-16 font-bold uppercase" style={{ fontSize: "13pt" }}>Topic</div>
        <div className="text-center mt-2 font-bold" style={{ fontSize: "13pt" }}>{demoProject.topic}</div>

        <div className="text-center mt-14" style={{ fontSize: "12pt" }}>
          <div>Course Code: <span className="font-semibold">{demoProject.courseCode}</span></div>
          <div className="mt-1">Course Title: <span className="font-semibold">{demoProject.courseTitle}</span></div>
          <div className="mt-1">Lecturer: <span className="font-semibold">{demoProject.lecturer}</span></div>
          <div className="mt-1">Group: <span className="font-semibold">{demoProject.groupName}</span></div>
        </div>

        <div className="mt-14">
          <div className="text-center font-semibold" style={{ fontSize: "12pt" }}>Group Members</div>
          <table className="mt-3 w-full border-collapse" style={{ fontSize: "12pt" }}>
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-left">S/N</th>
                <th className="border border-black px-2 py-1 text-left">Name</th>
                <th className="border border-black px-2 py-1 text-left">Matric Number</th>
              </tr>
            </thead>
            <tbody>
              {demoProject.members.map((m, i) => (
                <tr key={m.matric}>
                  <td className="border border-black px-2 py-1">{i + 1}</td>
                  <td className="border border-black px-2 py-1">{m.name}</td>
                  <td className="border border-black px-2 py-1">{m.matric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-14 italic" style={{ fontSize: "12pt" }}>
          {demoProject.submissionLine}
        </div>
        <div className="text-center mt-8 font-semibold" style={{ fontSize: "12pt" }}>{demoProject.date}</div>
      </div>
    </PageWrap>
  );
}

function Outline() {
  return (
    <PageWrap eyebrow="Document" title="Outline">
      <div className="doc-page">
        <div className="font-bold text-center" style={{ fontSize: "13pt" }}>TABLE OF CONTENTS</div>
        <div className="mt-6 space-y-2" style={{ fontSize: "12pt" }}>
          {sections.outline.map((o) => (
            <div key={o.n} className="flex justify-between border-b border-dotted border-neutral-400 pb-1">
              <span><span className="font-semibold mr-3">{o.n}</span>{o.t}</span>
              <span className="text-neutral-500">—</span>
            </div>
          ))}
        </div>
      </div>
    </PageWrap>
  );
}

function DocSection({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  const lines = title.split("\n");
  return (
    <PageWrap eyebrow="Document" title={lines[0]}>
      <div className="doc-page">
        {lines.map((l, i) => (
          <div key={i} className={i === 0 ? "font-bold" : "font-semibold mt-4"} style={{ fontSize: i === 0 ? "13pt" : "12pt" }}>{l}</div>
        ))}
        <div className="mt-4 space-y-3 text-justify">
          {paragraphs.map((p, i) => <p key={i} style={{ textIndent: "0.5in" }}>{p}</p>)}
        </div>
      </div>
    </PageWrap>
  );
}

function References() {
  return (
    <PageWrap eyebrow="Document" title="7.0 References">
      <div className="doc-page">
        <div className="font-bold" style={{ fontSize: "13pt" }}>REFERENCES</div>
        <ul className="mt-4 space-y-3" style={{ fontSize: "12pt" }}>
          {sections.references.map((r, i) => (
            <li key={i} className="pl-8 -indent-8">{r}</li>
          ))}
        </ul>
      </div>
    </PageWrap>
  );
}

function ExportView({ onLocked }: { onLocked: () => void }) {
  const [busy, setBusy] = useState<null | "docx" | "pdf">(null);

  const handleDownload = async (kind: "docx" | "pdf") => {
    setBusy(kind);
    try {
      const res = await fetch(`/api/export/${kind}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GNS102-Term-Paper.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Could not generate the file. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const cards: { kind: "docx" | "pdf"; title: string; desc: string }[] = [
    { kind: "docx", title: "Microsoft Word (.docx)", desc: "Editable, Times New Roman 12, 1-inch margins, cover page with group members table." },
    { kind: "pdf", title: "PDF", desc: "Submission-ready, pixel-perfect layout for printing or upload." },
  ];

  return (
    <PageWrap eyebrow="Finish" title="Export your paper">
      <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 text-sm flex items-start gap-3 mb-5">
        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <div className="font-medium">Demo export enabled</div>
          <p className="text-muted-foreground mt-0.5">Try the real export using this demo project — the file follows the exact GNS 102 template.</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.kind} className="rounded-2xl border bg-card p-6">
            <FileText className="h-6 w-6 text-primary" />
            <div className="mt-3 font-semibold">{c.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <button
              onClick={() => handleDownload(c.kind)}
              disabled={busy !== null}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm hover:brightness-110 disabled:opacity-60"
            >
              {busy === c.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy === c.kind ? "Preparing..." : "Download"}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">Want to export your own topic?</div>
            <p className="text-muted-foreground mt-1">Unlock a Project Pass to create and export a term paper for your group.</p>
          </div>
          <button onClick={onLocked} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm hover:brightness-110 whitespace-nowrap">
            Unlock ₦3,500
          </button>
        </div>
      </div>
    </PageWrap>
  );
}

function PageWrap({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-xs uppercase tracking-widest text-primary font-medium">{eyebrow}</div>
      <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function PurchaseModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/paystack/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, amount: 3500 }),
      });
      const data = (await res.json()) as { authorization_url?: string; error?: string };
      if (!res.ok || !data.authorization_url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="font-semibold">Unlock your project</div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-semibold">Get your Project Pass</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          One-time payment for one active term paper project. Unlimited edits, regeneration and Word / PDF export for{" "}
          <span className="font-semibold text-foreground">₦3,500</span>.
        </p>
        <label className="mt-5 block text-xs font-medium text-muted-foreground">Email for receipt</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <button
          onClick={startCheckout}
          disabled={loading}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:brightness-110 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Redirecting to Paystack..." : "Pay ₦3,500 with Paystack"}
        </button>
        <div className="mt-3 text-center">
          <Link to="/pricing" className="text-xs text-muted-foreground hover:text-primary">See full pricing details</Link>
        </div>
      </div>
    </div>
  );
}
