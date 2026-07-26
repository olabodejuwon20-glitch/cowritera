import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Co-Research AI" },
      { name: "description", content: "Answers to common questions about Co-Research AI: pricing, project limits, lecturer compliance, exports and more." },
      { property: "og:title", content: "FAQ — Co-Research AI" },
      { property: "og:description", content: "Common questions about Co-Research AI." },
    ],
  }),
  component: FAQPage,
});

const faqs = [
  { q: "What is Co-Research AI?", a: "Co-Research AI is an academic writing platform that turns your topic, group members and lecturer instructions into a properly structured, submission-ready GNS 102 term paper." },
  { q: "How is this different from ChatGPT?", a: "It's a dedicated academic workspace — not a chatbot. You get a guided project flow, section-by-section regeneration, lecturer compliance checks, cover page generation, and Word/PDF exports formatted to institutional standards." },
  { q: "How much does it cost?", a: "The interactive demo is free. Creating your own project costs ₦3,500 as a one-time Project Pass — everything inside your project is unlimited after that." },
  { q: "What does 'unlimited' really mean?", a: "You can regenerate sections, edit content, rewrite paragraphs, update references, change group members and enforce lecturer rules as many times as you like within your active project. No token counters." },
  { q: "Can I create more than one project?", a: "Each account owns one active project at a time. If you need a second paper on a new topic, you'll unlock a new Project Pass when you're ready." },
  { q: "Which paper types are supported?", a: "The first release focuses exclusively on GNS 102 term papers. Assignments, seminar papers, SIWES reports and final year projects are on the roadmap." },
  { q: "What formatting does it produce?", a: "Times New Roman, size 12, 1-inch margins on all sides. A GNS 102 cover page with topic, group members table and the required submission line. Body limited to 8 pages plus cover page and references." },
  { q: "How do lecturer instructions work?", a: "Anything your lecturer requires — required sections, page limits, wording, citation style — becomes a top-priority rule the AI must follow. Lecturer rules always override defaults." },
  { q: "What can I export?", a: "Microsoft Word (.docx) and PDF. Both preserve tables, headings, margins, numbering and references." },
  { q: "Do you store my paper?", a: "Yes, your project stays available throughout the semester so you can revisit and refine it whenever you need." },
];

function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="hero-bg">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-semibold">Frequently asked questions</h1>
            <p className="mt-4 text-lg text-muted-foreground">Everything students usually ask before their first project.</p>
          </div>
        </section>
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
          <div className="space-y-3">
            {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
          </div>
          <div className="mt-12 rounded-2xl border bg-surface/60 p-6 text-center">
            <p className="text-muted-foreground">Still have questions?</p>
            <Link to="/demo" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm hover:brightness-110">
              Try the demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left rounded-2xl border bg-card p-5 hover:bg-primary-soft/40 transition"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium">{q}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </button>
  );
}
