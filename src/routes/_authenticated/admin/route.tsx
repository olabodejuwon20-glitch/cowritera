import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/admin.functions";
import { SiteHeader } from "@/components/site-header";
import { LayoutDashboard, Users, FolderKanban, Wallet, Ticket, HelpCircle, Loader2, ShieldAlert } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/finance", label: "Finance", icon: Wallet },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/help", label: "Help", icon: HelpCircle },
];

function AdminLayout() {
  const fn = useServerFn(amIAdmin);
  const { data, isLoading, error } = useQuery({ queryKey: ["is-admin"], queryFn: () => fn() });
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isLoading && data && !data.admin) navigate({ to: "/dashboard" });
  }, [isLoading, data, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }
  if (error || !data?.admin) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 grid place-items-center px-4 text-center">
          <div className="max-w-md">
            <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/60" />
            <h1 className="mt-3 text-xl font-semibold">Admin only</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You don't have admin access on this account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface/40">
      <SiteHeader />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start rounded-2xl border bg-card p-2">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Admin</div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {NAV.map((n) => {
              const active = n.exact ? location === n.to : location.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to as any}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-primary-soft text-foreground/80"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
