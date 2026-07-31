import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, FileText, ShieldCheck, Wand2, BookOpen, Download,
  ArrowRight, Check, GraduationCap, Layers, Zap,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useRedirectWhenAuthed } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Co-Research AI — Lecturer-compliant term papers, without the panic" },
      { name: "description", content: "AI academic co-pilot for Nigerian students. Generate professionally structured, lecturer-compliant GNS 102 term papers in minutes." },
      { property: "og:title", content: "Co-Research AI — Lecturer-compliant term papers, without the panic" },
      { property: "og:description", content: "AI academic co-pilot for Nigerian students. Generate professionally structured, lecturer-compliant GNS 102 term papers in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { redirecting } = useRedirectWhenAuthed("/dashboard");
  if (redirecting) return null;
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Logos />
        <Philosophy />
        <HowItWorks />
        <Features />
        <PricingTeaser />
        <FAQTeaser />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden hero-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />&nbsp;Built for Academic Excellence
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.05]">
            Write a Standard <span className="gradient-text">term paper</span>&nbsp;without the panic.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">
            Co-Research AI turns your topic, lecturer instructions and group details into a properly formatted,
            submission-ready term paper. One project pass. Unlimited iterations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-medium shadow-[var(--shadow-elegant)] hover:brightness-110 transition">
              Log in <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 rounded-xl border bg-background/70 px-5 py-3 font-medium hover:bg-primary-soft transition">
              See pricing
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Times New Roman, 12pt, 1" margins</div>
            <div className="hidden sm:flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Word & PDF export</div>
          </div>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-primary/25 to-primary-glow/20 blur-2xl" />
      <div className="relative rounded-3xl border glass shadow-[var(--shadow-elegant)] overflow-hidden">
        <div className="flex items-center gap-1.5 border-b px-4 py-2.5 bg-background/60">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          <span className="ml-3 text-xs text-muted-foreground">co-research.ai · Term Paper</span>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-0">
          <aside className="border-r bg-surface/60 p-3 text-xs space-y-1">
            {["Cover", "Outline", "Introduction", "Literature", "Methodology", "Results", "Discussion", "References"].map((s, i) => (
              <div key={s} className={`px-2 py-1.5 rounded-md ${i === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary-soft"}`}>
                {s}
              </div>
            ))}
          </aside>
          <div className="p-5 bg-background">
            <div className="text-[10px] uppercase tracking-widest text-primary font-medium">Introduction</div>
            <h3 className="mt-1 font-serif-doc text-lg font-semibold">The Influence of Parental Support on Academic Success</h3>
            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-foreground/80" style={{ fontFamily: "var(--font-serif-doc)" }}>
              <p>Parental support plays a decisive role in shaping students' academic engagement and long-term achievement outcomes across cultures…</p>
              <p>Recent studies suggest that emotional, financial and academic support jointly influence students' motivation and persistence in higher education.</p>
              <div className="h-2 rounded bg-muted w-11/12" />
              <div className="h-2 rounded bg-muted w-10/12" />
              <div className="h-2 rounded bg-muted w-9/12" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="text-[11px] px-2 py-1 rounded-md bg-primary-soft text-accent-foreground flex items-center gap-1"><Wand2 className="h-3 w-3" /> Regenerate section</div>
              <div className="text-[11px] px-2 py-1 rounded-md border flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> Lecturer compliant</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Logos() {
  const items = ["FEDERAL UNIVERSITY OF TECHNOLOGY AKURE&nbsp;", "Covenant University", "UNILAG", "OAU", "ABU Zaria", "UNN"];
  return (
    <div className="border-y bg-surface/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span>Trusted by students at</span>
        {items.map((n) => <span key={n} className="opacity-70">{n}</span>)}
      </div>
    </div>
  );
}

function Philosophy() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-primary font-medium">&nbsp;</div>
        <h2 className="mt-3 text-3xl md:text-4xl font-semibold">&nbsp;</h2>
        <p className="mt-4 text-muted-foreground text-lg">
          &nbsp;
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: Zap, title: "&nbsp;", body: "&nbsp;" },
          { icon: ShieldCheck, title: "\n", body: "&nbsp;" },
          { icon: Layers, title: "&nbsp;", body: "&nbsp;" },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border p-6 bg-card hover:shadow-[var(--shadow-soft)] transition">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: BookOpen, title: "Describe your paper", body: "Topic, lecturer, group members, course and any lecturer instructions." },
    { icon: Sparkles, title: "AI drafts the structure", body: "Cover page, outline, introduction, lit review, methodology, results, discussion, references." },
    { icon: Wand2, title: "Refine and regenerate", body: "Edit any section, ask the AI to rewrite, tighten or expand — as many times as you want." },
    { icon: Download, title: "Export & submit", body: "Download a submission-ready .docx or .pdf that respects your lecturer's rules." },
  ];
  return (
    <section className="bg-surface/60 border-y">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-primary font-medium">How it works</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold">From blank page to submission in four steps.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border bg-card p-6">
              <div className="absolute -top-3 left-6 text-xs font-semibold text-primary bg-primary-soft border rounded-full px-2 py-0.5">Step {i + 1}</div>
              <s.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const list = [
    { icon: FileText, title: "Cover page", body: "Auto-generated cover page with topic, group members table and the required submission line." },
    { icon: ShieldCheck, title: "Lecturer guide enforcement", body: "Formatting, required sections, page limits and citation rules — enforced automatically." },
    { icon: Wand2, title: "Section-level regeneration", body: "Regenerate just the Introduction or just the References — not the whole document." },
    { icon: BookOpen, title: "Academic references", body: "Structured references section with consistent citation formatting." },
    { icon: Download, title: "Export ready", body: "Word (.docx) & PDF with tables, margins, headings and numbering preserved." },
    { icon: GraduationCap, title: "Student-friendly", body: "A guided workspace that feels like Notion meets Google Docs — not a chatbot." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-28">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-primary font-medium">What's inside</div>
        <h2 className="mt-3 text-3xl md:text-4xl font-semibold">Everything you need for a proper term paper.</h2>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] transition">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="bg-surface/60 border-y">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 md:py-24 text-center">
        <div className="text-xs uppercase tracking-widest text-primary font-medium">Simple pricing</div>
        <h2 className="mt-3 text-3xl md:text-4xl font-semibold">One project. One flat fee. Zero surprises.</h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Try the platform for free with our interactive demo. When you're ready to build your own paper, unlock a
          Project Pass — a one-time payment with unlimited iteration.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 text-left">
          <div className="rounded-2xl border bg-card p-6">
            <div className="text-sm text-muted-foreground">Interactive Demo</div>
            <div className="mt-2 text-3xl font-semibold">Free</div>
            <p className="mt-2 text-sm text-muted-foreground">Explore a fully pre-generated example project — cover page, sections, references and export previews.</p>
            <Link to="/demo" className="mt-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-primary-soft">
              Open demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative rounded-2xl border-2 border-primary bg-card p-6 shadow-[var(--shadow-elegant)]">
            <span className="absolute -top-3 left-6 text-xs font-semibold text-primary-foreground bg-primary rounded-full px-2 py-0.5">Recommended</span>
            <div className="text-sm text-muted-foreground">Project Pass</div>
            <div className="mt-2 text-3xl font-semibold">₦3,500 <span className="text-base font-normal text-muted-foreground">/ project</span></div>
            <p className="mt-2 text-sm text-muted-foreground">Everything unlimited within your one academic project — until it's ready to submit.</p>
            <Link to="/pricing" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm hover:brightness-110">
              See what's included <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQTeaser() {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
      <h2 className="text-3xl md:text-4xl font-semibold">Questions?</h2>
      <p className="mt-3 text-muted-foreground">We've answered the most common ones on our FAQ page.</p>
      <Link to="/faq" className="mt-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-primary-soft">
        Read the FAQ <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl border p-10 md:p-14 text-center bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-elegant)]">
        <h2 className="text-3xl md:text-4xl font-semibold">Your next term paper starts here.</h2>
        <p className="mt-3 opacity-90 max-w-xl mx-auto">Try the interactive demo now — no signup required.</p>
        <Link to="/demo" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-background text-foreground px-5 py-3 font-medium hover:brightness-105">
          Launch demo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
