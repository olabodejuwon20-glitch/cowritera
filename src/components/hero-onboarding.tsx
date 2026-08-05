import { Link } from "@tanstack/react-router";
import QuickActions from "@/components/quick-actions";

export default function HeroOnboarding({ firstName = "Student" }: { firstName?: string }) {
  return (
    <section className="mx-4 mt-4">
      <div className="rounded-[22px] p-5 bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow-[var(--shadow-soft)] transform-gpu transition-all animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">Welcome, {firstName} 👋</h2>
            <p className="mt-2 text-sm opacity-90">Ready to write your first lecturer-compliant term paper?</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/pricing" className="rounded-lg bg-white/95 text-purple-700 px-4 py-2 font-medium shadow-[var(--shadow-elegant)]">Unlock Project Pass</Link>
              <Link to="/demo" className="rounded-lg border border-white/30 px-4 py-2 text-white/95">View Demo</Link>
            </div>

            <div className="mt-4 rounded-lg bg-white/10 p-3 text-sm">
              <div className="font-semibold">Project Pass — ₦3,500</div>
              <div className="mt-1 opacity-90 text-xs">Unlimited editing · Word & PDF export</div>
            </div>
          </div>

          <div className="w-28 h-28 rounded-lg bg-white/10 flex items-center justify-center">
            <div className="text-3xl">🤖</div>
          </div>
        </div>
      </div>

      <QuickActions className="mt-4" />

      <section className="mt-6 rounded-2xl border bg-card p-4">
        <h3 className="font-medium">Why students use Co-Research AI</h3>
        <ul className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <li>• Lecturer compliant</li>
          <li>• AI assisted</li>
          <li>• Export to Word & PDF</li>
          <li>• Edit anytime</li>
        </ul>
      </section>
    </section>
  );
}
