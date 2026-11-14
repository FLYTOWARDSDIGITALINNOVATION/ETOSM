const { jsPDF } = require('../frontend/node_modules/jspdf');
const fs = require('fs');

function testDrawRupee(doc, x, y, fontSize, color, bold = false) {
  doc.saveGraphicsState();
  doc.setDrawColor(...color);
  
  // Font metrics calculation
  // In Helvetica, cap-height is ~0.72 of font-size
  // fontSize is in pt (1 pt = 0.352778 mm)
  const ptToMm = 0.352778;
  const capHeight = fontSize * ptToMm * 0.72; // height of capital letters
  const w = capHeight * 0.65; // standard aspect ratio for ₹
  const strokeWidth = bold ? Math.max(0.24, capHeight * 0.12) : Math.max(0.18, capHeight * 0.085);
  
  doc.setLineWidth(strokeWidth);
  doc.setLineCap(1); // round cap
  doc.setLineJoin(1); // round join

  const topY = y - capHeight;
  const botY = y;
  const midY = topY + capHeight * 0.45;
  const loopBotY = topY + capHeight * 0.52;
  const stemX = x + w * 0.15;
  const leftX = x;
  const rightX = x + w;

  // 1. Top horizontal bar
  doc.line(leftX, topY, rightX, topY);

  // 2. Second horizontal bar
  doc.line(leftX, midY, rightX * 0.95 + leftX * 0.05, midY);

  // 3. Vertical stem (from top bar down to loop base)
  doc.line(stemX, topY, stemX, loopBotY);

  // 4. Smooth curved loop (from top to loop base)
  // Cubic bezier: starts at (stemX, topY), ends at (stemX, loopBotY)
  // Control points curve outward to the right
  const loopWidth = w * 0.75;
  const cpX = stemX + loopWidth * 1.35;
  doc.moveTo(stemX, topY);
  doc.curveTo(cpX, topY, cpX, loopBotY, stemX, loopBotY);
  doc.stroke();

  // 5. Diagonal leg
  doc.line(stemX + w * 0.05, loopBotY, rightX * 0.95, botY);

  doc.restoreGraphicsState();
  return w + 1.0;
}

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
doc.setFont('Helvetica', 'normal');
doc.setFontSize(14);
doc.text('Rupee Vector Test:', 20, 30);

// Draw normal
testDrawRupee(doc, 70, 30, 14, [15, 23, 42], false);
doc.text('199.00', 80, 30);

// Draw bold red
doc.setFont('Helvetica', 'bold');
doc.setTextColor(197, 27, 36);
doc.text('Total:', 20, 50);
testDrawRupee(doc, 70, 50, 16, [197, 27, 36], true);
doc.text('235.00', 82, 50);

const pdfBytes = doc.output();
fs.writeFileSync('scratch/test-rupee.pdf', Buffer.from(pdfBytes, 'binary'));
console.log('PDF saved to scratch/test-rupee.pdf');
