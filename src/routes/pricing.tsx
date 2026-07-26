import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Co-Research AI" },
      { name: "description", content: "One-time ₦3,500 Project Pass. Unlimited edits, unlimited regeneration, Word & PDF export. Free interactive demo." },
      { property: "og:title", content: "Pricing — Co-Research AI" },
      { property: "og:description", content: "One-time Project Pass. No token limits. Unlimited edits and exports." },
    ],
  }),
  component: PricingPage,
});

const passFeatures = [
  "Create one academic project",
  "Unlimited AI generation within your project",
  "Unlimited section regeneration",
  "Unlimited edits and rewrites",
  "Unlimited formatting improvements",
  "Unlimited reference updates",
  "Lecturer guide enforcement",
  "AI suggestions and improvements",
  "Word (.docx) export",
  "PDF export",
  "Project storage through the semester",
];

const demoFeatures = [
  "Full pre-generated example project",
  "Explore every section and sidebar",
  "Preview cover page, tables and references",
  "See what a submission-ready paper looks like",
];

function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="hero-bg">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-20 pb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Project-based pricing
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-semibold">Pay once. Iterate without limits.</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              No token metering. No hidden usage caps. One flat fee for one polished, lecturer-compliant term paper.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-2">
            <PlanCard
              title="Interactive Demo"
              price="Free"
              subtitle="Explore Co-Research AI without signing up."
              features={demoFeatures}
              cta={<Link to="/demo" className="mt-8 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm hover:bg-primary-soft">Open demo <ArrowRight className="h-4 w-4" /></Link>}
            />
            <PlanCard
              highlight
              title="Project Pass"
              price="₦3,500"
              priceSuffix=" / project"
              subtitle="Everything unlimited — until your paper is ready to submit."
              features={passFeatures}
              cta={<Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm hover:brightness-110">Unlock Project Pass <ArrowRight className="h-4 w-4" /></Link>}
            />
          </div>

          <div className="mt-14 rounded-2xl border bg-surface/60 p-6 md:p-8">
            <h2 className="text-xl font-semibold">One active project per account</h2>
            <p className="mt-2 text-muted-foreground max-w-3xl">
              Your Project Pass unlocks a single academic project. You can edit, rewrite, regenerate, reformat, change
              group members and update lecturer instructions endlessly. If you need to start a completely different
              paper on a new topic, you'll unlock a new project when you're ready.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanCard(props: {
  title: string; price: string; priceSuffix?: string; subtitle: string;
  features: string[]; cta: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`relative rounded-3xl border bg-card p-8 ${props.highlight ? "border-2 border-primary shadow-[var(--shadow-elegant)]" : ""}`}>
      {props.highlight && (
        <span className="absolute -top-3 left-8 text-xs font-semibold text-primary-foreground bg-primary rounded-full px-2.5 py-1">
          Recommended
        </span>
      )}
      <div className="text-sm text-muted-foreground">{props.title}</div>
      <div className="mt-2 text-4xl font-semibold">
        {props.price}
        {props.priceSuffix && <span className="text-base font-normal text-muted-foreground">{props.priceSuffix}</span>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{props.subtitle}</p>
      <ul className="mt-6 space-y-2.5 text-sm">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /> <span>{f}</span>
          </li>
        ))}
      </ul>
      {props.cta}
    </div>
  );
}
