/**
 * Minimal, valid single-page PDF generator used to create placeholder
 * manuscripts for seeded demo data. Not part of the running application.
 */

export function makePlaceholderPdf(title: string, subtitle: string): Buffer {
  const escape = (s: string) => s.replace(/([()\\])/g, '\\$1').slice(0, 90);

  const content = `BT /F1 16 Tf 72 720 Td (${escape(title)}) Tj ET
BT /F1 11 Tf 72 696 Td (${escape(subtitle)}) Tj ET
BT /F1 10 Tf 72 660 Td (Placeholder document generated for the CSU-THRIVE demo dataset.) Tj ET`;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}
