import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — Co-Research AI" },
      { name: "description", content: "Register for Co-Research AI and unlock your first lecturer-compliant term paper project." },
      { property: "og:title", content: "Create your account — Co-Research AI" },
      { property: "og:description", content: "Register for Co-Research AI." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 hero-bg flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-semibold">Get started</span>
          </div>
          <h1 className="mt-6 text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign up to purchase your Project Pass and start writing.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Field label="Full name" placeholder="Chinedu Okoro" />
            <Field label="Email" type="email" placeholder="you@university.edu.ng" />
            <Field label="Password" type="password" placeholder="At least 8 characters" />
            <button type="submit" className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium hover:brightness-110">
              Create account
            </button>
          </form>
          <div className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="text-primary font-medium">Log in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
      />
    </label>
  );
}
