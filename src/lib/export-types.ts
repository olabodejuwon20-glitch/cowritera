import type { PaperDraft } from "./paper-draft";

export type ExportMember = {
  sn?: number;
  name?: string;
  surname?: string;
  otherName?: string;
  matric?: string;
  phone?: string;
  role?: string;
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
