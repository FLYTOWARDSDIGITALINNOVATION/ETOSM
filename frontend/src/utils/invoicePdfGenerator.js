import { jsPDF } from "jspdf";

// ============================================================================
// ETOSM OFFICIAL TAX INVOICE VECTOR PDF GENERATOR
// Formatted precisely according to official EToSM client invoice template (2-Page)
// Page 1: Tax Invoice with Header, Billed-To, Line Items, Bank, Totals & Signature
// Page 2: HSN Summary Table with Tax Breakdowns & Official Footer
// ============================================================================

// Number to Words Converter for Indian Currency (Rupees & Paise)
export function numberToWordsINR(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) {
    return "Zero Rupees Only";
  }

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
    "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n) {
    if ((n = n.toString()).length > 9) return "Overflow";
    const n_array = ("000000000" + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return "";
    let str = "";
    str += Number(n_array[1]) !== 0 ? (a[Number(n_array[1])] || b[n_array[1][0]] + " " + a[n_array[1][1]]) + "Crore " : "";
    str += Number(n_array[2]) !== 0 ? (a[Number(n_array[2])] || b[n_array[2][0]] + " " + a[n_array[2][1]]) + "Lakh " : "";
    str += Number(n_array[3]) !== 0 ? (a[Number(n_array[3])] || b[n_array[3][0]] + " " + a[n_array[3][1]]) + "Thousand " : "";
    str += Number(n_array[4]) !== 0 ? (a[Number(n_array[4])] || b[n_array[4][0]] + " " + a[n_array[4][1]]) + "Hundred " : "";
    str += Number(n_array[5]) !== 0 ? (str !== "" ? "and " : "") + (a[Number(n_array[5])] || b[n_array[5][0]] + " " + a[n_array[5][1]]) : "";
    return str.trim();
  }

  const parts = Number(num).toFixed(2).split(".");
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  let result = "";
  if (rupees > 0) {
    result += convertChunk(rupees) + " Rupees";
  }
  if (paise > 0) {
    if (result) result += " and ";
    result += convertChunk(paise) + " Paise";
  }

  return (result ? result : "Zero Rupees") + " Only";
}

// Convert image URL to Data URL (base64) reliably in browser or Node
async function loadImageDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
}

// Draw vector Rupee currency symbol (₹) for crisp vector rendering at any scale
function drawRupee(doc, x, y, fontSize = 8.5, color = [30, 41, 59]) {
  doc.saveGraphicsState();
  doc.setDrawColor(...color);
  const size = fontSize * 0.3528 * 0.78; // pt to mm
  const w = size * 0.72;
  const lw = Math.max(0.18, size * 0.085);
  doc.setLineWidth(lw);

  // Top horizontal bar
  doc.line(x, y - size * 0.82, x + w, y - size * 0.82);
  // Second horizontal bar
  doc.line(x, y - size * 0.50, x + w * 0.88, y - size * 0.50);
  // Vertical stem
  doc.line(x + size * 0.12, y - size * 0.82, x + size * 0.12, y - size * 0.15);
  // Upper loop
  doc.roundedRect(x + size * 0.12, y - size * 0.82, w * 0.62, size * 0.40, 0.4, 0.4, "S");
  // Diagonal leg
  doc.line(x + size * 0.22, y - size * 0.36, x + w * 0.92, y + size * 0.04);

  doc.restoreGraphicsState();
  return w + 0.8;
}

// Draw Amount with Vector Rupee symbol
function drawCurrencyAmount(doc, amount, rightX, y, fontSize = 8.5, color = [30, 41, 59], bold = false) {
  doc.setFont("Helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  const formattedNum = Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const numWidth = doc.getTextWidth(formattedNum);
  const symbolWidth = fontSize * 0.3528 * 0.72 + 0.8;
  const rupeeX = rightX - numWidth - symbolWidth;

  drawRupee(doc, rupeeX, y, fontSize, color);
  doc.text(formattedNum, rightX, y, { align: "right" });
}

/**
 * Generate official EToSM 2-page Tax Invoice PDF matching client template
 * @param {Object} invoiceData - Invoice record or form state
 * @param {Object} customAssets - Optional pre-loaded base64 assets
 * @returns {Promise<jsPDF>} - Ready-to-save jsPDF document
 */
export async function generateEtosmInvoicePdf(invoiceData, customAssets = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const primaryRed = [197, 27, 36]; // EToSM Crimson Red #c51b24
  const darkSlate = [15, 23, 42];  // Slate 900
  const bodyText = [51, 65, 85];   // Slate 700
  const mutedText = [100, 116, 139]; // Slate 500
  const borderLine = [209, 213, 219]; // Gray 300
  const lightBg = [243, 244, 246]; // Gray 100

  // Pre-load images if not passed in customAssets
  let logoData = customAssets.logo || null;
  let signatureData = customAssets.signature || null;

  if (typeof window !== "undefined" || typeof fetch !== "undefined") {
    try {
      const [fLogo, fSig] = await Promise.all([
        logoData ? Promise.resolve(logoData) : loadImageDataUrl("/invoice_logo.png").then(d => d || loadImageDataUrl("/logo1.png")),
        signatureData ? Promise.resolve(signatureData) : loadImageDataUrl("/invoice_signature.png")
      ]);
      logoData = fLogo || logoData;
      signatureData = fSig || signatureData;
    } catch (e) {
      console.warn("Images could not be loaded via fetch, will fallback gracefully:", e);
    }
  }

  // Common Header Drawer (Used on Page 1 and Page 2)
  const drawPageHeader = (pageNum, totalPages) => {
    // 0. Top Elegant Curved Background Wave (Official EToSM Header Design)
    doc.saveGraphicsState();
    doc.setFillColor(248, 233, 233); // Soft pastel blush #f8e9e9 from official PDF
    doc.moveTo(210, 49.76);
    doc.curveTo(196.83, 51.90, 168.78, 53.99, 118.04, 47.57);
    doc.curveTo(65.37, 40.91, 21.97, 43.41, 0, 45.62);
    doc.lineTo(0, 0);
    doc.lineTo(210, 0);
    doc.lineTo(210, 49.76);
    doc.fill();
    doc.restoreGraphicsState();

    // 1. Logo (Top Left)
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 11, 10, 44, 12.1);
      } catch (e) {
        drawFallbackLogo(11, 10);
      }
    } else {
      drawFallbackLogo(11, 10);
    }

    // 2. Company Address (Top Right - Aligned to right 198mm)
    const rightX = 198;
    doc.setTextColor(...darkSlate);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("EToSM Technology", rightX, 14, { align: "right" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...bodyText);
    doc.text("2/167B Merkukadu, Ramapuram", rightX, 19, { align: "right" });
    doc.text("Tiruchengodu, Namakkal, Tamil Nadu,", rightX, 24, { align: "right" });
    doc.text("India,637202", rightX, 29, { align: "right" });

    doc.text("Mobile:+91 8807080216", rightX, 36, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(...darkSlate);
    doc.text("GSTIN: 33JUAPK4885G1ZD", rightX, 43, { align: "right" });
  };

  const drawFallbackLogo = (x, y) => {
    doc.setFillColor(...primaryRed);
    doc.rect(x, y, 9, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.text("✓", x + 2.5, y + 6.5);

    doc.setTextColor(...darkSlate);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ETOSM", x + 12, y + 7);
    doc.setFontSize(6.5);
    doc.setFont("Helvetica", "normal");
    doc.text("TECHNOLOGY", x + 12, y + 10.5);
  };

  // Common Footer Drawer (Used on Page 1 and Page 2)
  const drawPageFooter = (pageNum, totalPages) => {
    // Subtle soft bottom wave shape from official PDF
    doc.saveGraphicsState();
    doc.setFillColor(244, 246, 248);
    doc.moveTo(89.81, 269.75);
    doc.curveTo(144.23, 276.88, 188.76, 273.88, 210, 271.54);
    doc.lineTo(210, 297);
    doc.lineTo(0, 297);
    doc.lineTo(0, 267.14);
    doc.curveTo(13.93, 265.07, 41.65, 263.44, 89.81, 269.75);
    doc.fill();
    doc.restoreGraphicsState();

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...bodyText);
    doc.text("info@etosmtechnology.in", 105, 285, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.text(`Page ${pageNum} / ${totalPages}`, 105, 290, { align: "center" });
  };

  // ==========================================================================
  // PAGE 1: TAX INVOICE
  // ==========================================================================
  drawPageHeader(1, 2);

  // 1. Customer Billed-To Block (Left Side)
  const custX = 11;
  let custY = 53;

  const customerName = invoiceData.customerName || invoiceData.customer?.name || "Customer / Organization";
  const customerAddress = invoiceData.customerAddress || invoiceData.customer?.address || "";
  const customerGstin = invoiceData.customerGstin || invoiceData.customer?.gstin || "";
  const placeOfSupply = invoiceData.placeOfSupply || "Tamil Nadu";

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkSlate);
  doc.text(customerName, custX, custY);
  custY += 4.5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...bodyText);

  if (customerAddress) {
    const addrLines = doc.splitTextToSize(customerAddress, 85);
    addrLines.forEach((line) => {
      doc.text(line, custX, custY);
      custY += 4.2;
    });
  } else {
    doc.text("Tamil Nadu TN", custX, custY);
    custY += 4.2;
    doc.text("India", custX, custY);
    custY += 4.2;
  }

  if (customerGstin) {
    doc.text(`GSTIN: ${customerGstin}`, custX, custY);
    custY += 4.5;
  }
  doc.text(`Place of supply: ${placeOfSupply}`, custX, custY);

  // 2. Tax Invoice Title
  const titleY = 91;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...primaryRed);
  const invNumberText = invoiceData.invoiceNumber || "INV26-27-001";
  doc.text(`Tax Invoice ${invNumberText}`, 11, titleY);

  // 3. 4-Column Metadata Card
  const metaY = 96;
  doc.setFillColor(...lightBg);
  doc.roundedRect(11, metaY, 187, 14, 1.5, 1.5, "F");

  const metaCols = [
    { label: "Invoice Date", val: formatDate(invoiceData.invoiceDate || Date.now()), x: 16 },
    { label: "Due Date", val: formatDate(invoiceData.dueDate || invoiceData.invoiceDate || Date.now()), x: 62 },
    { label: "Source", val: invoiceData.source || invoiceData.orderId || invoiceData.invoiceNumber || "INV/2026/001", x: 108 },
    { label: "Reference", val: invoiceData.reference || invoiceData.paymentReference || invoiceData.invoiceNumber || "INV/2026/001", x: 154 }
  ];

  metaCols.forEach((col) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.text(col.label, col.x, metaY + 5.2);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);
    doc.text(String(col.val), col.x, metaY + 10.5);
  });

  // 4. Line Items Table
  let tableY = 117;
  const colX = {
    desc: 14,
    hsn: 96,
    qty: 122,
    unitPrice: 150,
    taxes: 166,
    amount: 196
  };

  // Table Header
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.25);
  doc.line(11, tableY, 198, tableY);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...bodyText);
  doc.text("Description", colX.desc, tableY + 4.8);
  doc.text("HSN/SAC", colX.hsn, tableY + 4.8);
  doc.text("Quantity", colX.qty, tableY + 4.8, { align: "center" });
  doc.text("Unit Price", colX.unitPrice, tableY + 4.8, { align: "right" });
  doc.text("Taxes", colX.taxes, tableY + 4.8);
  doc.text("Amount", colX.amount, tableY + 4.8, { align: "right" });

  tableY += 6.5;
  doc.line(11, tableY, 198, tableY);
  tableY += 2;

  // Table Rows - filter out any empty / unfilled draft rows
  const rawItems = Array.isArray(invoiceData.items) ? invoiceData.items : [];
  const validItems = rawItems.filter((item) => {
    if (!item) return false;
    const name = (item.name || item.description || "").trim();
    // Empty name means blank uncompleted draft row
    if (!name) return false;
    // Dummy placeholder with 0 price means unconfigured row
    if (
      name.toLowerCase() === "product item" &&
      Number(item.unitPrice || 0) === 0 &&
      Number(item.totalAmount || 0) === 0
    ) {
      return false;
    }
    return true;
  });

  const fallbackItem = [
    {
      name: "Standard Electronic Component",
      sku: "ET-COMP-01",
      quantity: 1,
      unitPrice: Number(invoiceData.grossSubtotal || invoiceData.grandTotal || 0),
      taxableAmount: Number(invoiceData.grossSubtotal || invoiceData.grandTotal || 0),
      gstPercent: 18,
      hsn: "8507"
    }
  ];

  const items = validItems.length > 0
    ? validItems
    : (rawItems.length === 0 && Number(invoiceData.grandTotal || invoiceData.grossSubtotal || 0) > 0
        ? fallbackItem
        : []);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);

  items.forEach((item) => {
    const startRowY = tableY;
    const itemName = (item.name || item.description || "").trim() || "Product Item";
    const skuBadge = item.sku ? `[${item.sku}] ` : "";
    const fullDesc = `${skuBadge}${itemName}`;

    const descLines = doc.splitTextToSize(fullDesc, 78);
    const rowHeight = Math.max(8, descLines.length * 4.2 + 3);

    // Render multiline description
    descLines.forEach((line, lIdx) => {
      doc.text(line, colX.desc, startRowY + 3.8 + lIdx * 4.2);
    });

    const baselineY = startRowY + 3.8;
    const hsnVal = item.hsn || item.hsnCode || "8507";
    doc.text(hsnVal, colX.hsn, baselineY);

    const qtyText = `${Number(item.quantity || 1).toFixed(2)} Units`;
    doc.text(qtyText, colX.qty, baselineY, { align: "center" });

    const priceText = Number(item.unitPrice || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    doc.text(priceText, colX.unitPrice, baselineY, { align: "right" });

    const taxPercent = item.gstPercent !== undefined ? item.gstPercent : 18;
    doc.text(`GST ${taxPercent}%`, colX.taxes, baselineY);

    const lineAmount = item.taxableAmount !== undefined
      ? item.taxableAmount
      : (Number(item.unitPrice || 0) * Number(item.quantity || 1));

    drawCurrencyAmount(doc, lineAmount, colX.amount, baselineY, 8, darkSlate, false);

    tableY += rowHeight;
    doc.setDrawColor(...borderLine);
    doc.setLineWidth(0.15);
    doc.line(11, tableY, 198, tableY);
    tableY += 3;
  });

  // 5. Bottom Section: Split Left (Payment & Terms) & Right (Calculations Box)
  let splitY = Math.max(tableY + 4, 168);

  // LEFT COLUMN: Payment terms & Electronic document disclaimer
  const leftX = 11;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text(`Payment terms: ${invoiceData.paymentTerms || "Immediate Payment"}`, leftX, splitY + 4);

  const invNum = invoiceData.invoiceNumber || "INV26-27-001";
  doc.text("Payment Communication: ", leftX, splitY + 12);
  doc.setFont("Helvetica", "bold");
  doc.text(invNum, leftX + 40, splitY + 12);

  const bankAcc = invoiceData.bankDetails?.accountNumber || "7776386819";
  const bankName = invoiceData.bankDetails?.bankName || "INDIAN BANK";
  doc.setFont("Helvetica", "normal");
  doc.text("on this account: ", leftX, splitY + 17);
  doc.setFont("Helvetica", "bold");
  doc.text(`${bankAcc} - ${bankName}`, leftX + 26, splitY + 17);

  // Disclaimer text
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  const disclaimer =
    "This is an electronically generated document and hence does not require a physical signature. By completing the order on www.etosmtechnology.in, you agree to all the terms on \"Terms of Service\" Page on www.etosmtechnology.in.";
  const discLines = doc.splitTextToSize(disclaimer, 84);
  discLines.forEach((dLine, dIdx) => {
    doc.text(dLine, leftX, splitY + 26 + dIdx * 3.4);
  });

  // RIGHT COLUMN: Untaxed, GST, Totals Box
  const summaryLeft = 120;
  const summaryRight = 198;
  let calcY = splitY;

  // Background for Untaxed Amount
  doc.setFillColor(...lightBg);
  doc.rect(summaryLeft, calcY, summaryRight - summaryLeft, 6.5, "F");
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text("Untaxed Amount", summaryLeft + 3, calcY + 4.5);
  const untaxedVal = invoiceData.grossSubtotal !== undefined
    ? invoiceData.grossSubtotal
    : (invoiceData.taxableSubtotal || invoiceData.grandTotal || 0);
  drawCurrencyAmount(doc, untaxedVal, summaryRight - 3, calcY + 4.5, 8.5, darkSlate, false);
  calcY += 6.5;

  // Tax Rows
  const isInterState = Boolean(invoiceData.isInterState);
  const totalTax = Number(invoiceData.totalTax || 0);

  if (isInterState) {
    doc.text("IGST", summaryLeft + 3, calcY + 4.5);
    drawCurrencyAmount(doc, invoiceData.igstTotal || totalTax, summaryRight - 3, calcY + 4.5, 8.5, darkSlate, false);
    calcY += 6.5;
  } else {
    // SGST & CGST split evenly
    const halfTax = invoiceData.sgstTotal !== undefined ? invoiceData.sgstTotal : totalTax / 2;
    doc.text("SGST/UTGST", summaryLeft + 3, calcY + 4.5);
    drawCurrencyAmount(doc, halfTax, summaryRight - 3, calcY + 4.5, 8.5, darkSlate, false);
    calcY += 6.5;

    // Background for CGST
    doc.setFillColor(...lightBg);
    doc.rect(summaryLeft, calcY, summaryRight - summaryLeft, 6.5, "F");
    doc.text("CGST", summaryLeft + 3, calcY + 4.5);
    drawCurrencyAmount(doc, halfTax, summaryRight - 3, calcY + 4.5, 8.5, darkSlate, false);
    calcY += 6.5;
  }

  // Discount row if present
  if (Number(invoiceData.totalDiscount || 0) > 0) {
    doc.text("Discount", summaryLeft + 3, calcY + 4.5);
    doc.text(`- ₹ ${Number(invoiceData.totalDiscount).toFixed(2)}`, summaryRight - 3, calcY + 4.5, { align: "right" });
    calcY += 6.5;
  }

  // Shipping row if present
  if (Number(invoiceData.shippingCharges || 0) > 0) {
    doc.text("Shipping & Freight", summaryLeft + 3, calcY + 4.5);
    drawCurrencyAmount(doc, invoiceData.shippingCharges, summaryRight - 3, calcY + 4.5, 8.5, darkSlate, false);
    calcY += 6.5;
  }

  // Total Line Divider
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.3);
  doc.line(summaryLeft, calcY, summaryRight, calcY);

  // Total Row in Red
  calcY += 5;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryRed);
  doc.text("Total", summaryLeft + 3, calcY);
  drawCurrencyAmount(doc, invoiceData.grandTotal || 0, summaryRight - 3, calcY, 9.5, primaryRed, true);

  calcY += 6;

  // Total Amount in Words
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text("Total amount in words:", summaryRight, calcY, { align: "right" });
  calcY += 4;

  const words = invoiceData.amountInWords || numberToWordsINR(invoiceData.grandTotal || 0);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(...darkSlate);
  doc.text(words, summaryRight, calcY, { align: "right" });

  // 6. Authorized Signatory Block
  let signY = Math.max(calcY + 12, splitY + 44);
  const signX = 160;

  if (signatureData) {
    try {
      doc.addImage(signatureData, "PNG", signX - 18, signY - 11, 36, 12.7);
    } catch (e) {
      // ignore
    }
  }

  doc.setDrawColor(...darkSlate);
  doc.setLineWidth(0.3);
  doc.line(signX - 25, signY + 3, signX + 25, signY + 3);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text("Authorized signatory", signX, signY + 7.5, { align: "center" });

  drawPageFooter(1, 2);

  // ==========================================================================
  // PAGE 2: HSN SUMMARY TABLE
  // ==========================================================================
  doc.addPage();
  drawPageHeader(2, 2);

  // Title: HSN Summary
  const hsnTitleY = 52;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...darkSlate);
  doc.text("HSN Summary", 11, hsnTitleY);

  // HSN Table Header
  let hsnTableY = 60;
  doc.setFillColor(...lightBg);
  doc.rect(11, hsnTableY, 187, 7, "F");

  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.25);
  doc.line(11, hsnTableY, 198, hsnTableY);
  doc.line(11, hsnTableY + 7, 198, hsnTableY + 7);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...bodyText);

  const hsnCols = {
    hsn: 14,
    qty: 55,
    rate: 85,
    taxable: 125,
    sgst: 162,
    cgst: 196
  };

  doc.text("HSN/SAC", hsnCols.hsn, hsnTableY + 4.8);
  doc.text("Quantity", hsnCols.qty, hsnTableY + 4.8);
  doc.text("Rate %", hsnCols.rate, hsnTableY + 4.8);
  doc.text("Taxable Value", hsnCols.taxable, hsnTableY + 4.8, { align: "right" });
  if (isInterState) {
    doc.text("IGST", hsnCols.cgst, hsnTableY + 4.8, { align: "right" });
  } else {
    doc.text("SGST/UTGST", hsnCols.sgst, hsnTableY + 4.8, { align: "right" });
    doc.text("CGST", hsnCols.cgst, hsnTableY + 4.8, { align: "right" });
  }

  hsnTableY += 7;

  // Group items by HSN Code
  const hsnMap = {};
  items.forEach((item) => {
    const code = item.hsn || item.hsnCode || "8507";
    const qty = Number(item.quantity || 1);
    const taxable = item.taxableAmount !== undefined
      ? Number(item.taxableAmount)
      : (Number(item.unitPrice || 0) * qty);
    const gstRate = item.gstPercent !== undefined ? Number(item.gstPercent) : 18;

    if (!hsnMap[code]) {
      hsnMap[code] = {
        hsn: code,
        quantity: 0,
        rate: gstRate,
        taxableValue: 0
      };
    }
    hsnMap[code].quantity += qty;
    hsnMap[code].taxableValue += taxable;
  });

  // Render HSN summary rows
  Object.values(hsnMap).forEach((hsnRow) => {
    const rowY = hsnTableY + 5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);

    doc.text(hsnRow.hsn, hsnCols.hsn, rowY);
    doc.text(`${hsnRow.quantity.toFixed(1)} (Units)`, hsnCols.qty, rowY);
    doc.text(`${hsnRow.rate.toFixed(1)}`, hsnCols.rate, rowY);

    drawCurrencyAmount(doc, hsnRow.taxableValue, hsnCols.taxable, rowY, 8.5, darkSlate, false);

    const taxAmount = (hsnRow.taxableValue * hsnRow.rate) / 100;
    if (isInterState) {
      drawCurrencyAmount(doc, taxAmount, hsnCols.cgst, rowY, 8.5, darkSlate, false);
    } else {
      const halfTax = taxAmount / 2;
      drawCurrencyAmount(doc, halfTax, hsnCols.sgst, rowY, 8.5, darkSlate, false);
      drawCurrencyAmount(doc, halfTax, hsnCols.cgst, rowY, 8.5, darkSlate, false);
    }

    hsnTableY += 7.5;
    doc.setDrawColor(...borderLine);
    doc.setLineWidth(0.15);
    doc.line(11, hsnTableY, 198, hsnTableY);
  });

  drawPageFooter(2, 2);

  return doc;
}

// Trigger direct browser print dialog for the generated official Tax Invoice PDF
export async function printEtosmInvoicePdf(invoiceData, customAssets = {}) {
  const doc = await generateEtosmInvoicePdf(invoiceData, customAssets);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");

  // Open in new window/tab for full PDF preview & print dialog
  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
    // Popup was blocked by browser, fallback to hidden iframe print
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Iframe print error:", err);
      }
    };
  }
}

// Helper: Format Date string as DD/MM/YYYY
function formatDate(d) {
  if (!d) return new Date().toLocaleDateString("en-GB");
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return String(d);
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}
