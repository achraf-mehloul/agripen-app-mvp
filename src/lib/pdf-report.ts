// PDF report generator for AgriPen soil analyses & history.
import jsPDF from "jspdf";

export type PdfReport = {
  title: string;
  subtitle?: string;
  farmer: string;
  location?: string;
  lines: Array<{ label: string; value: string }>;
  sections?: Array<{ heading: string; rows: Array<{ label: string; value: string }> }>;
  footer?: string;
};

export function exportReportPdf(r: PdfReport, filename = "agripen-report.pdf") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFillColor(47, 125, 79);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("AgriPen", 14, 15);
  doc.setFontSize(10);
  doc.text("Smart Farming Report", 14, 21);
  doc.setTextColor(20, 20, 20);
  y = 36;

  doc.setFontSize(15);
  doc.text(r.title, 14, y); y += 7;
  if (r.subtitle) { doc.setFontSize(10); doc.setTextColor(90, 90, 90); doc.text(r.subtitle, 14, y); y += 6; doc.setTextColor(20, 20, 20); }

  doc.setFontSize(10);
  doc.text(`Farmer: ${r.farmer}`, 14, y); y += 5;
  if (r.location) { doc.text(`Location: ${r.location}`, 14, y); y += 5; }
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 8;

  doc.setDrawColor(220);
  doc.line(14, y, W - 14, y); y += 6;

  doc.setFontSize(11);
  for (const l of r.lines) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.text(l.label, 14, y);
    doc.setFont("helvetica", "normal"); doc.text(l.value, 70, y);
    y += 6;
  }

  for (const sec of r.sections ?? []) {
    y += 4;
    if (y > 265) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 246, 240); doc.rect(14, y - 4, W - 28, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(sec.heading, 16, y + 1); y += 8;
    doc.setFontSize(10);
    for (const row of sec.rows) {
      if (y > 278) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.text(row.label, 16, y);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(row.value, W - 90);
      doc.text(wrapped, 70, y);
      y += 5 + (wrapped.length - 1) * 4.5;
    }
  }

  if (r.footer) {
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(r.footer, 14, 290);
  }

  doc.save(filename);
}
