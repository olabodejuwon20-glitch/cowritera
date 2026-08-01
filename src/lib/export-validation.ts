import { z } from "zod";
import type { ExportInput } from "./export-types";

/** Hard cap on raw request body size (bytes) for export endpoints. */
export const MAX_EXPORT_BODY_BYTES = 256 * 1024; // 256 KB

const MAX_PARAGRAPH_CHARS = 5_000;
const MAX_PARAGRAPHS = 200;

const paragraphs = z
  .array(z.string().max(MAX_PARAGRAPH_CHARS))
  .max(MAX_PARAGRAPHS);

const shortText = z.string().max(300).optional().nullable();

const coverSchema = z
  .object({
    institution: shortText,
    institutionAddress: shortText,
    faculty: shortText,
    department: shortText,
    courseCode: shortText,
    courseTitle: shortText,
    groupName: shortText,
    lecturer: shortText,
    session: shortText,
    date: shortText,
    resultsSubtopic: shortText,
    discussionSubtopic: shortText,
    members: z
      .array(
        z
          .object({
            sn: z.number().int().min(0).max(999).optional(),
            name: shortText,
            surname: shortText,
            otherName: shortText,
            matric: shortText,
            phone: shortText,
            role: shortText,
          })
          .strict(),
      )
      .max(60)
      .optional(),
  })
  .strict();

export const paperDraftSchema = z
  .object({
    topic: z.string().max(500).optional(),
    submissionLine: z.string().max(1_000).optional(),
    introduction: paragraphs.optional(),
    literature: paragraphs.optional(),
    methodology: paragraphs.optional(),
    results: paragraphs.optional(),
    discussion: paragraphs.optional(),
    conclusion: paragraphs.optional(),
    appendices: paragraphs.optional(),
    references: paragraphs.optional(),
    cover: coverSchema.optional(),
  })
  .strict();

export type ExportParseResult =
  | { ok: true; draft: Partial<PaperDraft> | undefined }
  | { ok: false; status: number; message: string };

/** Reads and validates an export request body, enforcing size and schema limits. */
export async function parseExportRequest(request: Request): Promise<ExportParseResult> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_EXPORT_BODY_BYTES) {
    return { ok: false, status: 413, message: "Payload too large" };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, status: 400, message: "Invalid request body" };
  }

  if (!raw.trim()) return { ok: true, draft: undefined };

  if (raw.length > MAX_EXPORT_BODY_BYTES) {
    return { ok: false, status: 413, message: "Payload too large" };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }

  const parsed = paperDraftSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, status: 400, message: "Invalid draft payload" };
  }

  return { ok: true, draft: parsed.data as Partial<PaperDraft> };
}
