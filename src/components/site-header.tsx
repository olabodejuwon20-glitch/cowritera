
import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Menu, X, LogOut, Shield } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSession, signOut } from "@/lib/auth";
import { amIAdmin } from "@/lib/admin.functions";

const nav = [
  { to: "/", label: "Home" },
  { to: "/demo", label: "Interactive Demo" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const navigate = useNavigate();
  const amIAdminFn = useServerFn(amIAdmin);
  const { data: adminData } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => amIAdminFn(),
    enabled: !!user,
  });
  const isAdmin = !!adminData?.admin;
  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }
  return (
    <>
    <header className="sticky top-0 z-40 w-full glass">

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)] group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">
            Co-Research <span className="gradient-text">AI</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 text-sm text-muted-foreground rounded-lg hover:text-foreground hover:bg-primary-soft transition-colors"
              activeProps={{ className: "px-3 py-2 text-sm rounded-lg text-foreground bg-primary-soft" }}
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
              {isAdmin && (
                <Link to={"/admin" as any} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-primary hover:text-primary/80">
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Link>
              )}
              <button onClick={handleSignOut} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm hover:bg-primary-soft">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Log in</Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] hover:brightness-110 transition"
              >
                Get started
              </Link>
            </>
          )}
        </div>
        <button
          className="md:hidden p-2 rounded-lg hover:bg-primary-soft"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="px-3 py-2 rounded-lg hover:bg-primary-soft" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {user ? (
                <>
                  <Link to="/dashboard" className="flex-1 text-center px-3 py-2 rounded-lg border" onClick={() => setOpen(false)}>Dashboard</Link>
                  <button onClick={() => { setOpen(false); void handleSignOut(); }} className="flex-1 text-center px-3 py-2 rounded-lg bg-primary text-primary-foreground">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1 text-center px-3 py-2 rounded-lg border" onClick={() => setOpen(false)}>Log in</Link>
                  <Link to="/register" className="flex-1 text-center px-3 py-2 rounded-lg bg-primary text-primary-foreground" onClick={() => setOpen(false)}>Get started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="font-semibold">Co-Research AI</span>
          </div>
          <p className="mt-3 text-muted-foreground">
            AI academic co-pilot for lecturer-compliant term papers.
          </p>
        </div>
        <div>
          <h4 className="font-medium mb-3">Product</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/demo" className="hover:text-foreground">Interactive Demo</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-3">Account</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Log in</Link></li>
            <li><Link to="/register" className="hover:text-foreground">Register</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-3">Legal</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li>Terms of Service</li>
            <li>Privacy Policy</li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Co-Research AI. Built for students.
      </div>
    </footer>
  );
}
