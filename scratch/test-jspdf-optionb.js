const { jsPDF } = require('../frontend/node_modules/jspdf');
const sharp = require('../frontend/node_modules/sharp');
const fs = require('fs');

function drawRupeeVector(doc, x, y, fontSize = 8.5, color = [30, 41, 59], bold = false) {
  doc.saveGraphicsState();
  doc.setDrawColor(...color);

  // Height of capital letter in mm
  const ptToMm = 0.352778;
  const H = fontSize * ptToMm * 0.72;
  const scale = H / 18;
  const W = 12 * scale;
  const lw = bold ? Math.max(0.22, H * 0.11) : Math.max(0.16, H * 0.08);

  doc.setLineWidth(lw);
  doc.setLineCap(1);  // round cap
  doc.setLineJoin(1); // round join

  const topY = y - H;
  const sx = (v) => x + (v - 6) * scale;
  const sy = (v) => topY + (v - 3) * scale;

  // 1. Top bar: (6, 3) -> (18, 3)
  doc.line(sx(6), sy(3), sx(18), sy(3));

  // 2. Middle bar: (6, 8) -> (18, 8)
  doc.line(sx(6), sy(8), sx(18), sy(8));

  // 3. Loop: starts at (9, 3), curves out to CP (15.667, 3) and (15.667, 13), ends at (9, 13), then line to (6, 13)
  doc.moveTo(sx(9), sy(3));
  doc.curveTo(sx(9 + 6.667), sy(3), sx(9 + 6.667), sy(13), sx(9), sy(13));
  doc.lineTo(sx(6), sy(13));
  doc.stroke();

  // 4. Diagonal leg: (6, 13) -> (14.5, 21)
  doc.line(sx(6), sy(13), sx(14.5), sy(21));

  doc.restoreGraphicsState();
  return W + 0.8 * scale * 4; // width + gap
}

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
doc.setFont('Helvetica', 'normal');
doc.setFontSize(8.5);
doc.text('Untaxed Amount', 20, 30);
drawRupeeVector(doc, 60, 30, 8.5, [15, 23, 42], false);
doc.text('199.00', 65, 30);

doc.setFont('Helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(197, 27, 36);
doc.text('Total', 20, 45);
drawRupeeVector(doc, 60, 45, 9.5, [197, 27, 36], true);
doc.text('235.00', 66, 45);

const pdfBytes = doc.output();
fs.writeFileSync('scratch/test-jspdf-optionb.pdf', Buffer.from(pdfBytes, 'binary'));
console.log('PDF saved successfully');
