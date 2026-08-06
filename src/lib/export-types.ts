import type { PaperDraft } from "./paper-draft";

export type ExportMember = {
  sn?: number;
  name?: string;
  surname?: string;
  otherName?: string;
  matric?: string;
  phone?: string;
  role?: string;
  extra?: Record<string, string>;
};

export type ExportCover = {
  institution?: string;
  institutionAddress?: string;
  faculty?: string;
  department?: string;
  courseCode?: string;
  courseTitle?: string;
  groupName?: string;
  lecturer?: string;
  session?: string;
  date?: string;
  members?: ExportMember[];
  resultsSubtopic?: string;
  discussionSubtopic?: string;
  columns?: MemberColumn[];
};

export type ExportInput = Partial<PaperDraft> & { cover?: ExportCover };

/** Latin-1 / WinAnsi safe text for pdf-lib standard fonts. */
export function sanitizeForPdf(input: string): string {
  const replaced = (input ?? "")
    .replace(/\u20a6/g, "NGN ")
    .replace(/[\u2018\u2019\u201a\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u2022]/g, "-")
    .replace(/[\r\n\t]+/g, " ");

  let out = "";
  for (const ch of replaced) {
    const code = ch.codePointAt(0)!;
    if (code === 32 || (code >= 33 && code <= 126)) out += ch;
    else if (code >= 160 && code <= 255) out += ch;
    else out += " ";
  }
  return out.replace(/ {2,}/g, " ").trim();
}

/** Strips characters that are illegal inside OOXML text nodes. */
export function sanitizeForDocx(input: string): string {
  // eslint-disable-next-line no-control-regex
  return (input ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

/**
 * Group number formatting for the cover page.
 * The number is always shown with a leading zero: 1 -> "01", 12 -> "012".
 * Any non-numeric prefix (e.g. "AGP") is preserved.
 */
export function formatGroupName(raw?: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const match = value.match(/^(.*?)(\d+)\s*$/);
  if (!match) return value.toUpperCase();
  const prefix = match[1].trim();
  const digits = match[2].replace(/^0+/, "") || "0";
  const label = prefix ? prefix.toUpperCase() : "GROUP";
  return `${label} 0${digits}`;
}

/** Terms of reference sentence, in the exact template wording. */
export function buildSubmissionLine(o: {
  courseCode?: string;
  courseTitle?: string;
  lecturer?: string;
  department?: string;
  institution?: string;
}): string {
  const course = [o.courseCode, o.courseTitle].filter(Boolean).join(" ").trim();
  if (!course && !o.lecturer) return "";
  const to = o.lecturer ? ` to ${o.lecturer.trim()}` : "";
  const dept = o.department ? ` of the ${o.department.trim()}` : "";
  const school = o.institution ? `, ${o.institution.trim()}` : "";
  return `A Term Paper submitted in fulfilment of the requirements for ${course}${to}${dept}${school}.`.replace(/\s+/g, " ");
}

/** "Surname, Other names" aware name splitting. */
export function splitMemberName(name: string): { surname: string; other: string } {
  const value = (name ?? "").trim();
  if (!value) return { surname: "", other: "" };
  if (value.includes(",")) {
    const [s, ...rest] = value.split(",");
    return { surname: s.trim(), other: rest.join(",").trim() };
  }
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { surname: parts[0], other: "" };
  return { surname: parts[parts.length - 1], other: parts.slice(0, -1).join(" ") };
}

/* ------------------------------------------------------------------ */
/* Members table columns (user-configurable)                           */
/* ------------------------------------------------------------------ */

export type MemberColumn = { key: string; label: string };

export const BASE_COLUMNS: MemberColumn[] = [
  { key: "surname", label: "SURNAME" },
  { key: "other", label: "OTHER NAMES" },
  { key: "matric", label: "MATRIC NO" },
  { key: "role", label: "ROLE" },
];

/** Keys derived from the member's full name — not edited directly. */
export const DERIVED_KEYS = ["surname", "other"];

export function columnKeyFromLabel(label: string): string {
  return (label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || `field_${Date.now()}`;
}

export function normalizeColumns(raw: unknown): MemberColumn[] {
  if (!Array.isArray(raw)) return [...BASE_COLUMNS];
  const cols = raw
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      const label = String(o.label ?? "").trim();
      const key = String(o.key ?? columnKeyFromLabel(label)).trim();
      return key && label ? { key, label } : null;
    })
    .filter(Boolean) as MemberColumn[];
  return cols.length ? cols : [...BASE_COLUMNS];
}

/** Resolves the printed value of a member for a given column key. */
export function memberValue(m: ExportMember, key: string): string {
  if (key === "surname" || key === "other") {
    const split =
      m.surname || m.otherName
        ? { surname: m.surname ?? "", other: m.otherName ?? "" }
        : splitMemberName(String(m.name ?? ""));
    return key === "surname" ? split.surname.toUpperCase() : split.other;
  }
  if (key === "name") return String(m.name ?? "");
  if (key === "matric") return String(m.matric ?? "");
  if (key === "phone") return String(m.phone ?? "");
  if (key === "role") return String(m.role ?? "");
  return String((m.extra ?? {})[key] ?? "");
}
