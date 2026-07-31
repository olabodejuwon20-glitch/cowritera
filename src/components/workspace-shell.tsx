import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Home, FolderKanban, FileText, Sparkles, LayoutTemplate, Compass, Wallet,
  HelpCircle, Settings, LogOut, Shield, Plus, PanelLeftClose, PanelLeft,
  Menu, Bell, ChevronRight, ChevronLeft, WifiOff, CloudUpload, GraduationCap,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import { amIAdmin } from "@/lib/admin.functions";
import { subscribeOutbox, tap } from "@/lib/offline";
import { useOnline } from "@/lib/use-pwa";
import { SideDrawer } from "@/components/sheets";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared surface primitives                                           */
/* ------------------------------------------------------------------ */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]", className)}>
      {children}
    </div>
  );
}

export type Crumb = { label: string; to?: string; onClick?: () => void };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="no-scrollbar flex items-center gap-1 overflow-x-auto text-sm">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        const cls = last
          ? "shrink-0 max-w-[16rem] truncate text-muted-foreground"
          : "shrink-0 max-w-[14rem] truncate text-primary hover:underline";
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
            {last || (!c.to && !c.onClick) ? (
              <span className={cls}>{c.label}</span>
            ) : c.to ? (
              <Link to={c.to as never} className={cls}>{c.label}</Link>
            ) : (
              <button onClick={c.onClick} className={cls}>{c.label}</button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export type DocStatus = "complete" | "draft" | "review" | "generating" | "locked";

const STATUS_STYLES: Record<DocStatus, { label: string; cls: string }> = {
  complete: { label: "Completed", cls: "border-primary/30 bg-primary-soft text-primary" },
  draft: { label: "Draft", cls: "border-border bg-surface text-muted-foreground" },
  review: { label: "Needs review", cls: "border-amber-300/60 bg-amber-50/70 text-amber-700" },
  generating: { label: "Generating…", cls: "border-primary/30 bg-primary-soft text-primary" },
  locked: { label: "Locked", cls: "border-amber-300/60 bg-amber-50/70 text-amber-700" },
};

export function StatusBanner({
  status, title, hint, action,
}: { status: DocStatus; title?: string; hint?: string; action?: ReactNode }) {
  const s = STATUS_STYLES[status];
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm", s.cls)}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current/30">
        <span className="h-2 w-2 rounded-full bg-current" />
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{title ?? s.label}</span>
        {title && <span className="opacity-70"> · {s.label}</span>}
        {hint && <span className="ml-2 hidden opacity-70 sm:inline">{hint}</span>}
      </span>
      {action}
    </div>
  );
}

export function PageTitle({
  eyebrow, title, description, actions,
}: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</div>
        )}
        <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

export function ActionButton({
  icon: Icon, children, onClick, variant = "ghost", disabled, title,
}: {
  icon?: typeof Home; children?: ReactNode; onClick?: () => void;
  variant?: "ghost" | "primary"; disabled?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60",
        variant === "primary"
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:brightness-110"
          : "border bg-card hover:bg-primary-soft",
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar navigation model                                            */
/* ------------------------------------------------------------------ */

type NavLink = { to: string; label: string; icon: typeof Home; exact?: boolean };
type NavGroup = { title: string; items: NavLink[] };

const GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: Home, exact: true },
      { to: "/dashboard", label: "My Projects", icon: FolderKanban },
      { to: "/new", label: "New Project", icon: Plus },
      { to: "/demo", label: "Templates", icon: LayoutTemplate },
      { to: "/faq", label: "FAQ", icon: HelpCircle },
    ],
  },
  {
    title: "System",
    items: [{ to: "/account", label: "Settings", icon: Settings }],
  },
];


function useIsAdmin() {
  const { user } = useSession();
  const adminFn = useServerFn(amIAdmin);
  const { data } = useQuery({ queryKey: ["is-admin"], queryFn: () => adminFn(), enabled: !!user });
  return !!data?.admin;
}

function SidebarBody({
  collapsed, onNavigate,
}: { collapsed: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  const groups: NavGroup[] = isAdmin
    ? [
        GROUPS[0],
        { title: "Admin", items: [{ to: "/admin", label: "Admin panel", icon: Shield }] },
        GROUPS[1],
      ]
    : GROUPS;


  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 px-3 py-4", collapsed && "justify-center px-2")}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
          <GraduationCap className="h-5 w-5" />
        </span>
        {!collapsed && (
          <span className="truncate text-[15px] font-semibold tracking-tight">
            Co-Research <span className="gradient-text">AI</span>
          </span>
        )}
      </div>

      <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        {groups.map((g) => (
          <div key={g.title}>
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {g.title}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.map((i) => {
                const active = i.exact ? path === i.to : path.startsWith(i.to) && i.to !== "/dashboard";
                return (
                  <Link
                    key={`${g.title}-${i.label}`}
                    to={i.to as never}
                    onClick={() => { tap(); onNavigate?.(); }}
                    title={collapsed ? i.label : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm transition",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-primary-soft font-medium text-primary"
                        : "text-foreground/80 hover:bg-primary-soft/60",
                    )}
                  >
                    <i.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{i.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-2">
        <Link
          to={"/account" as never}
          onClick={() => onNavigate?.()}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-2xl px-2 hover:bg-primary-soft/60",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {initials}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{user?.email ?? "Account"}</span>
              <span className="block text-[11px] text-muted-foreground">Profile</span>
            </span>
          )}
        </Link>
        <button
          onClick={async () => { tap(); await signOut(); navigate({ to: "/" }); }}
          title={collapsed ? "Log out" : undefined}
          className={cn(
            "mt-1 flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm text-muted-foreground hover:bg-primary-soft/60",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Log out"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status strip                                                        */
/* ------------------------------------------------------------------ */

function StatusStrip() {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  useEffect(() => subscribeOutbox(setPending) as unknown as () => void, []);
  if (online && pending === 0) return null;
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-medium",
        online ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {online ? <CloudUpload className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {online ? `Syncing ${pending} change${pending === 1 ? "" : "s"}…` : "Offline — your edits are saved on this device"}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton loaders                                                    */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mt-4 h-4 w-11/12" />
      <Skeleton className="mt-2 h-4 w-7/12" />
      <Skeleton className="mt-5 h-3 w-24" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom navigation (mobile)                                          */
/* ------------------------------------------------------------------ */

const TABS: { to: string; label: string; icon: typeof Home; match: (p: string) => boolean }[] = [
  { to: "/dashboard", label: "Home", icon: Home, match: (p) => p === "/dashboard" },
  { to: "/demo", label: "Explore", icon: Compass, match: (p) => p.startsWith("/demo") },
  { to: "/faq", label: "Help", icon: HelpCircle, match: (p) => p.startsWith("/faq") },
  { to: "/account", label: "You", icon: Settings, match: (p) => p.startsWith("/account") },
];

function BottomTabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="px-3 pb-2">
        <div className="relative grid h-16 grid-cols-5 items-center rounded-[26px] border bg-card/90 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.label} {...t} active={t.match(path)} />
          ))}
          <div className="relative h-full">
            <Link
              to={"/new" as never}
              aria-label="New project"
              onClick={() => tap(12)}
              className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform active:scale-90"
            >
              <Plus className="h-6 w-6" strokeWidth={2.6} />
            </Link>
          </div>
          {TABS.slice(2).map((t) => (
            <Tab key={t.label} {...t} active={t.match(path)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function Tab({
  to, label, icon: Icon, active,
}: { to: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link
      to={to as never}
      onClick={() => tap()}
      className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 transition-transform active:scale-95"
    >
      <Icon
        className={cn("h-[22px] w-[22px] transition-colors", active ? "text-primary" : "text-muted-foreground")}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span className={cn("truncate text-[10px] leading-none", active ? "font-semibold text-primary" : "text-muted-foreground")}>
        {label}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function WorkspaceShell({
  title,
  status,
  breadcrumbs,
  headerActions,
  children,
  fill = false,
  wide = false,
  focus = false,
}: {
  title: ReactNode;
  status?: ReactNode;
  breadcrumbs?: Crumb[];
  headerActions?: ReactNode;
  children: ReactNode;
  /** true = content area manages its own scroll (document workspace) */
  fill?: boolean;
  wide?: boolean;
  /** Focus Mode: hides the bottom tab bar and chrome for the document workspace */
  focus?: boolean;
}) {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useSession();
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  useEffect(() => {
    setCollapsed(localStorage.getItem("cr-sidebar-collapsed") === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("cr-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-surface/50">
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-card transition-[width] duration-200 md:block",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/* Mobile slide-out drawer (swipe-to-dismiss) */}
      <SideDrawer open={drawer} onOpenChange={setDrawer}>
        <SidebarBody collapsed={false} onNavigate={() => setDrawer(false)} />
      </SideDrawer>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 shrink-0 border-b bg-card/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 sm:h-16 sm:gap-3 sm:px-5">
            <div className="flex items-center gap-1">
              {focus ? (
                <Link
                  to={"/dashboard" as never}
                  aria-label="Back to projects"
                  onClick={() => tap()}
                  className="grid h-11 w-11 place-items-center rounded-2xl transition active:scale-95 active:bg-primary-soft md:hidden"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  aria-label="Open navigation"
                  onClick={() => { tap(); setDrawer(true); }}
                  className="grid h-11 w-11 place-items-center rounded-2xl transition active:scale-95 active:bg-primary-soft md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <button
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={toggleCollapsed}
                className="hidden h-11 w-11 place-items-center rounded-2xl hover:bg-primary-soft md:grid"
              >
                {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
            </div>

            <div className={cn("min-w-0", focus && "text-center md:text-left")}>
              <div className="truncate text-[15px] font-semibold leading-tight sm:text-base">{title}</div>
              {status && <div className="truncate text-[11px] text-muted-foreground">{status}</div>}
            </div>

            <div className="flex items-center gap-1">
              {headerActions}
              {!focus && (
                <button
                  aria-label="Notifications"
                  className="relative hidden h-11 w-11 place-items-center rounded-2xl hover:bg-primary-soft sm:grid"
                >
                  <Bell className="h-5 w-5" />
                </button>
              )}
              {!focus && (
                <Link
                  to={"/account" as never}
                  aria-label="Profile"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
                >
                  {initials}
                </Link>
              )}
            </div>
          </div>
          <StatusStrip />
        </header>

        {fill ? (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
        ) : (
          <main className="flex-1 overflow-y-auto overscroll-y-contain">
            <div
              className={cn(
                "page-enter mx-auto w-full px-4 py-6 sm:px-8 sm:py-8",
                wide ? "max-w-7xl" : "max-w-5xl",
                !focus && "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8",
              )}
            >
              {breadcrumbs && (
                <div className="mb-4 hidden sm:block">
                  <Breadcrumbs items={breadcrumbs} />
                </div>
              )}
              <div className="space-y-6">{children}</div>
            </div>
          </main>
        )}
      </div>

      {!focus && <BottomTabBar />}
    </div>
  );
}


export { FileText };
