const { jsPDF } = require('../frontend/node_modules/jspdf');
const fs = require('fs');

const cn = {
  creditNoteNumber: "CN-2026-0002",
  creditNoteDate: "2026-11-13T00:00:00.000Z",
  invoiceNumber: "INV-2026-0004",
  customerName: "vinoth sharma",
  customerPhone: "96000003345",
  customerAddress: "8/63a, bihar",
  reason: "Goods Returned",
  status: "Issued",
  refundMode: "Bank Transfer",
  placeOfSupply: "99 - Other State",
  items: [
    {
      name: "Bluetooth MP3 Decoder Module with 5W + 5W Stereo Amplifier | USB, TF Card, FM Radio, AUX, Mic Input & IR Remote | 3.7V Battery Support",
      quantity: 1,
      unitPrice: 199.00,
      gstPercent: 18,
      totalAmount: 234.82
    }
  ],
  subtotal: 199.00,
  totalTax: 35.82,
  totalCreditAmount: 234.82
};

const doc = new jsPDF("p", "mm", "a4");

// Header Band
doc.setFillColor(227, 0, 15);
doc.rect(0, 0, 210, 8, "F");

// Company Header
doc.setTextColor(15, 23, 42);
doc.setFont("Helvetica", "bold");
doc.setFontSize(20);
doc.text("EToSM TECHNOLOGY", 14, 22);

doc.setFont("Helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(100, 116, 139);
doc.text("2/167, Merkukadu, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu - 637202", 14, 28);
doc.text("Phone: +91 88070 80216 | Email: support@etosmtechnology.in | GSTIN: 33AAACE1234F1Z5", 14, 33);

// Title Block
doc.setFillColor(248, 250, 252);
doc.rect(14, 40, 182, 10, "F");
doc.setDrawColor(226, 232, 240);
doc.rect(14, 40, 182, 10);
doc.setFont("Helvetica", "bold");
doc.setFontSize(13);
doc.setTextColor(227, 0, 15);
doc.text("CREDIT NOTE", 18, 47);

doc.setFontSize(9);
doc.setTextColor(71, 85, 105);
doc.text(`STATUS: ${String(cn.status || "Issued").toUpperCase()}`, 155, 47);

// Left: Customer Box | Right: Credit Note Meta
let y = 56;
const addressLines = cn.customerAddress
  ? doc.splitTextToSize(`Address: ${cn.customerAddress}`, 80)
  : [];

let custNeededH = 18 + (cn.customerCompany ? 4.5 : 0) + (cn.customerPhone ? 4.5 : 0) + (addressLines.length > 0 ? addressLines.length * 4.2 : 0) + (cn.customerGstin ? 4.5 : 0) + 4;
let metaNeededH = 34 + (cn.refundMode ? 5 : 0) + (cn.placeOfSupply ? 5 : 0) + 4;
const boxH = Math.max(38, custNeededH, metaNeededH);

doc.setFillColor(248, 250, 252);
doc.rect(14, y, 88, boxH, "F");
doc.setDrawColor(226, 232, 240);
doc.rect(14, y, 88, boxH);

doc.setFont("Helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(15, 23, 42);
doc.text("CREDIT ISSUED TO:", 18, y + 6);

doc.setFontSize(10);
doc.setTextColor(227, 0, 15);
doc.text(String(cn.customerName || "Customer"), 18, y + 12);

doc.setFont("Helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(51, 65, 85);
let custY = y + 17;
if (cn.customerCompany) {
  doc.text(`Company: ${cn.customerCompany}`, 18, custY);
  custY += 4.5;
}
if (cn.customerPhone) {
  doc.text(`Phone: ${cn.customerPhone}`, 18, custY);
  custY += 4.5;
}
if (addressLines.length > 0) {
  doc.text(addressLines, 18, custY);
  custY += addressLines.length * 4.2;
}
if (cn.customerGstin) {
  doc.text(`GSTIN: ${cn.customerGstin}`, 18, custY);
  custY += 4.5;
}

// Right: Credit Note Meta Box
doc.setFillColor(248, 250, 252);
doc.rect(108, y, 88, boxH, "F");
doc.rect(108, y, 88, boxH);

doc.setFont("Helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(15, 23, 42);
doc.text("DOCUMENT DETAILS:", 112, y + 6);

doc.setFont("Helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(51, 65, 85);
doc.text("Credit Note No:", 112, y + 12);
doc.setFont("Helvetica", "bold");
doc.text(String(cn.creditNoteNumber), 146, y + 12);

doc.setFont("Helvetica", "normal");
doc.text("Date of Issue:", 112, y + 17);
doc.text(cn.creditNoteDate ? new Date(cn.creditNoteDate).toLocaleDateString("en-IN") : "N/A", 146, y + 17);

doc.text("Original Invoice #:", 112, y + 22);
doc.setFont("Helvetica", "bold");
doc.text(String(cn.invoiceNumber || "Standalone / Manual"), 146, y + 22);

doc.setFont("Helvetica", "normal");
doc.text("Reason:", 112, y + 27);
doc.setTextColor(227, 0, 15);
doc.text(String(cn.reason || "Goods Returned"), 146, y + 27);

doc.setTextColor(51, 65, 85);
let metaY = y + 32;
if (cn.status) {
  doc.text("Status:", 112, metaY);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(String(cn.status), 146, metaY);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  metaY += 5;
}
if (cn.refundMode) {
  doc.text("Refund Method:", 112, metaY);
  doc.setFont("Helvetica", "bold");
  doc.text(String(cn.refundMode), 146, metaY);
  doc.setFont("Helvetica", "normal");
  metaY += 5;
}
if (cn.placeOfSupply) {
  doc.text("Place of Supply:", 112, metaY);
  doc.text(String(cn.placeOfSupply), 146, metaY);
  metaY += 5;
}

y += boxH + 8;

// Line Items Table Header
doc.setFillColor(241, 245, 249);
doc.rect(14, y, 182, 7, "F");
doc.setDrawColor(226, 232, 240);
doc.rect(14, y, 182, 7);

doc.setFont("Helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(71, 85, 105);
doc.text("#", 17, y + 5);
doc.text("ITEM DESCRIPTION & SKU", 26, y + 5);
doc.text("QTY", 105, y + 5);
doc.text("UNIT PRICE (INR)", 122, y + 5);
doc.text("GST RATE", 152, y + 5);
doc.text("TOTAL (INR)", 175, y + 5);

y += 7;
doc.setFont("Helvetica", "normal");

(cn.items || []).forEach((item, idx) => {
  const fullItemText = String(item.name || item.description || "Item");
  const descLines = doc.splitTextToSize(fullItemText, 74);
  const rowHeight = Math.max(8.5, descLines.length * 4.2 + 3);

  doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
  doc.rect(14, y, 182, rowHeight, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, 182, rowHeight);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(String(idx + 1), 17, y + 5.5);

  doc.setFont("Helvetica", "bold");
  doc.text(descLines, 26, y + 5);

  doc.setFont("Helvetica", "normal");
  doc.text(String(item.quantity || 1), 108, y + 5.5);
  doc.text(Number(item.unitPrice || 0).toFixed(2), 125, y + 5.5);
  doc.text(`${item.gstPercent || 18}%`, 155, y + 5.5);
  doc.setFont("Helvetica", "bold");
  doc.text(Number(item.totalAmount || (item.quantity * item.unitPrice)).toFixed(2), 175, y + 5.5);

  y += rowHeight;
});

// Totals Box
y += 4;
doc.setFillColor(248, 250, 252);
doc.rect(118, y, 78, 28, "F");
doc.setDrawColor(226, 232, 240);
doc.rect(118, y, 78, 28);

doc.setFont("Helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(71, 85, 105);
doc.text("Taxable Subtotal:", 122, y + 6);
doc.text(`INR ${Number(cn.subtotal || 0).toFixed(2)}`, 190, y + 6, { align: "right" });

doc.text("GST Tax Total:", 122, y + 12);
doc.text(`INR ${Number(cn.totalTax || 0).toFixed(2)}`, 190, y + 12, { align: "right" });

doc.setDrawColor(226, 232, 240);
doc.line(122, y + 16, 192, y + 16);

doc.setFont("Helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(227, 0, 15);
doc.text("Total Credit:", 122, y + 23);
doc.text(`INR ${Number(cn.totalCreditAmount || 0).toFixed(2)}`, 190, y + 23, { align: "right" });

// Left notes box
doc.setFillColor(248, 250, 252);
doc.rect(14, y, 98, 28, "F");
doc.rect(14, y, 98, 28);

doc.setFont("Helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(71, 85, 105);
doc.text("TERMS & AUDIT NOTES:", 18, y + 6);

doc.setFont("Helvetica", "normal");
doc.setFontSize(7.5);
doc.setTextColor(100, 116, 139);
const splitNotes = doc.splitTextToSize(cn.notes || "Credit note issued subject to standard return policy.", 90);
doc.text(splitNotes, 18, y + 12);

// Signatures
y += 38;
doc.setFont("Helvetica", "bold");
doc.setFontSize(8.5);
doc.setTextColor(15, 23, 42);
doc.text("Authorized Signatory", 152, y);
doc.setFont("Helvetica", "normal");
doc.setFontSize(7.5);
doc.setTextColor(100, 116, 139);
doc.text("For EToSM TECHNOLOGY", 152, y + 5);

// Footer
doc.setFontSize(7.5);
doc.text("This is an official computer-generated Credit Note under GST provisions.", 14, 285);

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync('./scratch/test-cn.pdf', pdfBuffer);
console.log('PDF generated successfully! Size:', pdfBuffer.length);
