import { Plus, Trash2, Users } from "lucide-react";

export type Member = { name: string; matric: string; phone: string; role: string };

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
};

export function blankMember(): Member {
  return { name: "", matric: "", phone: "", role: "" };
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
};

export function detailsFromProject(project: Record<string, unknown>): ProjectDetails {
  const rawMembers = Array.isArray(project.members) ? (project.members as unknown[]) : [];
  const members = rawMembers
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? ""),
        matric: String(o.matric ?? ""),
        phone: String(o.phone ?? ""),
        role: String(o.role ?? ""),
      };
    })
    .filter((m) => m.name || m.matric || m.phone || m.role);
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
  };
}

export function cleanDetails(d: ProjectDetails) {
  return {
    ...d,
    members: d.members
      .map((m) => ({
        name: m.name.trim(),
        matric: m.matric.trim(),
        phone: (m.phone ?? "").trim(),
        role: (m.role ?? "").trim(),
      }))
      .filter((m) => m.name || m.matric || m.phone || m.role),
  };
}

const FIELDS: [keyof Omit<ProjectDetails, "members">, string, string][] = [
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
  const set = <K extends keyof ProjectDetails>(k: K, v: ProjectDetails[K]) =>
    onChange({ ...value, [k]: v });

  const setMember = (i: number, patch: Partial<Member>) =>
    set(
      "members",
      value.members.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    );

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
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Users className="h-4 w-4 text-primary" /> Group members (shown on the cover page)
        </div>
        <div className="mt-3 space-y-2">
          {value.members.map((m, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                value={m.name}
                onChange={(e) => setMember(i, { name: e.target.value })}
                placeholder="Full name"
                className="min-h-12 flex-1 rounded-2xl border bg-background px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={m.matric}
                onChange={(e) => setMember(i, { matric: e.target.value })}
                placeholder="Matric no."
                className="min-h-12 w-32 rounded-2xl border bg-background px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                aria-label="Remove member"
                onClick={() =>
                  set(
                    "members",
                    value.members.length > 1 ? value.members.filter((_, idx) => idx !== i) : [{ name: "", matric: "" }],
                  )
                }
                className="grid h-12 w-10 shrink-0 place-items-center rounded-2xl border text-muted-foreground active:bg-primary-soft"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set("members", [...value.members, { name: "", matric: "" }])}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm active:bg-primary-soft"
        >
          <Plus className="h-4 w-4" /> Add member
        </button>
      </div>
    </div>
  );
}
