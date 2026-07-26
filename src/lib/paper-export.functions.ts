import { createServerFn } from "@tanstack/react-start";
import { demoProject, sections } from "./demo-content";

const TIMES = "Times New Roman";
const SIZE = 24; // 12pt in half-points
const TITLE = 26; // 13pt

async function buildDocx(): Promise<Uint8Array> {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, PageBreak, WidthType, BorderStyle,
  } = await import("docx");

  const inch = 1440;
  const border = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
  const cellBorders = { top: border, bottom: border, left: border, right: border };

  const p = (text: string, opts: { bold?: boolean; align?: any; size?: number; indent?: boolean } = {}) =>
    new Paragraph({
      alignment: opts.align,
      indent: opts.indent ? { firstLine: 720 } : undefined,
      spacing: { after: 120, line: 360 },
      children: [new TextRun({ text, bold: opts.bold, font: TIMES, size: opts.size ?? SIZE })],
    });

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true, font: TIMES, size: TITLE })],
    });

  // Cover
  const coverChildren: any[] = [
    p(demoProject.institution.toUpperCase(), { bold: true, align: AlignmentType.CENTER, size: 28 }),
    p(demoProject.faculty, { align: AlignmentType.CENTER }),
    p(demoProject.department, { align: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 400 } }),
    p("TOPIC", { bold: true, align: AlignmentType.CENTER, size: TITLE }),
    p(demoProject.topic, { bold: true, align: AlignmentType.CENTER, size: TITLE }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 400 } }),
    p(`Course Code: ${demoProject.courseCode}`, { align: AlignmentType.CENTER }),
    p(`Course Title: ${demoProject.courseTitle}`, { align: AlignmentType.CENTER }),
    p(`Lecturer: ${demoProject.lecturer}`, { align: AlignmentType.CENTER }),
    p(`Group: ${demoProject.groupName}`, { align: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),
    p("GROUP MEMBERS", { bold: true, align: AlignmentType.CENTER }),
  ];

  const membersTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [960, 5200, 3200],
    rows: [
      new TableRow({
        children: ["S/N", "Name", "Matric Number"].map(
          (h, i) => new TableCell({
            borders: cellBorders,
            width: { size: [960, 5200, 3200][i], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, font: TIMES, size: SIZE })] })],
          })
        ),
      }),
      ...demoProject.members.map((m, idx) =>
        new TableRow({
          children: [String(idx + 1), m.name, m.matric].map(
            (t, i) => new TableCell({
              borders: cellBorders,
              width: { size: [960, 5200, 3200][i], type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: t, font: TIMES, size: SIZE })] })],
            })
          ),
        })
      ),
    ],
  });

  coverChildren.push(membersTable);
  coverChildren.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 400 } }));
  coverChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: demoProject.submissionLine, italics: true, font: TIMES, size: SIZE })],
    })
  );
  coverChildren.push(p(demoProject.date, { align: AlignmentType.CENTER, bold: true }));
  coverChildren.push(new Paragraph({ children: [new PageBreak()] }));

  const body: any[] = [];
  const addSection = (title: string, paras: string[]) => {
    body.push(heading(title));
    paras.forEach((para) => body.push(p(para, { indent: true })));
  };

  addSection("1.0 Introduction", sections.introduction);
  addSection("2.0 Literature Review", sections.literature);
  addSection("3.0 Methodology", sections.methodology);
  body.push(heading("4.0 Results"));
  body.push(heading(`4.1 ${demoProject.resultsSubtopic}`));
  sections.results.forEach((para) => body.push(p(para, { indent: true })));
  body.push(heading("5.0 Discussion"));
  body.push(heading(`5.1 ${demoProject.discussionSubtopic}`));
  sections.discussion.forEach((para) => body.push(p(para, { indent: true })));
  addSection("6.0 Conclusion", sections.conclusion);

  body.push(new Paragraph({ children: [new PageBreak()] }));
  body.push(heading("7.0 References"));
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
      children: [...coverChildren, ...body],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

async function buildPdf(): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const pageW = 612; // 8.5"
  const pageH = 792; // 11"
  const margin = 72; // 1"
  const contentW = pageW - margin * 2;
  const size = 12;
  const lineH = size * 1.5;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const newPage = () => {
    page = pdf.addPage([pageW, pageH]);
    y = pageH - margin;
  };

  const wrap = (text: string, f = font, s = size, maxW = contentW): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(test, s) > maxW) {
        if (cur) lines.push(cur);
        cur = w;
      } else cur = test;
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

  const drawPara = (text: string, opts: { font?: any; size?: number; align?: "left" | "center"; indent?: boolean } = {}) => {
    const f = opts.font ?? font;
    const s = opts.size ?? size;
    const firstIndent = opts.indent ? 36 : 0;
    const firstMax = contentW - firstIndent;
    // wrap first line separately
    const words = text.split(/\s+/);
    let cur = "";
    let first = true;
    const lines: { text: string; indent: number }[] = [];
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      const max = first ? firstMax : contentW;
      if (f.widthOfTextAtSize(test, s) > max) {
        lines.push({ text: cur, indent: first ? firstIndent : 0 });
        first = false;
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push({ text: cur, indent: first ? firstIndent : 0 });
    for (const l of lines) drawLine(l.text, { ...opts, indent: l.indent });
    y -= 4;
  };

  const heading = (text: string) => {
    y -= 8;
    if (y - lineH < margin) newPage();
    drawLine(text, { font: bold, size: 13 });
    y -= 2;
  };

  // Cover
  drawLine(demoProject.institution.toUpperCase(), { font: bold, size: 14, align: "center" });
  drawLine(demoProject.faculty, { align: "center" });
  drawLine(demoProject.department, { align: "center" });
  y -= 40;
  drawLine("TOPIC", { font: bold, size: 13, align: "center" });
  for (const line of wrap(demoProject.topic, bold, 13)) drawLine(line, { font: bold, size: 13, align: "center" });
  y -= 30;
  drawLine(`Course Code: ${demoProject.courseCode}`, { align: "center" });
  drawLine(`Course Title: ${demoProject.courseTitle}`, { align: "center" });
  drawLine(`Lecturer: ${demoProject.lecturer}`, { align: "center" });
  drawLine(`Group: ${demoProject.groupName}`, { align: "center" });
  y -= 20;
  drawLine("GROUP MEMBERS", { font: bold, align: "center" });
  y -= 6;

  // Members table
  const cols = [40, 260, 160];
  const tableX = (pageW - cols.reduce((a, b) => a + b, 0)) / 2;
  const rowH = 20;
  const drawRow = (cells: string[], isHead = false) => {
    if (y - rowH < margin) newPage();
    let x = tableX;
    for (let i = 0; i < cells.length; i++) {
      page.drawRectangle({ x, y: y - rowH, width: cols[i], height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.7 });
      page.drawText(cells[i], { x: x + 5, y: y - rowH + 6, size, font: isHead ? bold : font });
      x += cols[i];
    }
    y -= rowH;
  };
  drawRow(["S/N", "Name", "Matric Number"], true);
  demoProject.members.forEach((m, i) => drawRow([String(i + 1), m.name, m.matric]));

  y -= 30;
  drawLine(demoProject.submissionLine, { font: italic, align: "center" });
  y -= 10;
  drawLine(demoProject.date, { font: bold, align: "center" });

  newPage();

  const addSec = (title: string, paras: string[]) => {
    heading(title);
    for (const para of paras) drawPara(para, { indent: true });
  };
  addSec("1.0 Introduction", sections.introduction);
  addSec("2.0 Literature Review", sections.literature);
  addSec("3.0 Methodology", sections.methodology);
  heading("4.0 Results");
  heading(`4.1 ${demoProject.resultsSubtopic}`);
  for (const para of sections.results) drawPara(para, { indent: true });
  heading("5.0 Discussion");
  heading(`5.1 ${demoProject.discussionSubtopic}`);
  for (const para of sections.discussion) drawPara(para, { indent: true });
  addSec("6.0 Conclusion", sections.conclusion);

  newPage();
  heading("7.0 References");
  for (const r of sections.references) {
    // hanging indent
    const lines = wrap(r, font, size, contentW - 36);
    lines.forEach((l, i) => drawLine(l, { indent: i === 0 ? 0 : 36 }));
    y -= 4;
  }

  const bytes = await pdf.save();
  return bytes;
}

export const exportPaperDocx = createServerFn({ method: "GET", response: "raw" }).handler(async () => {
  const bytes = await buildDocx();
  return new Response(bytes, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": 'attachment; filename="GNS102-Term-Paper.docx"',
    },
  });
});

export const exportPaperPdf = createServerFn({ method: "GET", response: "raw" }).handler(async () => {
  const bytes = await buildPdf();
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="GNS102-Term-Paper.pdf"',
    },
  });
});
