/**
 * Draws the mission control report as an A4 PDF with jsPDF, loaded only when
 * someone downloads a report.
 */
import type { Report } from '../logic/report';
import type { Status } from '../logic/types';
import { STATUS_LABEL } from '../config/indicators';

const PAGE = { width: 210, height: 297, margin: 15 };
const COLOR: Record<Status, [number, number, number]> = {
  ok: [22, 163, 74],
  watch: [217, 119, 6],
  act: [220, 38, 38],
};
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

/** The PDF's standard fonts only know Latin-1 (WinAnsi): spell out the rest. */
export function pdfText(text: string): string {
  return text
    .replace(/₂/g, '2')
    .replace(/≈/g, '~')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/✓/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0000-ÿ–—…•]/g, '?');
}

export async function downloadReportPdf(report: Report): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const right = PAGE.width - PAGE.margin;
  const width = right - PAGE.margin;
  let y = PAGE.margin;

  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };
  const lineHeight = (size: number) => size * 0.42;
  const ensure = (needed: number) => {
    if (y + needed > PAGE.height - PAGE.margin - 6) {
      doc.addPage();
      y = PAGE.margin;
    }
  };
  /** Wrapped text at x; returns its height. */
  const text = (value: string, x: number, size: number, maxWidth: number, style: 'normal' | 'bold' = 'normal') => {
    font(size, style);
    const lines = doc.splitTextToSize(pdfText(value), maxWidth) as string[];
    doc.text(lines, x, y + lineHeight(size) * 0.8);
    return lines.length * lineHeight(size);
  };
  const chip = (status: Status, x: number, top: number) => {
    const label = STATUS_LABEL[status];
    font(8, 'bold');
    const w = doc.getTextWidth(label) + 4;
    doc.setFillColor(...COLOR[status]);
    doc.roundedRect(x, top, w, 4.6, 1.2, 1.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, x + 2, top + 3.3);
    color(INK);
    return w;
  };

  // Title and notes.
  color(INK);
  y += text(report.title, PAGE.margin, 15, width, 'bold') + 1;
  color(MUTED);
  y += text(report.subtitle, PAGE.margin, 9.5, width) + 1;
  for (const note of report.notes) y += text(note, PAGE.margin, 8, width);
  y += 3;

  // Habitat.
  color(INK);
  y += text('Habitat', PAGE.margin, 11, width, 'bold') + 1;
  for (const [k, v] of report.habitat) {
    color(MUTED);
    text(k, PAGE.margin, 9, 32);
    color(INK);
    y += text(v, PAGE.margin + 34, 9, width - 34) + 0.6;
  }
  y += 3;

  // One block per crew member.
  for (const c of report.crew) {
    ensure(70);
    doc.setDrawColor(226, 232, 240);
    doc.line(PAGE.margin, y, right, y);
    y += 3;
    color(INK);
    font(12, 'bold');
    const name = pdfText(c.name);
    doc.text(name, PAGE.margin, y + 4);
    const nameWidth = doc.getTextWidth(name);
    font(9);
    color(MUTED);
    doc.text(pdfText(c.role), PAGE.margin + nameWidth + 3, y + 4);
    chip(c.status, right - 22, y + 0.6);
    y += 8;

    // Indicators: label · value · status · rule.
    const cols = [PAGE.margin, PAGE.margin + 34, PAGE.margin + 62, PAGE.margin + 84];
    font(7.5, 'bold');
    color(MUTED);
    ['Indicator', 'Value', 'Status', 'Reading'].forEach((h, i) => doc.text(h, cols[i]!, y + 3));
    y += 4.5;
    for (const r of c.indicators) {
      font(8.5);
      const lines = doc.splitTextToSize(pdfText(r.note), right - cols[3]!) as string[];
      const h = Math.max(1, lines.length) * lineHeight(8.5) + 1.2;
      ensure(h);
      color(INK);
      doc.text(pdfText(r.label), cols[0]!, y + 3);
      doc.text(pdfText(r.value), cols[1]!, y + 3);
      doc.setTextColor(...COLOR[r.status]);
      font(8.5, 'bold');
      doc.text(STATUS_LABEL[r.status], cols[2]!, y + 3);
      font(8.5);
      color(INK);
      doc.text(lines, cols[3]!, y + 3);
      y += h;
    }
    y += 1.5;

    // Alerts and actions.
    color(INK);
    if (c.alerts.length === 0) {
      y += text('Alerts: none.', PAGE.margin, 9, width);
    } else {
      y += text('Alerts and actions', PAGE.margin, 9, width, 'bold');
      for (const a of c.alerts) {
        ensure(5);
        doc.setFillColor(...COLOR[a.status]);
        doc.circle(PAGE.margin + 1.2, y + 1.9, 0.9, 'F');
        y += text(`${a.title}${a.done ? ` — ${a.done}` : ' — not marked as done'}`, PAGE.margin + 4, 9, width - 4);
      }
    }
    y += 1;
    y += text(`Daily check-in: ${c.checkIn}`, PAGE.margin, 9, width);

    // Last sols.
    if (c.sols.length > 0) {
      ensure(10);
      y += 1;
      const colWidth = width / c.sols.length;
      font(7.5, 'bold');
      color(MUTED);
      c.sols.forEach((s, i) => doc.text(`Sol ${s.sol}`, PAGE.margin + i * colWidth, y + 3));
      y += 4;
      font(8);
      color(INK);
      c.sols.forEach((s, i) => {
        doc.text(`Sleep ${s.sleepHours.toFixed(1)} h`, PAGE.margin + i * colWidth, y + 3);
        doc.text(`Exercise ${s.exerciseMinutes} min`, PAGE.margin + i * colWidth, y + 6.5);
      });
      y += 9;
    }
    y += 3;
  }

  // Sources.
  ensure(25);
  color(INK);
  y += text('Data and standards', PAGE.margin, 9, width, 'bold') + 0.5;
  color(MUTED);
  for (const s of report.sources) {
    ensure(5);
    y += text(s, PAGE.margin, 7.5, width);
  }

  // Footer on every page.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font(7.5);
    color(MUTED);
    doc.text(pdfText('Pulsar · Prototype – not for medical use'), PAGE.margin, PAGE.height - 8);
    doc.text(`Page ${p} of ${pages}`, right, PAGE.height - 8, { align: 'right' });
  }

  doc.save(report.fileName);
}
