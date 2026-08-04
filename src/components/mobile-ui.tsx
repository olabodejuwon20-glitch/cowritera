/**
 * Mobile UI kit — the native-feeling building blocks every screen uses:
 * action sheets, floating action buttons, sticky action bars, segmented
 * controls and list rows. All of them respect device safe areas and use
 * haptics on tap.
 */
import { Drawer } from "vaul";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/native";

export { BottomSheet, SideDrawer } from "@/components/sheets";

/* ---------------------------------------------------------------- */
/* Buttons                                                           */
/* ---------------------------------------------------------------- */

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export function AppButton({
  children,
  onClick,
  icon: Icon,
  variant = "primary",
  size = "md",
  block,
  disabled,
  loading,
  type = "button",
  className,
}: {
  children?: ReactNode;
  onClick?: () => void;
  icon?: Icon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={() => {
        void haptic("light");
        onClick?.();
      }}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-medium transition-transform duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55",
        size === "sm" && "min-h-10 px-3.5 text-[13px]",
        size === "md" && "min-h-12 px-5 text-sm",
        size === "lg" && "min-h-14 px-6 text-[15px]",
        block && "w-full",
        variant === "primary" && "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]",
        variant === "secondary" && "border bg-card text-foreground",
        variant === "ghost" && "text-foreground/80",
        variant === "danger" && "bg-destructive text-destructive-foreground",
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
    </button>
  );
}

/** Floating action button pinned above the bottom tab bar. */
export function Fab({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={() => {
        void haptic("medium");
        onClick();
      }}
      className={cn(
        "fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform active:scale-90",
        "bottom-[calc(6rem+env(safe-area-inset-bottom))] md:bottom-8",
        className,
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={2.4} />
    </button>
  );
}

/** Sticky bottom bar for primary form actions — sits above the tab bar. */
export function StickyActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 -mx-4 mt-6 border-t bg-card/90 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8",
        "pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Action sheet                                                      */
/* ---------------------------------------------------------------- */

export type SheetAction = {
  label: string;
  icon?: Icon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
};

export function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  actions,
  cancelLabel = "Cancel",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  actions: SheetAction[];
  cancelLabel?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] outline-none">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-elegant)]">
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-muted-foreground/25" />
            {(title || description) && (
              <div className="px-5 pb-3 pt-3 text-center">
                {title && <Drawer.Title className="text-sm font-semibold">{title}</Drawer.Title>}
                {description && (
                  <Drawer.Description className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                  </Drawer.Description>
                )}
              </div>
            )}
            <div className="divide-y border-t">
              {actions.map((a) => (
                <button
                  key={a.label}
                  disabled={a.disabled}
                  onClick={() => {
                    void haptic("light");
                    onOpenChange(false);
                    a.onSelect();
                  }}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 px-5 text-left text-[15px] transition active:bg-primary-soft/70 disabled:opacity-50",
                    a.destructive ? "text-destructive" : "text-foreground",
                  )}
                >
                  {a.icon && <a.icon className="h-[18px] w-[18px] shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{a.label}</span>
                    {a.hint && <span className="block truncate text-xs text-muted-foreground">{a.hint}</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="mt-2 min-h-14 w-full rounded-3xl border bg-card text-[15px] font-semibold transition active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* ---------------------------------------------------------------- */
/* Segmented control                                                 */
/* ---------------------------------------------------------------- */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-2xl bg-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => {
            void haptic("light");
            onChange(o.value);
          }}
          className={cn(
            "min-h-10 flex-1 rounded-xl px-3 text-[13px] font-medium transition",
            value === o.value ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Settings-style list rows                                          */
/* ---------------------------------------------------------------- */

export function ListGroup({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div>
      {title && (
        <div className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </div>
      )}
      <div className="divide-y overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-soft)]">{children}</div>
    </div>
  );
}

export function ListRow({
  icon: Icon,
  label,
  value,
  onClick,
  trailing,
  destructive,
}: {
  icon?: Icon;
  label: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
}) {
  const inner = (
    <>
      {Icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", destructive && "text-destructive")}>{label}</span>
        {value && <span className="block truncate text-xs text-muted-foreground">{value}</span>}
      </span>
      {trailing}
    </>
  );
  if (!onClick) return <div className="flex min-h-14 items-center gap-3 px-4">{inner}</div>;
  return (
    <button
      onClick={() => {
        void haptic("light");
        onClick();
      }}
      className="flex min-h-14 w-full items-center gap-3 px-4 text-left transition active:bg-primary-soft/60"
    >
      {inner}
    </button>
  );
}

/** True once mounted in the browser — for client-only mobile affordances. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
