import { Link } from "@tanstack/react-router";
import { Plus, FileText, Archive, Cpu, Settings } from "lucide-react";

export default function QuickActions({ className = "" }: { className?: string }) {
  const actions = [
    { to: "/new", label: "New Project", icon: Plus },
    { to: "/demo", label: "Interactive Demo", icon: Cpu },
    { to: "/templates", label: "Templates", icon: Archive },
    { to: "/ai-writer", label: "AI Writer", icon: FileText },
    { to: "/resources", label: "Resources", icon: FileText },
    { to: "/validator", label: "Validator", icon: FileText },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className={`mt-4 grid grid-cols-4 gap-3 ${className}`}>
      {actions.slice(0, 4).map((a) => (
        <Link
          key={a.label}
          to={a.to as any}
          className="flex flex-col items-center justify-center rounded-2xl bg-card p-3 text-xs text-muted-foreground hover:shadow-[var(--shadow-soft)] transition"
        >
          <a.icon className="h-5 w-5 text-primary mb-2" />
          <span className="text-[12px]">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
