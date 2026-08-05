import { demoProject } from "./demo-content";
import { defaultDraft, emptyDraft, type PaperDraft } from "./paper-draft";
import {
  formatGroupName,
  splitMemberName,
  sanitizeForDocx,
  sanitizeForPdf,
  type ExportCover,
  type ExportInput,
  type ExportMember,
} from "./export-types";

const TIMES = "Times New Roman";
const SIZE = 24; // 12pt half-points
const TITLE = 26;

type Row = { sn: string; surname: string; other: string; matric: string; role: string };

function splitName(m: ExportMember): { surname: string; other: string } {
  if (m.surname || m.otherName) return { surname: m.surname ?? "", other: m.otherName ?? "" };
  return splitMemberName(String(m.name ?? ""));
}

/** True only for the downloadable sample paper (no user payload at all). */
function isSampleRequest(input?: ExportInput): boolean {
  return !input || Object.keys(input).length === 0;
}

function resolveCover(input?: ExportInput): { cover: Required<Pick<ExportCover, "institution">> & ExportCover; rows: Row[]; isDemo: boolean } {
  const isDemo = isSampleRequest(input);
  const c: ExportCover = (!isDemo ? input?.cover ?? {} : undefined) ?? {
    institution: demoProject.institution,
    institutionAddress: demoProject.institutionAddress,
    groupName: demoProject.groupName,
    date: demoProject.date,
    resultsSubtopic: demoProject.resultsSubtopic,
    discussionSubtopic: demoProject.discussionSubtopic,
    members: demoProject.members.map((m) => ({
      sn: m.sn, surname: m.surname, otherName: m.otherName, matric: m.matric, phone: m.phone, role: m.role,
    })),
  };

  const rows: Row[] = (c.members ?? [])
    .map((m, i) => {
      const { surname, other } = splitName(m);
      return {
        sn: String(m.sn ?? i + 1),
        surname: surname.toUpperCase(),
        other,
        matric: m.matric ?? "",
        role: m.role ?? "",
      };
    })
    .filter((r) => r.surname || r.other || r.matric);

  return { cover: { institution: c.institution ?? "", ...c }, rows, isDemo };
}

function resolveDraft(input?: ExportInput): PaperDraft {
  // Real user projects NEVER inherit template content — only the sample does.
  const base = isSampleRequest(input) ? defaultDraft() : emptyDraft();
  const merged = { ...base, ...(input ?? {}) } as PaperDraft & { cover?: unknown };
  delete merged.cover;
  return merged;
}

const BODY: { key: keyof PaperDraft; n: string; title: string }[] = [
  { key: "introduction", n: "1.0", title: "INTRODUCTION" },
  { key: "literature", n: "2.0", title: "LITERATURE REVIEW" },
  { key: "methodology", n: "3.0", title: "METHODOLOGY" },
  { key: "results", n: "4.0", title: "RESULTS" },
  { key: "discussion", n: "5.0", title: "DISCUSSION" },
  { key: "conclusion", n: "6.0", title: "CONCLUSION" },
  { key: "appendices", n: "7.0", title: "APPENDICES" },
];

function outlineEntries(d: PaperDraft, cover: ExportCover) {
  const out: { n: string; t: string }[] = [{ n: "", t: "COVER PAGE" }];
  for (const s of BODY) {
    if (!(d[s.key] as string[]).some((p) => p.trim())) continue;
    out.push({ n: s.n, t: s.title });
    if (s.key === "results" && cover.resultsSubtopic) out.push({ n: "4.1", t: cover.resultsSubtopic.toUpperCase() });
    if (s.key === "discussion" && cover.discussionSubtopic) out.push({ n: "5.1", t: cover.discussionSubtopic.toUpperCase() });
  }
  if (d.references.some((r) => r.trim())) out.push({ n: "", t: "REFERENCES" });
  return out;
}

const HEADERS = ["S/N", "SURNAME", "OTHER NAMES", "MATRIC NO", "ROLE"];

/* ------------------------------- DOCX ---------------------------------- */

export async function buildDocx(input?: ExportInput): Promise<Uint8Array> {
  const d = resolveDraft(input);
  const { cover, rows } = resolveCover(input);
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, PageBreak, WidthType, BorderStyle,
  } = await import("docx");

  const inch = 1440;
  const border = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };
  const t = sanitizeForDocx;

  const p = (text: string, opts: { bold?: boolean; align?: any; size?: number; indent?: boolean; italics?: boolean } = {}) =>
    new Paragraph({
      alignment: opts.align,
      indent: opts.indent ? { firstLine: 720 } : undefined,
      spacing: { after: 120, line: 360 },
      children: [new TextRun({ text: t(text), bold: opts.bold, italics: opts.italics, font: TIMES, size: opts.size ?? SIZE })],
    });

  const gap = (after = 240) => new Paragraph({ children: [new TextRun("")], spacing: { after } });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: t(text), bold: true, font: TIMES, size: TITLE })],
    });

  const subheading = (text: string) =>
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [new TextRun({ text: t(text), bold: true, font: TIMES, size: SIZE })],
    });

  const colWidths = [700, 2200, 2600, 2160, 1700]; // 9360 total
  const mkCell = (text: string, i: number, boldCell = false) =>
    new TableCell({
      borders: cellBorders,
      width: { size: colWidths[i], type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: t(text), bold: boldCell, font: TIMES, size: SIZE })] })],
    });

  const membersTable = rows.length
    ? new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [
          new TableRow({ children: HEADERS.map((h, i) => mkCell(h, i, true)) }),
          ...rows.map((r) =>
            new TableRow({ children: [r.sn, r.surname, r.other, r.matric, r.role].map((v, i) => mkCell(v, i)) })
          ),
        ],
      })
    : null;

  const coverBlock: any[] = [];
  if (cover.institution) coverBlock.push(p(cover.institution.toUpperCase(), { bold: true, align: AlignmentType.CENTER, size: 28 }));
  if (cover.institutionAddress) coverBlock.push(p(cover.institutionAddress, { align: AlignmentType.CENTER }));
  if (cover.faculty) coverBlock.push(p(cover.faculty.toUpperCase(), { align: AlignmentType.CENTER }));
  if (cover.department) coverBlock.push(p(`DEPARTMENT OF ${cover.department.toUpperCase()}`, { align: AlignmentType.CENTER }));
  coverBlock.push(gap(300));
  coverBlock.push(p("A TERM PAPER REPORT", { bold: true, align: AlignmentType.CENTER, size: TITLE }));
  coverBlock.push(p("ON", { align: AlignmentType.CENTER }));
  if (d.topic) coverBlock.push(p(d.topic.toUpperCase(), { bold: true, align: AlignmentType.CENTER, size: TITLE }));
  if (cover.courseCode || cover.courseTitle) {
    coverBlock.push(p([cover.courseCode, cover.courseTitle].filter(Boolean).join(" — "), { align: AlignmentType.CENTER }));
  }
  coverBlock.push(gap(300));
  if (cover.groupName) coverBlock.push(p(`SUBMITTED BY: ${formatGroupName(cover.groupName)}`, { bold: true, align: AlignmentType.CENTER }));
  if (membersTable) {
    coverBlock.push(gap(200));
    coverBlock.push(membersTable);
  }
  coverBlock.push(gap(300));
  if (cover.lecturer) coverBlock.push(p(`SUBMITTED TO: ${cover.lecturer}`, { align: AlignmentType.CENTER }));
  if (d.submissionLine) {
    coverBlock.push(p("TERMS OF REFERENCE", { bold: true, align: AlignmentType.CENTER }));
    coverBlock.push(p(d.submissionLine, { align: AlignmentType.CENTER, italics: true }));
  }
  if (cover.session) coverBlock.push(p(cover.session, { align: AlignmentType.CENTER }));
  if (cover.date) coverBlock.push(p(cover.date, { bold: true, align: AlignmentType.CENTER }));
  coverBlock.push(new Paragraph({ children: [new PageBreak()] }));

  const entries = outlineEntries(d, cover);
  const outline: any[] = entries.length
    ? [
        p("OUTLINE", { bold: true, align: AlignmentType.CENTER, size: TITLE }),
        gap(120),
        ...entries.map((o) =>
          new Paragraph({
            spacing: { after: 80, line: 360 },
            children: [new TextRun({ text: t(`${o.n ? o.n + " " : ""}${o.t}`), bold: !o.n, font: TIMES, size: SIZE })],
          })
        ),
        new Paragraph({ children: [new PageBreak()] }),
      ]
    : [];

  const body: any[] = [];
  for (const s of BODY) {
    const paras = (d[s.key] as string[]).filter((x) => x.trim());
    if (!paras.length) continue;
    if (s.key === "appendices") body.push(new Paragraph({ children: [new PageBreak()] }));
    body.push(heading(`${s.n} ${s.title}`));
    if (s.key === "results" && cover.resultsSubtopic) body.push(subheading(`4.1 ${cover.resultsSubtopic}`));
    if (s.key === "discussion" && cover.discussionSubtopic) body.push(subheading(`5.1 ${cover.discussionSubtopic}`));
    for (const para of paras) {
      if (/^\d+\.\d+\s+[A-Z][A-Z\s]+$/.test(para.trim())) body.push(subheading(para.trim()));
      else body.push(p(para, { indent: s.key !== "appendices" }));
    }
  }

  const refs = d.references.filter((r) => r.trim());
  if (refs.length) {
    body.push(new Paragraph({ children: [new PageBreak()] }));
    body.push(heading("REFERENCES"));
    refs.forEach((r) =>
      body.push(
        new Paragraph({
          spacing: { after: 160, line: 360 },
          indent: { left: 720, hanging: 720 },
          children: [new TextRun({ text: t(r), font: TIMES, size: SIZE })],
        })
      )
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: TIMES, size: SIZE } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: inch, right: inch, bottom: inch, left: inch },
        },
      },
      children: [...coverBlock, ...outline, ...body],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

/* -------------------------------- PDF ----------------------------------- */

export async function buildPdf(input?: ExportInput): Promise<Uint8Array> {
  const d = resolveDraft(input);
  const { cover, rows } = resolveCover(input);
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const pageW = 612;
  const pageH = 792;
  const margin = 72; // 1 inch
  const contentW = pageW - margin * 2;
  const size = 12;
  const lineH = size * 1.5;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;
  const newPage = () => { page = pdf.addPage([pageW, pageH]); y = pageH - margin; };

  const wrap = (text: string, f = font, s = size, maxW = contentW): string[] => {
    const words = sanitizeForPdf(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(test, s) > maxW) { if (cur) lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const drawLine = (text: string, opts: { font?: any; size?: number; align?: "left" | "center"; indent?: number } = {}) => {
    const f = opts.font ?? font;
    const s = opts.size ?? size;
    const safe = sanitizeForPdf(text);
    if (!safe) { y -= lineH; return; }
    if (y - lineH < margin) newPage();
    let x = margin + (opts.indent ?? 0);
    if (opts.align === "center") x = (pageW - f.widthOfTextAtSize(safe, s)) / 2;
    page.drawText(safe, { x, y: y - s, size: s, font: f, color: rgb(0, 0, 0) });
    y -= lineH;
  };

  const drawCentered = (text: string, opts: { font?: any; size?: number } = {}) => {
    for (const l of wrap(text, opts.font ?? font, opts.size ?? size)) {
      drawLine(l, { ...opts, align: "center" });
    }
  };

  const drawWrapped = (text: string, opts: { font?: any; size?: number; indent?: boolean } = {}) => {
    const f = opts.font ?? font;
    const s = opts.size ?? size;
    const firstIndent = opts.indent ? 36 : 0;
    const words = sanitizeForPdf(text).split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const lines: { text: string; indent: number }[] = [];
    let cur = "";
    let first = true;
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(test, s) > contentW - (first ? firstIndent : 0)) {
        lines.push({ text: cur, indent: first ? firstIndent : 0 });
        first = false;
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push({ text: cur, indent: first ? firstIndent : 0 });
    for (const l of lines) drawLine(l.text, { font: f, size: s, indent: l.indent });
    y -= 4;
  };

  const heading = (text: string) => {
    y -= 8;
    if (y - lineH * 2 < margin) newPage();
    drawLine(text, { font: bold, size: 13 });
    y -= 2;
  };
  const subheading = (text: string) => {
    y -= 4;
    if (y - lineH * 2 < margin) newPage();
    for (const l of wrap(text, bold, 12)) drawLine(l, { font: bold, size: 12 });
    y -= 2;
  };

  /* Cover */
  if (cover.institution) drawCentered(cover.institution.toUpperCase(), { font: bold, size: 14 });
  if (cover.institutionAddress) drawCentered(cover.institutionAddress);
  if (cover.faculty) drawCentered(cover.faculty.toUpperCase());
  if (cover.department) drawCentered(`DEPARTMENT OF ${cover.department.toUpperCase()}`);
  y -= 24;
  drawCentered("A TERM PAPER REPORT", { font: bold, size: 13 });
  drawCentered("ON");
  if (d.topic) drawCentered(d.topic.toUpperCase(), { font: bold, size: 13 });
  if (cover.courseCode || cover.courseTitle) drawCentered([cover.courseCode, cover.courseTitle].filter(Boolean).join(" - "));
  y -= 18;
  if (cover.groupName) drawCentered(`SUBMITTED BY: ${formatGroupName(cover.groupName)}`, { font: bold });
  y -= 12;

  if (rows.length) {
    const cols = [34, 110, 140, 116, 68]; // 468pt = content width
    const tableX = (pageW - cols.reduce((a, b) => a + b, 0)) / 2;
    const rowH = 20;
    const drawRow = (cells: string[], isHead = false) => {
      if (y - rowH < margin) newPage();
      let x = tableX;
      for (let i = 0; i < cells.length; i++) {
        page.drawRectangle({ x, y: y - rowH, width: cols[i], height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.7 });
        const f = isHead ? bold : font;
        let text = sanitizeForPdf(cells[i]);
        while (text && f.widthOfTextAtSize(text, 10) > cols[i] - 6) text = text.slice(0, -1);
        if (text) page.drawText(text, { x: x + 3, y: y - rowH + 6, size: 10, font: f });
        x += cols[i];
      }
      y -= rowH;
    };
    drawRow(HEADERS, true);
    rows.forEach((r) => drawRow([r.sn, r.surname, r.other, r.matric, r.role]));
  }

  y -= 20;
  if (cover.lecturer) drawCentered(`SUBMITTED TO: ${cover.lecturer}`);
  if (d.submissionLine) {
    drawLine("TERMS OF REFERENCE", { font: bold, align: "center" });
    y -= 4;
    drawCentered(d.submissionLine, { font: italic });
  }
  y -= 8;
  if (cover.session) drawCentered(cover.session);
  if (cover.date) drawCentered(cover.date, { font: bold });

  /* Outline */
  const entries = outlineEntries(d, cover);
  if (entries.length) {
    newPage();
    drawLine("OUTLINE", { font: bold, size: 13, align: "center" });
    y -= 10;
    for (const o of entries) {
      for (const l of wrap(`${o.n ? o.n + "   " : ""}${o.t}`, o.n ? font : bold)) {
        drawLine(l, { font: o.n ? font : bold });
      }
    }
  }

  /* Body */
  let started = false;
  for (const s of BODY) {
    const paras = (d[s.key] as string[]).filter((x) => x.trim());
    if (!paras.length) continue;
    if (!started || s.key === "appendices") { newPage(); started = true; }
    heading(`${s.n} ${s.title}`);
    if (s.key === "results" && cover.resultsSubtopic) subheading(`4.1 ${cover.resultsSubtopic}`);
    if (s.key === "discussion" && cover.discussionSubtopic) subheading(`5.1 ${cover.discussionSubtopic}`);
    for (const para of paras) {
      if (/^\d+\.\d+\s+[A-Z][A-Z\s]+$/.test(para.trim())) subheading(para.trim());
      else drawWrapped(para, { indent: s.key !== "appendices" });
    }
  }

  const refs = d.references.filter((r) => r.trim());
  if (refs.length) {
    newPage();
    heading("REFERENCES");
    for (const r of refs) {
      wrap(r, font, size, contentW - 36).forEach((l, i) => drawLine(l, { indent: i === 0 ? 0 : 36 }));
      y -= 4;
    }
  }

  return await pdf.save();
}
