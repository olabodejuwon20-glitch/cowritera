import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, Sparkles } from "lucide-react";
import { Tip } from "./index";

export const Route = createFileRoute("/_authenticated/admin/help")({
  head: () => ({ meta: [{ title: "Help — Admin" }, { name: "description", content: "Guides for administrators" }] }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Help &amp; Guidance</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you need to run Co-Research AI confidently.</p>
      </header>

      <Tip>Bookmark this page. It's the fastest way to remind yourself how the admin surface works.</Tip>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-primary" /> Quick start</div>
        <ol className="mt-3 space-y-2 text-sm list-decimal pl-5 text-muted-foreground">
          <li>Open <strong>Overview</strong> daily to check user growth, revenue and recent activity.</li>
          <li>Use <strong>Users</strong> to search accounts by name or email and see who has an active Project Pass.</li>
          <li>Use <strong>Projects</strong> to filter drafts vs. active vs. paid projects.</li>
          <li>Use <strong>Finance</strong> to verify Paystack transactions per day, week, or month.</li>
          <li>Use <strong>Coupons</strong> to generate promo codes — free unlocks or discounts.</li>
        </ol>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 font-medium"><BookOpen className="h-4 w-4 text-primary" /> Common questions</div>
        <div className="mt-3 space-y-3 text-sm">
          <Q q="How do I give a student a free Project Pass?">
            Open <em>Coupons → New coupon</em>, choose <strong>Full unlock</strong>, share the code. When they enter it inside their paper, the pass activates instantly.
          </Q>
          <Q q="How do I offer a launch discount?">
            Create a coupon of type <strong>Discount</strong>. Enter either a percent (e.g. 20) or a naira value (e.g. 500). Set <em>Max uses</em> to cap redemptions.
          </Q>
          <Q q="A payment says 'pending' — what should I do?">
            Ask the student to reopen their paper page. The app auto-verifies with Paystack when they return from checkout. Successful payments flip the paper to <em>Paid</em>.
          </Q>
          <Q q="How do I stop a coupon from being used?">
            Edit the coupon and toggle <strong>Active</strong> off. Existing redemptions are kept.
          </Q>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 font-medium"><LifeBuoy className="h-4 w-4 text-primary" /> Best practices</div>
        <ul className="mt-3 space-y-2 text-sm list-disc pl-5 text-muted-foreground">
          <li>Prefer suspending accounts over deleting them — data loss is irreversible.</li>
          <li>Always confirm coupon type and value before saving. Discounts apply per checkout.</li>
          <li>Review <em>Finance → Failed</em> weekly to catch payment gateway issues early.</li>
          <li>Keep coupon codes short and memorable (LAUNCH, STUDENT10, WELCOME).</li>
        </ul>
      </section>
    </div>
  );
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-medium">{q}</div>
      <div className="text-muted-foreground mt-1">{children}</div>
    </div>
  );
}
