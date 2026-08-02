/**
 * MobileAppLayout — the single layout used by EVERY authenticated screen.
 *
 * It owns the top app bar (menu / title / avatar), the slide-out navigation
 * drawer and the bottom tab bar, so no authenticated page implements its own
 * navigation. Screens only pass a title, optional status line, breadcrumbs and
 * header actions.
 *
 * Implementation lives in `workspace-shell.tsx`; this module is the canonical
 * entry point new screens should import from.
 */
export {
  WorkspaceShell as MobileAppLayout,
  Card,
  Breadcrumbs,
  PageTitle,
  ActionButton,
  StatusBanner,
  Skeleton,
  CardSkeleton,
} from "@/components/workspace-shell";

export type { Crumb, DocStatus } from "@/components/workspace-shell";
