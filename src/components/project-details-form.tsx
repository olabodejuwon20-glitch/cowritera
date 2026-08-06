import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Sliders, Trash2, Users, X } from "lucide-react";
import {
  BASE_COLUMNS,
  DERIVED_KEYS,
  columnKeyFromLabel,
  normalizeColumns,
  type MemberColumn,
} from "@/lib/export-types";

export type Member = {
  name: string;
  matric: string;
  phone: string;
  role: string;
  extra?: Record<string, string>;
};

export type ProjectDetails = {
  institution: string;
  faculty: string;
  department: string;
  course_code: string;
  course_title: string;
  group_name: string;
  lecturer_name: string;
  session: string;
  submission_date: string;
  members: Member[];
  columns: MemberColumn[];
};

export function blankMember(): Member {
  return { name: "", matric: "", phone: "", role: "", extra: {} };
}

export const emptyDetails: ProjectDetails = {
  institution: "",
  faculty: "",
  department: "",
  course_code: "GNS 102",
  course_title: "",
  group_name: "",
  lecturer_name: "",
  session: "",
  submission_date: "",
  members: [blankMember()],
  columns: [...BASE_COLUMNS],
};

/** Reads/writes a member value for any column key (custom keys go in `extra`). */
export function getMemberField(m: Member, key: string): string {
  if (key === "name") return m.name ?? "";
  if (key === "matric") return m.matric ?? "";
  if (key === "phone") return m.phone ?? "";
  if (key === "role") return m.role ?? "";
  return (m.extra ?? {})[key] ?? "";
}

export function setMemberField(m: Member, key: string, value: string): Member {
  if (key === "name" || key === "matric" || key === "phone" || key === "role") {
    return { ...m, [key]: value };
  }
  return { ...m, extra: { ...(m.extra ?? {}), [key]: value } };
}

export function detailsFromProject(project: Record<string, unknown>): ProjectDetails {
  const rawMembers = Array.isArray(project.members) ? (project.members as unknown[]) : [];
  const members = rawMembers
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const extraRaw = (o.extra ?? {}) as Record<string, unknown>;
      const extra: Record<string, string> = {};
      for (const [k, v] of Object.entries(extraRaw)) extra[k] = String(v ?? "");
      return {
        name: String(o.name ?? ""),
        matric: String(o.matric ?? ""),
        phone: String(o.phone ?? ""),
        role: String(o.role ?? ""),
        extra,
      };
    })
    .filter((m) => m.name || m.matric || m.phone || m.role || Object.values(m.extra).some(Boolean));
  return {
    institution: String(project.institution ?? ""),
    faculty: String(project.faculty ?? ""),
    department: String(project.department ?? ""),
    course_code: String(project.course_code ?? "GNS 102"),
    course_title: String(project.course_title ?? ""),
    group_name: String(project.group_name ?? ""),
    lecturer_name: String(project.lecturer_name ?? ""),
    session: String(project.session ?? ""),
    submission_date: String(project.submission_date ?? ""),
    members: members.length ? members : [blankMember()],
    columns: normalizeColumns(project.columns),
  };
}

export function cleanDetails(d: ProjectDetails) {
  return {
    ...d,
    columns: normalizeColumns(d.columns),
    members: d.members
      .map((m) => {
        const extra: Record<string, string> = {};
        for (const [k, v] of Object.entries(m.extra ?? {})) {
          const value = String(v ?? "").trim();
          if (value) extra[k] = value;
        }
        return {
          name: m.name.trim(),
          matric: m.matric.trim(),
          phone: (m.phone ?? "").trim(),
          role: (m.role ?? "").trim(),
          extra,
        };
      })
      .filter((m) => m.name || m.matric || m.phone || m.role || Object.keys(m.extra).length),
  };
}

const FIELDS: [keyof Omit<ProjectDetails, "members" | "columns">, string, string][] = [
  ["institution", "Institution", "e.g. University of Lagos"],
  ["faculty", "Faculty", "e.g. Faculty of Science"],
  ["department", "Department", "e.g. Computer Science"],
  ["course_code", "Course code", "e.g. GNS 102"],
  ["course_title", "Course title", "e.g. Use of English II"],
  ["lecturer_name", "Lecturer", "e.g. Dr. A. Bello"],
  ["group_name", "Group name", "e.g. AGP 002"],
  ["session", "Academic session", "e.g. 2025/2026"],
  ["submission_date", "Submission date", "e.g. July 2026"],
];

const inputCls =
  "mt-1 min-h-12 w-full rounded-2xl border bg-background px-4 text-[15px] outline-none focus:ring-2 focus:ring-primary/40";

export function ProjectDetailsFields({
  value,
  onChange,
}: {
  value: ProjectDetails;
  onChange: (next: ProjectDetails) => void;
}) {
  const columns = normalizeColumns(value.columns);
  const [manage, setManage] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const set = <K extends keyof ProjectDetails>(k: K, v: ProjectDetails[K]) =>
    onChange({ ...value, [k]: v });

  const setMember = (i: number, key: string, v: string) =>
    set(
      "members",
      value.members.map((m, idx) => (idx === i ? setMemberField(m, key, v) : m)),
    );

  const setColumns = (next: MemberColumn[]) => set("columns", next.length ? next : [...BASE_COLUMNS]);

  const moveColumn = (i: number, dir: -1 | 1) => {
    const next = [...columns];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setColumns(next);
  };

  const addColumn = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = columnKeyFromLabel(label);
    if (columns.some((c) => c.key === key)) return;
    setColumns([...columns, { key, label: label.toUpperCase() }]);
    setNewLabel("");
  };

  // Fields typed on each member card: name is always needed (it feeds
  // SURNAME / OTHER NAMES), plus every non-derived column.
  const editableKeys = ["name", ...columns.map((c) => c.key).filter((k) => !DERIVED_KEYS.includes(k))];
  const labelFor = (key: string) =>
    key === "name" ? "Full name" : columns.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="space-y-3">
      {FIELDS.map(([k, label, ph]) => (
        <label key={k} className="block">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <input
            value={value[k]}
            onChange={(e) => set(k, e.target.value)}
            placeholder={ph}
            className={inputCls}
          />
        </label>
      ))}

      <div className="rounded-2xl border bg-surface/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Group members (cover page)</span>
          </div>
          <button
            type="button"
            onClick={() => setManage((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-[11px] font-medium active:bg-primary-soft"
          >
            <Sliders className="h-3.5 w-3.5" /> {manage ? "Done" : "Table fields"}
          </button>
        </div>

        {manage && (
          <div className="mt-3 rounded-2xl border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">
              Add, remove or reorder the columns that appear in the cover-page table.
            </p>
            <ul className="mt-2 space-y-2">
              {columns.map((c, i) => (
                <li key={c.key} className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-[13px]">{c.label}</span>
                  <button
                    type="button"
                    aria-label={`Move ${c.label} up`}
                    onClick={() => moveColumn(i, -1)}
                    disabled={i === 0}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-muted-foreground disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${c.label} down`}
                    onClick={() => moveColumn(i, 1)}
                    disabled={i === columns.length - 1}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-muted-foreground disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${c.label}`}
                    onClick={() => setColumns(columns.filter((_, idx) => idx !== i))}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-muted-foreground active:bg-primary-soft"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New field e.g. Email, Level, Dept"
                className="min-h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={addColumn}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-medium text-primary-foreground active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        )}

        {/* Mobile-first: vertically stacked member cards — never a horizontal table */}
        <div className="mt-3 space-y-3">
          {value.members.map((m, i) => (
            <div key={i} className="rounded-2xl border bg-card p-3 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Member {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Remove member ${i + 1}`}
                  onClick={() =>
                    set(
                      "members",
                      value.members.length > 1
                        ? value.members.filter((_, idx) => idx !== i)
                        : [blankMember()],
                    )
                  }
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-muted-foreground active:bg-primary-soft"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {editableKeys.map((key) => (
                  <label key={key} className="block min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">{labelFor(key)}</span>
                    <input
                      value={getMemberField(m, key)}
                      type={key === "phone" ? "tel" : key === "email" ? "email" : "text"}
                      inputMode={key === "phone" ? "tel" : undefined}
                      onChange={(e) => setMember(i, key, e.target.value)}
                      placeholder={
                        key === "name"
                          ? "Full name"
                          : key === "matric"
                            ? "e.g. AGP/01/7901"
                            : key === "phone"
                              ? "e.g. 08012345678"
                              : labelFor(key)
                      }
                      className="mt-1 min-h-12 w-full min-w-0 rounded-2xl border bg-background px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => set("members", [...value.members, blankMember()])}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border bg-card text-sm active:bg-primary-soft"
        >
          <Plus className="h-4 w-4" /> Add member
        </button>
      </div>
    </div>
  );
}
