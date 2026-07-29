import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Home, FileText, Plus, Compass, User, ChevronLeft, WifiOff, Download,
  Shield, LogOut, HelpCircle, Wallet, Sparkles, CloudUpload,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import { amIAdmin } from "@/lib/admin.functions";
import { useOnline, useInstallPrompt, useMounted } from "@/lib/use-pwa";
import { subscribeOutbox, tap } from "@/lib/offline";
import { getLastPaper } from "@/lib/last-paper";
import { SideDrawer } from "@/components/sheets";

/* ---------------------------------------------------------------- */
/* App bar                                                           */
/* ---------------------------------------------------------------- */

export function AppBar({
  title,
  subtitle,
  back,
  onBack,
  leading,
  actions,
  transparent,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
  onBack?: () => void;
  leading?: ReactNode;
  actions?: ReactNode;
  transparent?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <header
      className={`sticky top-0 z-30 pt-[env(safe-area-inset-top)] ${transparent ? "" : "glass border-b"}`}
    >
      <div className="mx-auto grid h-14 max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2">
        <div className="flex items-center">
          {leading}
          {back && !leading && (
            <button
              aria-label="Go back"
              onClick={() => (onBack ? onBack() : history.length > 1 ? history.back() : navigate({ to: "/" }))}
              className="grid h-11 w-11 place-items-center rounded-full active:scale-95 active:bg-primary-soft transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {!back && !leading && <span className="w-2" />}
        </div>
        <div className="min-w-0 text-center">
          <div className="truncate text-[15px] font-semibold leading-tight">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex items-center justify-end gap-1">{actions}</div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- */
/* Status strip (offline / syncing)                                  */
/* ---------------------------------------------------------------- */

function StatusStrip() {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  useEffect(() => subscribeOutbox(setPending) as unknown as () => void, []);
  if (online && pending === 0) return null;
  return (
    <div
      className={`flex items-center justify-center gap-2 px-3 py-1.5 text-[11px] font-medium ${
        online ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {online ? <CloudUpload className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {online ? `Syncing ${pending} change${pending === 1 ? "" : "s"}…` : "Offline — your edits are saved on this device"}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Bottom navigation                                                 */
/* ---------------------------------------------------------------- */

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to as never}
      onClick={() => tap()}
      className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 active:scale-95 transition-transform"
    >
      <Icon
        className={`h-[22px] w-[22px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span className={`truncate text-[10px] leading-none ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const mounted = useMounted();
  const last = mounted ? getLastPaper() : null;

  const signedIn = !!user;
  const left = signedIn
    ? [
        { to: "/dashboard", label: "Home", icon: Home, match: (p: string) => p === "/dashboard" },
        {
          to: last ? `/paper/${last.id}` : "/dashboard",
          label: "Paper",
          icon: FileText,
          match: (p: string) => p.startsWith("/paper/"),
        },
      ]
    : [
        { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
        { to: "/demo", label: "Demo", icon: Compass, match: (p: string) => p.startsWith("/demo") },
      ];

  const right = signedIn
    ? [
        { to: "/demo", label: "Demo", icon: Compass, match: (p: string) => p.startsWith("/demo") },
        { to: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") },
      ]
    : [
        { to: "/pricing", label: "Pricing", icon: Wallet, match: (p: string) => p.startsWith("/pricing") },
        { to: "/login", label: "Sign in", icon: User, match: (p: string) => p.startsWith("/login") },
      ];

  const fabTo = signedIn ? "/new" : "/register";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-3xl px-3 pb-2">
        <div className="relative grid h-16 grid-cols-5 items-center rounded-[26px] border bg-card/90 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          {left.map((n) => (
            <NavItem key={n.label} to={n.to} label={n.label} icon={n.icon} active={n.match(path)} />
          ))}
          <div className="relative h-full">
            <Link
              to={fabTo as never}
              onClick={() => tap(12)}
              aria-label="New paper"
              className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] active:scale-90 transition-transform"
            >
              <Plus className="h-6 w-6" strokeWidth={2.6} />
            </Link>
          </div>
          {right.map((n) => (
            <NavItem key={n.label} to={n.to} label={n.label} icon={n.icon} active={n.match(path)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- */
/* Menu drawer                                                       */
/* ---------------------------------------------------------------- */

export function MenuDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const adminFn = useServerFn(amIAdmin);
  const { data } = useQuery({ queryKey: ["is-admin"], queryFn: () => adminFn(), enabled: !!user });
  const isAdmin = !!data?.admin;
  const { canInstall, install } = useInstallPrompt();

  const items: { to: string; label: string; icon: typeof Home }[] = user
    ? [
        { to: "/dashboard", label: "My papers", icon: FileText },
        { to: "/new", label: "New paper", icon: Plus },
        { to: "/demo", label: "Interactive demo", icon: Compass },
        { to: "/pricing", label: "Pricing", icon: Wallet },
        { to: "/faq", label: "Help & FAQ", icon: HelpCircle },
        { to: "/account", label: "Account", icon: User },
      ]
    : [
        { to: "/", label: "Home", icon: Home },
        { to: "/demo", label: "Interactive demo", icon: Compass },
        { to: "/pricing", label: "Pricing", icon: Wallet },
        { to: "/faq", label: "Help & FAQ", icon: HelpCircle },
        { to: "/login", label: "Log in", icon: User },
      ];

  return (
    <SideDrawer open={open} onOpenChange={onOpenChange} title="Co-Research AI">
      <div className="space-y-1">
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to as never}
            onClick={() => onOpenChange(false)}
            className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm active:bg-primary-soft"
          >
            <i.icon className="h-[18px] w-[18px] text-muted-foreground" />
            {i.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            to={"/admin" as never}
            onClick={() => onOpenChange(false)}
            className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm text-primary active:bg-primary-soft"
          >
            <Shield className="h-[18px] w-[18px]" /> Admin panel
          </Link>
        )}
      </div>

      {canInstall && (
        <button
          onClick={() => void install()}
          className="mt-4 flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-sm font-medium text-primary-foreground active:scale-[0.98] transition"
        >
          <Download className="h-4 w-4" /> Install app
        </button>
      )}

      {user && (
        <button
          onClick={async () => {
            onOpenChange(false);
            await signOut();
            navigate({ to: "/" });
          }}
          className="mt-2 flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm active:bg-primary-soft"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      )}

      <p className="mt-6 px-3 text-[11px] leading-relaxed text-muted-foreground">
        <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
        Add Co-Research to your home screen for a full-screen, app-like experience.
      </p>
    </SideDrawer>
  );
}

/* ---------------------------------------------------------------- */
/* Shell                                                             */
/* ---------------------------------------------------------------- */

export function AppShell({
  children,
  appBar,
  bottomNav = true,
  scroll = true,
  className = "",
}: {
  children: ReactNode;
  appBar?: ReactNode;
  bottomNav?: boolean;
  scroll?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {appBar}
      <StatusStrip />
      <main
        className={`flex-1 ${scroll ? "overflow-y-auto overscroll-y-contain" : "overflow-hidden"} ${
          bottomNav ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : "pb-[env(safe-area-inset-bottom)]"
        } ${className}`}
      >
        <div className="page-enter mx-auto w-full max-w-3xl">{children}</div>
      </main>
      {bottomNav && <BottomNav />}
    </div>
  );
}
