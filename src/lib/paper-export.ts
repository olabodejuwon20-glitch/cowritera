import { demoProject, sections as staticSections } from "./demo-content";
import { defaultDraft, type PaperDraft } from "./paper-draft";

const TIMES = "Times New Roman";
const SIZE = 24; // 12pt half-points
const TITLE = 26;

function resolve(input?: Partial<PaperDraft>): PaperDraft {
  return { ...defaultDraft(), ...(input ?? {}) };
}

export async function buildDocx(input?: Partial<PaperDraft>): Promise<Uint8Array> {
  const d = resolve(input);
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, PageBreak, WidthType, BorderStyle,
  } = await import("docx");

  const inch = 1440;
  const border = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  const p = (text: string, opts: { bold?: boolean; align?: any; size?: number; indent?: boolean; italics?: boolean } = {}) =>
    new Paragraph({
      alignment: opts.align,
      indent: opts.indent ? { firstLine: 720 } : undefined,
      spacing: { after: 120, line: 360 },
      children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, font: TIMES, size: opts.size ?? SIZE })],
    });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true, font: TIMES, size: TITLE })],
    });

  const subheading = (text: string) =>
    new Paragraph({
      spacing: { before: 180, after: 100 },
      children: [new TextRun({ text, bold: true, font: TIMES, size: SIZE })],
    });

  // 6-column members table matching FUTA template
  const colWidths = [560, 1400, 2100, 1500, 1800, 2000]; // sums to 9360
  const headers = ["S/N", "SURNAME", "OTHER NAME", "PHONE NO", "MATRIC NO", "ROLE"];
  const mkCell = (text: string, i: number, boldCell = false) =>
    new TableCell({
      borders: cellBorders,
      width: { size: colWidths[i], type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: boldCell, font: TIMES, size: SIZE })] })],
    });

  const membersTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => mkCell(h, i, true)) }),
      ...demoProject.members.map((m) =>
        new TableRow({
          children: [String(m.sn), m.surname, m.otherName, m.phone, m.matric, m.role].map((t, i) => mkCell(t, i)),
        })
      ),
    ],
  });

  const cover: any[] = [
    p(demoProject.institution.toUpperCase(), { bold: true, align: AlignmentType.CENTER, size: 28 }),
    p(demoProject.institutionAddress, { align: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 300 } }),
    p("A TERM PAPER REPORT", { bold: true, align: AlignmentType.CENTER, size: TITLE }),
    p("ON", { align: AlignmentType.CENTER }),
    p(demoProject.topic.toUpperCase(), { bold: true, align: AlignmentType.CENTER, size: TITLE }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 300 } }),
    p(`SUBMITTED BY: ${demoProject.groupName}`, { bold: true, align: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
    membersTable,
    new Paragraph({ children: [new TextRun("")], spacing: { after: 300 } }),
    p("TERMS OF REFERENCE", { bold: true, align: AlignmentType.CENTER }),
    p(demoProject.submissionLine, { align: AlignmentType.CENTER, italics: true }),
    p(demoProject.date, { bold: true, align: AlignmentType.CENTER }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // Outline page
  const outline: any[] = [
    p("OUTLINE", { bold: true, align: AlignmentType.CENTER, size: TITLE }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),
    ...sections.outline.map((o) =>
      new Paragraph({
        spacing: { after: 80, line: 320 },
        children: [new TextRun({ text: `${o.n ? o.n + " " : ""}${o.t}`, bold: !o.n, font: TIMES, size: SIZE })],
      })
    ),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const body: any[] = [];

  // 1.0 Introduction (with inline 1.1 Aim subheading)
  body.push(heading("1.0 INTRODUCTION"));
  for (const para of sections.introduction) {
    if (para === "1.1 AIM OF THE STUDY") {
      body.push(subheading("1.1 AIM OF THE STUDY"));
    } else {
      body.push(p(para, { indent: true }));
    }
  }

  body.push(heading("2.0 LITERATURE REVIEW"));
  sections.literature.forEach((para) => body.push(p(para, { indent: true })));

  body.push(heading("3.0 METHODOLOGY"));
  sections.methodology.forEach((para) => body.push(p(para, { indent: true })));

  body.push(heading("4.0 RESULTS"));
  body.push(subheading(`4.1 ${demoProject.resultsSubtopic}`));
  sections.results.forEach((para) => body.push(p(para, { indent: true })));

  body.push(heading("5.0 DISCUSSION"));
  body.push(subheading(`5.1 ${demoProject.discussionSubtopic}`));
  sections.discussion.forEach((para) => body.push(p(para, { indent: true })));

  body.push(heading("6.0 CONCLUSION"));
  sections.conclusion.forEach((para) => body.push(p(para, { indent: true })));

  body.push(new Paragraph({ children: [new PageBreak()] }));
  body.push(heading("7.0 APPENDICES"));
  sections.appendices.forEach((para) => body.push(p(para)));

  body.push(new Paragraph({ children: [new PageBreak()] }));
  body.push(heading("REFERENCES"));
  sections.references.forEach((r) =>
    body.push(
      new Paragraph({
        spacing: { after: 160, line: 360 },
        indent: { left: 720, hanging: 720 },
        children: [new TextRun({ text: r, font: TIMES, size: SIZE })],
      })
    )
  );

  const doc = new Document({
    styles: { default: { document: { run: { font: TIMES, size: SIZE } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: inch, right: inch, bottom: inch, left: inch },
        },
      },
      children: [...cover, ...outline, ...body],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function buildPdf(): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const pageW = 612;
  const pageH = 792;
  const margin = 72;
  const contentW = pageW - margin * 2;
  const size = 12;
  const lineH = size * 1.5;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;
  const newPage = () => { page = pdf.addPage([pageW, pageH]); y = pageH - margin; };

  const wrap = (text: string, f = font, s = size, maxW = contentW): string[] => {
    const words = text.split(/\s+/);
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
    if (y - lineH < margin) newPage();
    let x = margin + (opts.indent ?? 0);
    if (opts.align === "center") {
      const w = f.widthOfTextAtSize(text, s);
      x = (pageW - w) / 2;
    }
    page.drawText(text, { x, y: y - s, size: s, font: f, color: rgb(0, 0, 0) });
    y -= lineH;
  };

  const drawWrapped = (text: string, opts: { font?: any; size?: number; align?: "left" | "center"; indent?: boolean } = {}) => {
    const f = opts.font ?? font;
    const s = opts.size ?? size;
    const firstIndent = opts.indent ? 36 : 0;
    const words = text.split(/\s+/);
    const lines: { text: string; indent: number }[] = [];
    let cur = "";
    let first = true;
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      const max = contentW - (first ? firstIndent : 0);
      if (f.widthOfTextAtSize(test, s) > max) {
        lines.push({ text: cur, indent: first ? firstIndent : 0 });
        first = false;
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push({ text: cur, indent: first ? firstIndent : 0 });
    for (const l of lines) drawLine(l.text, { font: f, size: s, align: opts.align, indent: l.indent });
    y -= 4;
  };

  const heading = (text: string) => {
    y -= 8;
    if (y - lineH < margin) newPage();
    drawLine(text, { font: bold, size: 13 });
    y -= 2;
  };
  const subheading = (text: string) => {
    y -= 4;
    if (y - lineH < margin) newPage();
    drawLine(text, { font: bold, size: 12 });
    y -= 2;
  };

  // ---------- COVER PAGE ----------
  drawLine(demoProject.institution.toUpperCase(), { font: bold, size: 14, align: "center" });
  drawLine(demoProject.institutionAddress, { align: "center" });
  y -= 24;
  drawLine("A TERM PAPER REPORT", { font: bold, size: 13, align: "center" });
  drawLine("ON", { align: "center" });
  for (const line of wrap(demoProject.topic.toUpperCase(), bold, 13)) drawLine(line, { font: bold, size: 13, align: "center" });
  y -= 18;
  drawLine(`SUBMITTED BY: ${demoProject.groupName}`, { font: bold, align: "center" });
  y -= 12;

  // 6-column members table
  const cols = [30, 78, 130, 84, 100, 78]; // sums to 500pt content
  const totalTableW = cols.reduce((a, b) => a + b, 0);
  const tableX = (pageW - totalTableW) / 2;
  const rowH = 20;
  const drawRow = (cells: string[], isHead = false) => {
    if (y - rowH < margin) newPage();
    let x = tableX;
    for (let i = 0; i < cells.length; i++) {
      page.drawRectangle({ x, y: y - rowH, width: cols[i], height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.7 });
      const f = isHead ? bold : font;
      const s = isHead ? 10 : 10;
      // truncate to fit
      let text = cells[i];
      while (f.widthOfTextAtSize(text, s) > cols[i] - 6 && text.length > 1) text = text.slice(0, -1);
      page.drawText(text, { x: x + 3, y: y - rowH + 6, size: s, font: f });
      x += cols[i];
    }
    y -= rowH;
  };
  drawRow(["S/N", "SURNAME", "OTHER NAME", "PHONE NO", "MATRIC NO", "ROLE"], true);
  demoProject.members.forEach((m) => drawRow([String(m.sn), m.surname, m.otherName, m.phone, m.matric, m.role]));

  y -= 20;
  drawLine("TERMS OF REFERENCE", { font: bold, align: "center" });
  y -= 4;
  drawWrapped(demoProject.submissionLine, { font: italic, align: "center" });
  y -= 8;
  drawLine(demoProject.date, { font: bold, align: "center" });

  // ---------- OUTLINE PAGE ----------
  newPage();
  drawLine("OUTLINE", { font: bold, size: 13, align: "center" });
  y -= 10;
  for (const o of sections.outline) {
    const text = `${o.n ? o.n + "   " : ""}${o.t}`;
    drawLine(text, { font: o.n ? font : bold });
  }

  // ---------- BODY ----------
  newPage();
  heading("1.0 INTRODUCTION");
  for (const para of sections.introduction) {
    if (para === "1.1 AIM OF THE STUDY") subheading("1.1 AIM OF THE STUDY");
    else drawWrapped(para, { indent: true });
  }
  heading("2.0 LITERATURE REVIEW");
  for (const para of sections.literature) drawWrapped(para, { indent: true });
  heading("3.0 METHODOLOGY");
  for (const para of sections.methodology) drawWrapped(para, { indent: true });
  heading("4.0 RESULTS");
  subheading(`4.1 ${demoProject.resultsSubtopic}`);
  for (const para of sections.results) drawWrapped(para, { indent: true });
  heading("5.0 DISCUSSION");
  subheading(`5.1 ${demoProject.discussionSubtopic}`);
  for (const para of sections.discussion) drawWrapped(para, { indent: true });
  heading("6.0 CONCLUSION");
  for (const para of sections.conclusion) drawWrapped(para, { indent: true });

  newPage();
  heading("7.0 APPENDICES");
  for (const para of sections.appendices) drawWrapped(para);

  newPage();
  heading("REFERENCES");
  for (const r of sections.references) {
    const lines = wrap(r, font, size, contentW - 36);
    lines.forEach((l, i) => drawLine(l, { indent: i === 0 ? 0 : 36 }));
    y -= 4;
  }

  return await pdf.save();
}
