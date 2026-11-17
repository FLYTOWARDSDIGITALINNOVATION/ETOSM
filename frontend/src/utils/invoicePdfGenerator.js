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

// Clean and format concise item description (sanitizes HTML tags and clamps to concise length)
export function cleanConciseDescription(desc, maxLen = 120) {
  if (!desc) return "";
  let clean = String(desc).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length > maxLen) {
    clean = clean.slice(0, maxLen).trim() + "…";
  }
  return clean;
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

// Draw official vector Rupee currency symbol (₹) with smooth curves for crisp rendering
function drawRupee(doc, x, y, fontSize = 8.5, color = [30, 41, 59], bold = false) {
  doc.saveGraphicsState();
  doc.setDrawColor(...color);

  // Helvetica cap-height ratio is ~0.72 of font size
  const ptToMm = 0.352778;
  const H = fontSize * ptToMm * 0.72;
  const scale = H / 18;
  const lw = bold ? Math.max(0.22, H * 0.115) : Math.max(0.16, H * 0.082);

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

  // 3. Semicircular loop: starts at (9, 3), curves out to CP(15.667, 3) and (15.667, 13), ends at (9, 13), then line to (6, 13)
  doc.moveTo(sx(9), sy(3));
  doc.curveTo(sx(9 + 6.667), sy(3), sx(9 + 6.667), sy(13), sx(9), sy(13));
  doc.lineTo(sx(6), sy(13));
  doc.stroke();

  // 4. Diagonal leg: (6, 13) -> (14.5, 21)
  doc.line(sx(6), sy(13), sx(14.5), sy(21));

  doc.restoreGraphicsState();
  return 12 * scale;
}

// Draw Amount with Vector Rupee symbol
function drawCurrencyAmount(doc, amount, rightX, y, fontSize = 8.5, color = [30, 41, 59], bold = false) {
  doc.setFont("Helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  const numVal = Number(amount || 0);
  const isNegative = numVal < 0;
  const absVal = Math.abs(numVal);

  const formattedNum = absVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const ptToMm = 0.352778;
  const H = fontSize * ptToMm * 0.72;
  const scale = H / 18;
  const glyphWidth = 12 * scale;
  const spacing = Math.max(0.7, 2.2 * scale);

  const numWidth = doc.getTextWidth(formattedNum);
  const minusText = "- ";
  const minusWidth = isNegative ? doc.getTextWidth(minusText) : 0;
  const totalOffset = numWidth + glyphWidth + spacing + minusWidth;
  const startX = rightX - totalOffset;

  if (isNegative) {
    doc.text(minusText, startX, y);
  }
  const rupeeX = startX + minusWidth;
  drawRupee(doc, rupeeX, y, fontSize, color, bold);
  doc.text(formattedNum, rightX, y, { align: "right" });
}

/**
 * Generate official EToSM 2-page Tax Invoice PDF matching client template
 * @param {Object} invoiceData - Invoice record or form state
 * @param {Object} customAssets - Optional pre-loaded base64 assets
 * @returns {Promise<jsPDF>} - Ready-to-save jsPDF document
 */
export async function generateEtosmInvoicePdf(invoiceData, customAssets = {}, existingDoc = null) {
  const doc = existingDoc || new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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
    doc.moveTo(210, 42.5);
    doc.curveTo(196, 44, 168, 45, 118, 39);
    doc.curveTo(65, 33, 21, 35, 0, 37);
    doc.lineTo(0, 0);
    doc.lineTo(210, 0);
    doc.lineTo(210, 42.5);
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
    doc.text("EToSM Technology", rightX, 9.5, { align: "right" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...bodyText);
    doc.text("2/167B Merkukadu, Ramapuram", rightX, 13.8, { align: "right" });
    doc.text("Tiruchengodu, Namakkal, Tamil Nadu,", rightX, 18.0, { align: "right" });
    doc.text("India,637202", rightX, 22.2, { align: "right" });

    doc.text("Mobile:+91 8807080216", rightX, 27.2, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(...darkSlate);
    doc.text("GSTIN: 33JUAPK4885G1ZD", rightX, 32.5, { align: "right" });
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

  // 1. Customer Billed-To Block (Left Side) & Consignee Shipped-To Block (Right Side)
  const custX = 11;
  const shipX = 108;
  const blockStartY = 50;

  const customerName = invoiceData.customerName || invoiceData.customer?.name || "Customer / Organization";
  const customerAddress = invoiceData.customerAddress || invoiceData.customer?.address || "";
  const customerGstin = invoiceData.customerGstin || invoiceData.customer?.gstin || "";
  const placeOfSupply = invoiceData.placeOfSupply || "Tamil Nadu";

  const hasSeparateShipping = Boolean(
    invoiceData.shippingSameAsBilling === false &&
    invoiceData.shippingAddress &&
    invoiceData.shippingAddress.trim() !== "" &&
    invoiceData.shippingAddress.trim() !== (customerAddress || "").trim()
  );

  const shippingName = invoiceData.shippingName || customerName;
  const shippingAddress = invoiceData.shippingAddress || customerAddress;
  const shippingPhone = invoiceData.shippingPhone || invoiceData.customerPhone || "";

  // Line 1: Section Headers (Locked to exact same horizontal baseline)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryRed);
  doc.text("BILLED TO (BUYER):", custX, blockStartY);
  doc.text("SHIPPED TO (CONSIGNEE):", shipX, blockStartY);

  // Line 2: Entity / Customer Names (Locked to exact same horizontal baseline)
  const nameY = blockStartY + 4.2;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text(customerName.slice(0, 42), custX, nameY);
  doc.text(shippingName.slice(0, 42), shipX, nameY);

  // Line 3 & 4: Addresses (Locked to exact same horizontal baseline)
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...bodyText);

  const addrStartY = nameY + 4.2;
  const addrLines = customerAddress ? doc.splitTextToSize(customerAddress, 85).slice(0, 2) : ["Tamil Nadu TN, India"];
  addrLines.forEach((line, idx) => {
    doc.text(line, custX, addrStartY + (idx * 3.8));
  });

  const targetShipAddr = hasSeparateShipping ? shippingAddress : customerAddress;
  const shipAddrLines = targetShipAddr ? doc.splitTextToSize(targetShipAddr, 85).slice(0, 2) : ["Tamil Nadu TN, India"];
  shipAddrLines.forEach((line, idx) => {
    doc.text(line, shipX, addrStartY + (idx * 3.8));
  });

  // Line 5: Footnote / Place of Supply & Consignee Note (Locked to exact same baseline)
  const detailsY = addrStartY + (Math.max(addrLines.length, shipAddrLines.length) * 3.8);

  let leftDetailY = detailsY;
  if (customerGstin) {
    doc.text(`GSTIN: ${customerGstin}`, custX, leftDetailY);
    leftDetailY += 3.8;
  }
  doc.text(`Place of supply: ${placeOfSupply}`, custX, leftDetailY);

  let rightDetailY = detailsY;
  if (hasSeparateShipping && shippingPhone) {
    doc.text(`Contact: ${shippingPhone}`, shipX, rightDetailY);
    rightDetailY += 3.8;
  } else if (!hasSeparateShipping) {
    doc.setFont("Helvetica", "italic");
    doc.setTextColor(...mutedText);
    doc.text("Same as billing address", shipX, rightDetailY);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(...bodyText);
    rightDetailY += 3.8;
  }

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

  // Determine Source Order Number and Quotation Reference cleanly (never duplicate invoice number)
  const rawSource = invoiceData.sourceOrderNumber || invoiceData.orderNumber || invoiceData.source || invoiceData.orderId || "";
  const sourceVal = rawSource && rawSource !== invoiceData.invoiceNumber ? rawSource : "Direct Order";

  const rawRef = invoiceData.quotationReference || invoiceData.quotationNumber || invoiceData.reference || (invoiceData.paymentReference && invoiceData.paymentReference !== invoiceData.invoiceNumber ? invoiceData.paymentReference : "");
  const refVal = rawRef && rawRef !== invoiceData.invoiceNumber ? rawRef : "Standard Sale";

  const metaCols = [
    { label: "Invoice Date", val: formatDate(invoiceData.invoiceDate || Date.now()), x: 16 },
    { label: "Due Date", val: formatDate(invoiceData.dueDate || invoiceData.invoiceDate || Date.now()), x: 62 },
    { label: "Source Order #", val: sourceVal, x: 108 },
    { label: "Quotation Ref", val: refVal, x: 154 }
  ];

  metaCols.forEach((col) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.text(col.label, col.x, metaY + 5.2);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);

    const maxLen = 22;
    const strVal = String(col.val || "").trim();
    const displayVal = strVal.length > maxLen ? strVal.slice(0, maxLen - 1) + "…" : strVal;
    doc.text(displayVal, col.x, metaY + 10.5);
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
    const isInclusive = Boolean(item.isTaxInclusive);
    const incBadge = isInclusive ? ` (Incl. GST ₹${Number(item.enteredPrice || item.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : "";
    const fullDesc = `${skuBadge}${itemName}${incBadge}`;

    const descLines = doc.splitTextToSize(fullDesc, 78);
    const rowHeight = Math.max(8, descLines.length * 4.2 + 3);

    // Render multiline description
    descLines.forEach((line, lIdx) => {
      doc.text(line, colX.desc, startRowY + 3.8 + lIdx * 4.2);
    });

    const baselineY = startRowY + 3.8;
    const hsnVal = item.hsn || item.hsnCode || "8507";
    doc.text(hsnVal, colX.hsn, baselineY);

    const qtyVal = Number(item.quantity || 1);
    const qtyText = `${qtyVal.toFixed(2)} Units`;
    doc.text(qtyText, colX.qty, baselineY, { align: "center" });

    const taxPercent = item.gstPercent !== undefined ? item.gstPercent : 18;
    const baseUnitPrice = item.baseUnitPrice !== undefined
      ? item.baseUnitPrice
      : (item.taxableAmount !== undefined && qtyVal > 0
          ? (item.taxableAmount / qtyVal)
          : (isInclusive ? (Number(item.unitPrice || 0) / (1 + taxPercent / 100)) : Number(item.unitPrice || 0)));

    const priceText = Number(baseUnitPrice || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    doc.text(priceText, colX.unitPrice, baselineY, { align: "right" });

    doc.text(`GST ${taxPercent}%`, colX.taxes, baselineY);

    const lineAmount = item.taxableAmount !== undefined
      ? item.taxableAmount
      : (Number(baseUnitPrice || 0) * qtyVal);

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
    drawCurrencyAmount(doc, -Math.abs(Number(invoiceData.totalDiscount)), summaryRight - 3, calcY + 4.5, 8.5, darkSlate, false);
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

/**
 * Generate official EToSM Credit Note PDF matching official Tax Invoice vector template
 * @param {Object} cn - Credit note record or form state
 * @param {Object} customAssets - Optional pre-loaded base64 assets
 * @returns {Promise<jsPDF>} - Ready-to-save jsPDF document
 */
export async function generateEtosmCreditNotePdf(cn, customAssets = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const primaryRed = [227, 0, 15];   // Official EToSM Crimson Red #e3000f
  const darkSlate = [15, 23, 42];    // Slate 900
  const bodyText = [51, 65, 85];     // Slate 700
  const mutedText = [100, 116, 139]; // Slate 500
  const borderLine = [226, 232, 240];// Border Slate 200
  const cardBg = [248, 250, 252];    // Card background #f8fafc
  const headerBg = [241, 245, 249];  // Table header #f1f5f9

  // Pre-load images if not passed in customAssets
  let logoData = customAssets.logo || null;
  let signatureData = customAssets.signature || null;

  if (typeof window !== "undefined" || typeof fetch !== "undefined") {
    try {
      const [fLogo, fSig] = await Promise.all([
        logoData ? Promise.resolve(logoData) : loadImageDataUrl("/invoice_logo.png").then((d) => d || loadImageDataUrl("/logo1.png")),
        signatureData ? Promise.resolve(signatureData) : loadImageDataUrl("/invoice_signature.png")
      ]);
      logoData = fLogo || logoData;
      signatureData = fSig || signatureData;
    } catch (e) {
      console.warn("Images could not be loaded via fetch, will fallback gracefully:", e);
    }
  }

  // 1. Top Red Brand Stripe
  doc.setFillColor(...primaryRed);
  doc.rect(0, 0, 210, 4, "F");

  // 2. Company Header
  const rightX = 196;
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", 14, 9, 44, 12);
    } catch (e) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...primaryRed);
      doc.text("EToSM", 14, 17);
      doc.setFontSize(7.5);
      doc.setTextColor(...darkSlate);
      doc.text("TECHNOLOGY", 14, 21.5);
    }
  } else {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...primaryRed);
    doc.text("EToSM", 14, 17);
    doc.setFontSize(7.5);
    doc.setTextColor(...darkSlate);
    doc.text("TECHNOLOGY", 14, 21.5);
  }

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkSlate);
  doc.text("EToSM Technology", rightX, 12, { align: "right" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...bodyText);
  doc.text("2/167, Merkukadu, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu - 637202", rightX, 16.5, { align: "right" });
  doc.text("Mobile: +91 88070 80216 | Email: support@etosmtechnology.in", rightX, 21, { align: "right" });
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(...darkSlate);
  doc.text("GSTIN: 33AAACE1234F1Z5", rightX, 25.5, { align: "right" });

  // Thin Header Divider
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.25);
  doc.line(14, 29, 196, 29);

  // 3. Document Eyebrow, Title & Date (Matching Preview Modal)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primaryRed);
  doc.text("OFFICIAL CREDIT DOCUMENT", 14, 35.5);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...darkSlate);
  doc.text(`Credit Note #${cn.creditNoteNumber || "CN-2026-0001"}`, 14, 42.5);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text(`Issued on ${formatDate(cn.creditNoteDate || Date.now())}`, 14, 47.5);

  // 4. Two Cards Side-by-Side (Matching Preview Modal preview-top-grid)
  const cardY = 51;
  const cardW = 88;
  const cardH = 43;

  const pos = String(cn.placeOfSupply || "33 - Tamil Nadu").trim();
  const isInterState = cn.isInterState !== undefined
    ? Boolean(cn.isInterState)
    : (!pos.includes("33") && !pos.toLowerCase().includes("tamil nadu"));

  // Card 1: CREDIT ISSUED TO
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderLine);
  doc.roundedRect(14, cardY, cardW, cardH, 2, 2, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text("CREDIT ISSUED TO:", 18, cardY + 6);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...primaryRed);
  doc.text(String(cn.customerName || "Valued Customer"), 18, cardY + 11.5);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...bodyText);
  let cY = cardY + 16;
  if (cn.customerCompany) {
    doc.text(String(cn.customerCompany), 18, cY);
    cY += 4.2;
  }
  if (cn.customerPhone) {
    doc.text(`Phone: ${cn.customerPhone}`, 18, cY);
    cY += 4.2;
  }
  if (cn.customerAddress) {
    const addrLines = doc.splitTextToSize(`Address: ${cn.customerAddress}`, 80);
    addrLines.slice(0, 2).forEach((l) => {
      doc.text(l, 18, cY);
      cY += 4.0;
    });
  }
  if (cn.customerGstin) {
    doc.setFont("Helvetica", "bold");
    doc.text(`GSTIN: ${cn.customerGstin.toUpperCase()}`, 18, cY);
    doc.setFont("Helvetica", "normal");
  }

  // Card 2: DOCUMENT DETAILS
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderLine);
  doc.roundedRect(108, cardY, cardW, cardH, 2, 2, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text("DOCUMENT DETAILS:", 112, cardY + 6);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...bodyText);

  doc.text("Credit Note #:", 112, cardY + 11.5);
  doc.setFont("Helvetica", "bold");
  doc.text(String(cn.creditNoteNumber || ""), 148, cardY + 11.5);

  doc.setFont("Helvetica", "normal");
  doc.text("Original Invoice #:", 112, cardY + 16);
  doc.setFont("Helvetica", "bold");
  doc.text(String(cn.invoiceNumber ? `#${cn.invoiceNumber}` : "Standalone"), 148, cardY + 16);

  doc.setFont("Helvetica", "normal");
  doc.text("Reason:", 112, cardY + 20.5);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(...primaryRed);
  doc.text(String(cn.reason || "Goods Returned"), 148, cardY + 20.5);
  doc.setTextColor(...bodyText);

  doc.setFont("Helvetica", "normal");
  doc.text("Status:", 112, cardY + 25);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(String(cn.status || "Issued"), 148, cardY + 25);
  doc.setTextColor(...bodyText);

  doc.setFont("Helvetica", "normal");
  doc.text("Place of Supply:", 112, cardY + 29.5);
  doc.setFont("Helvetica", "bold");
  doc.text(pos, 148, cardY + 29.5);

  doc.setFont("Helvetica", "normal");
  doc.text("Tax Regime:", 112, cardY + 34);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(...darkSlate);
  doc.text(isInterState ? "Inter-State (IGST 100%)" : "Intra-State (CGST + SGST)", 148, cardY + 34);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(...bodyText);

  if (cn.refundMode) {
    doc.text("Refund Method:", 112, cardY + 38.5);
    doc.text(String(cn.refundMode), 148, cardY + 38.5);
  }

  // 5. Line Items Table (Matching Preview Modal Columns & Content)
  let tableY = 98;
  const colX = {
    idx: 18,
    desc: 26,
    qty: 114,
    unitPrice: 142,
    gst: 160,
    total: 192
  };

  // Header Bar
  doc.setFillColor(...headerBg);
  doc.setDrawColor(...borderLine);
  doc.rect(14, tableY, 182, 7.5, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("#", colX.idx, tableY + 5);
  doc.text("Item Description", colX.desc, tableY + 5);
  doc.text("Qty", colX.qty, tableY + 5, { align: "center" });
  doc.text("Unit Price", colX.unitPrice, tableY + 5, { align: "right" });
  doc.text("GST", colX.gst, tableY + 5, { align: "center" });
  doc.text("Total Credit", colX.total, tableY + 5, { align: "right" });

  tableY += 7.5;

  // Table Rows: Concise Item Description & Return Context
  const rawItems = Array.isArray(cn.items) ? cn.items : [];
  const validItems = rawItems.filter((i) => i && (i.name || i.title || i.productName));
  const items = validItems.length > 0 ? validItems : [
    {
      name: "Returned Electronic Components",
      quantity: 1,
      unitPrice: Number(cn.subtotal || cn.totalCreditAmount || 0),
      totalAmount: Number(cn.totalCreditAmount || cn.subtotal || 0),
      gstPercent: 18
    }
  ];

  items.forEach((item, idx) => {
    const rawName = String(item.name || item.title || item.productName || "Credit Note Item").trim();
    const cleanName = rawName.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const skuPrefix = item.sku && !cleanName.toLowerCase().includes(item.sku.toLowerCase()) ? `[${item.sku}] ` : "";
    const fullTitle = `${skuPrefix}${cleanName}`;

    // Clean & truncate concise description (strip HTML tags, up to 120 chars, max 2 wrapped lines)
    const rawDesc = String(item.description || "").trim();
    const cleanDesc = cleanConciseDescription(rawDesc, 120);
    const hasDesc = cleanDesc !== "" && cleanDesc.toLowerCase() !== cleanName.toLowerCase();

    // Dynamically wrap title and concise description to 82mm column width
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    const titleLines = doc.splitTextToSize(fullTitle, 82);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.2);
    const descLines = hasDesc ? doc.splitTextToSize(cleanDesc, 82).slice(0, 2) : [];

    const titleH = titleLines.length * 3.8;
    const descH = descLines.length > 0 ? (descLines.length * 3.2 + 1.2) : 0;
    const rowHeight = Math.max(8.5, titleH + descH + 3.5);

    // Page boundary check
    if (tableY + rowHeight > 235) {
      doc.addPage();
      tableY = 20;

      // Re-draw table header
      doc.setFillColor(...headerBg);
      doc.setDrawColor(...borderLine);
      doc.rect(14, tableY, 182, 7.5, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("#", colX.idx, tableY + 5);
      doc.text("Item Description", colX.desc, tableY + 5);
      doc.text("Qty", colX.qty, tableY + 5, { align: "center" });
      doc.text("Unit Price", colX.unitPrice, tableY + 5, { align: "right" });
      doc.text("GST", colX.gst, tableY + 5, { align: "center" });
      doc.text("Total Credit", colX.total, tableY + 5, { align: "right" });
      tableY += 7.5;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
    doc.setDrawColor(...borderLine);
    doc.rect(14, tableY, 182, rowHeight, "FD");

    const baselineY = tableY + 4.8;

    // Index
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...bodyText);
    doc.text(String(idx + 1), colX.idx, baselineY);

    // Item Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...darkSlate);
    titleLines.forEach((l, lIdx) => {
      doc.text(l, colX.desc, tableY + 4.5 + lIdx * 3.8);
    });

    // Concise Item Description (under title in muted font)
    if (descLines.length > 0) {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(...mutedText);
      const descStartY = tableY + 4.5 + titleH + 0.8;
      descLines.forEach((d, dIdx) => {
        doc.text(d, colX.desc, descStartY + dIdx * 3.2);
      });
    }

    // Qty
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...bodyText);
    doc.text(String(item.quantity || 1), colX.qty, baselineY, { align: "center" });

    // Unit Price
    drawCurrencyAmount(doc, item.unitPrice || 0, colX.unitPrice, baselineY, 8, darkSlate, false);

    // GST %
    doc.text(`${item.gstPercent !== undefined ? item.gstPercent : 18}%`, colX.gst, baselineY, { align: "center" });

    // Total Amount
    const totalVal = item.totalAmount !== undefined
      ? item.totalAmount
      : (Number(item.quantity || 1) * Number(item.unitPrice || 0) * (1 + (item.gstPercent || 18) / 100));
    drawCurrencyAmount(doc, totalVal, colX.total, baselineY, 8, darkSlate, true);

    tableY += rowHeight;
  });

  // 6. Totals Box & Terms (Matching Preview Modal)
  const boxH = isInterState ? 30 : 35;
  let totalBoxY = Math.max(tableY + 6, 140);
  if (totalBoxY + boxH + 35 > 275) {
    doc.addPage();
    totalBoxY = 20;
  }

  // Left: Terms Box
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderLine);
  doc.roundedRect(14, totalBoxY, 98, boxH, 2, 2, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text("TERMS & AUDIT NOTES:", 18, totalBoxY + 6.5);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...bodyText);
  doc.text("1. Credit note issued subject to standard return policy.", 18, totalBoxY + 12);
  doc.text("2. Applicable for outstanding invoice deduction or account credit.", 18, totalBoxY + 16.5);
  doc.text("3. This document is valid for GST reversal and audit records.", 18, totalBoxY + 21);
  if (!isInterState) {
    doc.text("4. GST reversed under CGST (50%) & SGST (50%) (Intra-state).", 18, totalBoxY + 25.5);
  } else {
    doc.text("4. GST reversed under IGST (100%) (Inter-state supply).", 18, totalBoxY + 25.5);
  }

  // Right: Totals Box (Compliant with GST Breakdown)
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderLine);
  doc.roundedRect(118, totalBoxY, 78, boxH, 2, 2, "FD");

  let rY = totalBoxY + 5.5;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text("Taxable Subtotal:", 122, rY);
  drawCurrencyAmount(doc, cn.subtotal, 192, rY, 8.5, darkSlate, true);

  const totalTax = Number(cn.totalTax || 0);

  if (isInterState) {
    rY += 5.5;
    const igstVal = cn.igstTotal !== undefined ? Number(cn.igstTotal) : totalTax;
    doc.text("IGST (Integrated Tax):", 122, rY);
    drawCurrencyAmount(doc, igstVal, 192, rY, 8.5, darkSlate, true);
    rY += 4.5;
  } else {
    rY += 5;
    const halfTax = totalTax / 2;
    const cgstVal = cn.cgstTotal !== undefined ? Number(cn.cgstTotal) : Math.round(halfTax * 100) / 100;
    const sgstVal = cn.sgstTotal !== undefined ? Number(cn.sgstTotal) : Math.round((totalTax - cgstVal) * 100) / 100;

    doc.text("CGST (Central Tax):", 122, rY);
    drawCurrencyAmount(doc, cgstVal, 192, rY, 8.5, darkSlate, true);

    rY += 5;
    doc.text("SGST (State Tax):", 122, rY);
    drawCurrencyAmount(doc, sgstVal, 192, rY, 8.5, darkSlate, true);
    rY += 4.5;
  }

  doc.setDrawColor(...borderLine);
  doc.line(122, rY, 192, rY);
  rY += 5;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primaryRed);
  doc.text("Total Credit Amount:", 122, rY);
  drawCurrencyAmount(doc, cn.totalCreditAmount, 192, rY, 9.5, primaryRed, true);

  // Total in Words
  const wordY = totalBoxY + boxH + 5;
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text(numberToWordsINR(cn.totalCreditAmount), 196, wordY, { align: "right" });

  // 7. Authorized Signatory Block
  const signY = wordY + 8;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text("For ETOSM TECHNOLOGY", 196, signY, { align: "right" });

  if (signatureData) {
    try {
      doc.addImage(signatureData, "PNG", 160, signY + 2, 34, 12);
    } catch (e) {
      // ignore
    }
  }

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedText);
  doc.text("Authorized Signatory", 196, signY + 18, { align: "right" });

  // 8. Page Footer
  doc.setDrawColor(...borderLine);
  doc.line(14, 280, 196, 280);
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("support@etosmtechnology.in | https://www.etosmtechnology.in", 105, 285, { align: "center" });

  return doc;
}

// Trigger direct browser print dialog for the generated official Credit Note PDF
export async function printEtosmCreditNotePdf(creditNoteData, customAssets = {}) {
  const doc = await generateEtosmCreditNotePdf(creditNoteData, customAssets);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");

  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
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

/**
 * BUG-014: Match quotation design to invoice layout
 * Generates an official Price Quotation PDF matching the exact branding, typography,
 * table styling, HSN column, and spacing of the official Tax Invoice PDF.
 */
export async function generateEtosmQuotationPdf(quotationData, customAssets = {}) {
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

  // Draw Header
  const drawPageHeader = () => {
    doc.saveGraphicsState();
    doc.setFillColor(248, 233, 233); // Soft pastel blush #f8e9e9 from official PDF
    doc.moveTo(210, 42.5);
    doc.curveTo(196, 44, 168, 45, 118, 39);
    doc.curveTo(65, 33, 21, 35, 0, 37);
    doc.lineTo(0, 0);
    doc.lineTo(210, 0);
    doc.lineTo(210, 42.5);
    doc.fill();
    doc.restoreGraphicsState();

    // Logo
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 11, 10, 44, 12.1);
      } catch (e) {
        drawFallbackLogo(11, 10);
      }
    } else {
      drawFallbackLogo(11, 10);
    }

    // Company Address
    const rightX = 198;
    doc.setTextColor(...darkSlate);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("EToSM Technology", rightX, 9.5, { align: "right" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...bodyText);
    doc.text("2/167B Merkukadu, Ramapuram", rightX, 13.8, { align: "right" });
    doc.text("Tiruchengodu, Namakkal, Tamil Nadu,", rightX, 18.0, { align: "right" });
    doc.text("India, 637202", rightX, 22.2, { align: "right" });
    doc.text("Mobile: +91 8807080216", rightX, 27.2, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(...darkSlate);
    doc.text("GSTIN: 33JUAPK4885G1ZD", rightX, 32.5, { align: "right" });
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

  const drawPageFooter = (pageNum = 1, totalPages = 1) => {
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

  drawPageHeader();

  // 1. Customer Billed-To Block
  const custX = 11;
  const shipX = 108;
  const blockStartY = 50;

  const customerName = quotationData.customerName || "Valued Client";
  const customerAddress = quotationData.customerAddress || "";
  const customerGstin = quotationData.customerGstin || "";
  const placeOfSupply = quotationData.placeOfSupply || "33 - Tamil Nadu";

  const hasSeparateShipping = Boolean(
    quotationData.shippingSameAsBilling === false &&
    quotationData.shippingAddress &&
    quotationData.shippingAddress.trim() !== "" &&
    quotationData.shippingAddress.trim() !== customerAddress.trim()
  );

  const shippingName = quotationData.shippingName || customerName;
  const shippingAddress = quotationData.shippingAddress || customerAddress;
  const shippingPhone = quotationData.shippingPhone || quotationData.customerPhone || "";

  // Line 1: Headers (Locked to exact same horizontal baseline)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryRed);
  doc.text("QUOTATION FOR (BUYER):", custX, blockStartY);
  doc.text("DELIVERY SITE / DISPATCH TO:", shipX, blockStartY);

  // Line 2: Entity / Customer Names (Locked to exact same horizontal baseline)
  const nameY = blockStartY + 4.2;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  doc.text(customerName.slice(0, 42), custX, nameY);
  doc.text(shippingName.slice(0, 42), shipX, nameY);

  // Line 3 & 4: Addresses (Locked to exact same horizontal baseline)
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...bodyText);

  const addrStartY = nameY + 4.2;
  const addrLines = customerAddress ? doc.splitTextToSize(customerAddress, 85).slice(0, 2) : ["Tamil Nadu TN, India"];
  addrLines.forEach((line, idx) => {
    doc.text(line, custX, addrStartY + (idx * 3.8));
  });

  const targetShipAddr = hasSeparateShipping ? shippingAddress : customerAddress;
  const shipAddrLines = targetShipAddr ? doc.splitTextToSize(targetShipAddr, 85).slice(0, 2) : ["Tamil Nadu TN, India"];
  shipAddrLines.forEach((line, idx) => {
    doc.text(line, shipX, addrStartY + (idx * 3.8));
  });

  // Line 5: Details / Contact (Locked to exact same baseline)
  const detailsY = addrStartY + (Math.max(addrLines.length, shipAddrLines.length) * 3.8);

  let leftDetailY = detailsY;
  if (customerGstin) {
    doc.setFont("Helvetica", "bold");
    doc.text(`GSTIN: ${customerGstin}`, custX, leftDetailY);
    doc.setFont("Helvetica", "normal");
    leftDetailY += 3.8;
  }
  if (quotationData.customerPhone) {
    doc.text(`Phone: ${quotationData.customerPhone}`, custX, leftDetailY);
  }

  let rightDetailY = detailsY;
  if (hasSeparateShipping && shippingPhone) {
    doc.text(`Contact: ${shippingPhone}`, shipX, rightDetailY);
  } else if (!hasSeparateShipping) {
    doc.setFont("Helvetica", "italic");
    doc.setTextColor(...mutedText);
    doc.text("Same as billing address", shipX, rightDetailY);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(...bodyText);
  }

  // 2. Quotation Title
  const titleY = 91;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...primaryRed);
  const quoteNumberText = quotationData.quotationNumber || quotationData.docNumber || "QT-2026-0001";
  doc.text(`Price Quotation ${quoteNumberText}`, 11, titleY);

  // 3. 4-Column Metadata Card
  const metaY = 96;
  doc.setFillColor(...lightBg);
  doc.roundedRect(11, metaY, 187, 14, 1.5, 1.5, "F");

  const qDate = quotationData.quotationDate ? formatDate(quotationData.quotationDate) : formatDate(Date.now());
  const vUntil = quotationData.validUntil ? formatDate(quotationData.validUntil) : "30 Days from Issue";
  const sourceRef = quotationData.sourceOrderNumber || quotationData.reference || "Standard Quotation";

  const metaCols = [
    { label: "Quotation Date", val: qDate, x: 16 },
    { label: "Valid Until", val: vUntil, x: 62 },
    { label: "Place of Supply", val: placeOfSupply, x: 108 },
    { label: "Reference / PO", val: sourceRef, x: 154 }
  ];

  metaCols.forEach((col) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.text(col.label, col.x, metaY + 5.2);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);

    const maxLen = 22;
    const strVal = String(col.val || "").trim();
    const displayVal = strVal.length > maxLen ? strVal.slice(0, maxLen - 1) + "…" : strVal;
    doc.text(displayVal, col.x, metaY + 10.5);
  });

  // 4. Line Items Table (Clean, concise titles, HSN/SAC, formatted numbers)
  let tableY = 117;
  const colX = {
    desc: 14,
    hsn: 96,
    qty: 122,
    unitPrice: 150,
    taxes: 166,
    amount: 196
  };

  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.2);
  doc.line(11, tableY, 198, tableY);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text("Item Description", colX.desc, tableY + 5);
  doc.text("HSN/SAC", colX.hsn, tableY + 5);
  doc.text("Qty", colX.qty, tableY + 5, { align: "right" });
  doc.text("Rate (INR)", colX.unitPrice, tableY + 5, { align: "right" });
  doc.text("GST", colX.taxes, tableY + 5, { align: "right" });
  doc.text("Amount (INR)", colX.amount, tableY + 5, { align: "right" });

  tableY += 7.5;
  doc.line(11, tableY, 198, tableY);
  tableY += 2;

  const items = quotationData.items || [];
  items.forEach((item, index) => {
    // Check page overflow
    if (tableY > 215) {
      drawPageFooter(1, 2);
      doc.addPage();
      drawPageHeader();
      tableY = 56;
      doc.line(11, tableY, 198, tableY);
      tableY += 4;
    }

    // BUG-014: Concise item title, omit excessive technical paragraph descriptions
    const rawTitle = String(item.name || item.title || item.productName || `Item #${index + 1}`).trim();
    const conciseTitle = rawTitle.length > 55 ? rawTitle.slice(0, 52) + "..." : rawTitle;

    const hsn = String(item.hsn || item.hsnCode || "8504").trim();
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.unitPrice || item.rate) || 0;
    const gstPct = item.gstPercent !== undefined ? Number(item.gstPercent) : 18;
    const itemTotal = Number(item.totalAmount) || (qty * rate * (1 + gstPct / 100));

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...darkSlate);
    doc.text(conciseTitle, colX.desc, tableY + 4);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...bodyText);
    doc.text(hsn, colX.hsn, tableY + 4);
    doc.text(String(qty), colX.qty, tableY + 4, { align: "right" });
    doc.text(rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.unitPrice, tableY + 4, { align: "right" });
    doc.text(`${gstPct}%`, colX.taxes, tableY + 4, { align: "right" });

    doc.setFont("Helvetica", "bold");
    doc.text(itemTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.amount, tableY + 4, { align: "right" });

    tableY += 8;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(11, tableY, 198, tableY);
    tableY += 2;
  });

  // 5. Bottom Financial Summary Block
  let summaryY = Math.max(tableY + 6, 175);
  if (summaryY > 210) {
    drawPageFooter(1, 2);
    doc.addPage();
    drawPageHeader();
    summaryY = 56;
  }

  // Left Box: Terms & Conditions and Bank Details
  const leftX = 11;
  let leftY = summaryY;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text("Terms & Conditions:", leftX, leftY);
  leftY += 4.5;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...bodyText);
  const termsText = quotationData.terms || quotationData.notes || "1. Validity: 30 days from date of issue.\n2. Taxes: GST as applicable.\n3. Payment: 50% advance along with confirmed PO, balance before dispatch.\n4. Subject to local jurisdiction.";
  const termLines = doc.splitTextToSize(termsText, 95);
  termLines.slice(0, 5).forEach((line) => {
    doc.text(line, leftX, leftY);
    leftY += 3.6;
  });

  leftY += 2;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text("Bank Details for NEFT / RTGS:", leftX, leftY);
  leftY += 4;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...bodyText);
  doc.text("Bank: State Bank of India | A/c No: 38920192837", leftX, leftY);
  leftY += 3.6;
  doc.text("IFSC: SBIN0001234 | Branch: Tiruchengodu", leftX, leftY);
  leftY += 3.6;
  doc.text("UPI ID: etosm@sbi", leftX, leftY);

  // Right Box: Totals & Tax Breakdown
  const rightTotalX = 198;
  const rightLabelX = 150;
  let rightY = summaryY;

  const isInterState = Boolean(quotationData.isInterState);
  const subtotal = Number(quotationData.subtotal || quotationData.taxableSubtotal) || 0;
  const cgst = Number(quotationData.cgstTotal) || (isInterState ? 0 : Number(quotationData.totalTax || 0) / 2);
  const sgst = Number(quotationData.sgstTotal) || (isInterState ? 0 : Number(quotationData.totalTax || 0) / 2);
  const igst = Number(quotationData.igstTotal) || (isInterState ? Number(quotationData.totalTax || 0) : 0);
  const shipping = Number(quotationData.shippingCharges) || 0;
  const grandTotal = Number(quotationData.grandTotal || quotationData.totalAmount) || (subtotal + cgst + sgst + igst + shipping);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...bodyText);

  doc.text("Taxable Subtotal:", rightLabelX, rightY, { align: "right" });
  doc.text(subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightTotalX, rightY, { align: "right" });
  rightY += 5;

  if (isInterState) {
    doc.text("Integrated GST (IGST):", rightLabelX, rightY, { align: "right" });
    doc.text(igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightTotalX, rightY, { align: "right" });
    rightY += 5;
  } else {
    doc.text("Central GST (CGST):", rightLabelX, rightY, { align: "right" });
    doc.text(cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightTotalX, rightY, { align: "right" });
    rightY += 5;

    doc.text("State GST (SGST):", rightLabelX, rightY, { align: "right" });
    doc.text(sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightTotalX, rightY, { align: "right" });
    rightY += 5;
  }

  if (shipping > 0) {
    doc.text("Shipping & Freight:", rightLabelX, rightY, { align: "right" });
    doc.text(shipping.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightTotalX, rightY, { align: "right" });
    rightY += 5;
  }

  // Grand Total Highlight
  doc.setDrawColor(...borderLine);
  doc.setLineWidth(0.3);
  doc.line(130, rightY, 198, rightY);
  rightY += 5;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryRed);
  doc.text("Grand Total (INR):", rightLabelX, rightY, { align: "right" });
  doc.text(`INR ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightTotalX, rightY, { align: "right" });
  rightY += 6;

  // Signatory
  if (signatureData) {
    try {
      doc.addImage(signatureData, "PNG", rightTotalX - 35, rightY, 32, 10);
      rightY += 11;
    } catch (e) {
      rightY += 8;
    }
  } else {
    rightY += 8;
  }

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text("For EToSM Technology", rightTotalX, rightY, { align: "right" });
  rightY += 3.8;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text("Authorized Signatory", rightTotalX, rightY, { align: "right" });

  drawPageFooter(1, 1);
  return doc;
}

// Trigger browser print dialog for Quotation PDF
export async function printEtosmQuotationPdf(quotationData, customAssets = {}) {
  const doc = await generateEtosmQuotationPdf(quotationData, customAssets);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
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

/**
 * BUG-015: Monthly bulk invoice PDF download
 * Generates an auditor-ready multi-page bundle containing an initial Monthly Invoice Register Summary sheet
 * followed sequentially by each issued invoice in full vector PDF layout.
 * @param {Array} invoicesList - Array of invoice objects
 * @param {String} periodLabel - e.g. "November 2026"
 * @returns {Promise<jsPDF>} - Merged PDF document
 */
export async function generateEtosmBulkInvoicesPdf(invoicesList = [], periodLabel = "") {
  const masterDoc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let logoData = null;
  let signatureData = null;
  if (typeof window !== "undefined" || typeof fetch !== "undefined") {
    try {
      const [fLogo, fSig] = await Promise.all([
        loadImageDataUrl("/invoice_logo.png").then(d => d || loadImageDataUrl("/logo1.png")),
        loadImageDataUrl("/invoice_signature.png")
      ]);
      logoData = fLogo || null;
      signatureData = fSig || null;
    } catch (e) {
      // quiet fallback
    }
  }
  const customAssets = { logo: logoData, signature: signatureData };

  // Page 1: Monthly Register Summary Page
  // Header Wave
  masterDoc.saveGraphicsState();
  masterDoc.setFillColor(248, 233, 233);
  masterDoc.moveTo(210, 42);
  masterDoc.curveTo(196, 44, 168, 46, 118, 40);
  masterDoc.curveTo(65, 34, 21, 36, 0, 38);
  masterDoc.lineTo(0, 0);
  masterDoc.lineTo(210, 0);
  masterDoc.lineTo(210, 42);
  masterDoc.fill();
  masterDoc.restoreGraphicsState();

  if (logoData) {
    try { masterDoc.addImage(logoData, "PNG", 11, 10, 44, 12.1); } catch (e) {}
  }

  masterDoc.setFont("Helvetica", "bold");
  masterDoc.setFontSize(10);
  masterDoc.setTextColor(15, 23, 42);
  masterDoc.text("EToSM Technology", 198, 14, { align: "right" });
  masterDoc.setFont("Helvetica", "normal");
  masterDoc.setFontSize(8);
  masterDoc.setTextColor(71, 85, 105);
  masterDoc.text("GSTIN: 33JUAPK4885G1ZD", 198, 20, { align: "right" });
  masterDoc.text("2/167B Merkukadu, Ramapuram, Tiruchengodu", 198, 25, { align: "right" });

  // Title Banner
  masterDoc.setFillColor(197, 27, 36);
  masterDoc.rect(11, 46, 187, 8, "F");
  masterDoc.setFont("Helvetica", "bold");
  masterDoc.setFontSize(9.5);
  masterDoc.setTextColor(255, 255, 255);
  masterDoc.text(`MONTHLY INVOICE REGISTER & BULK BUNDLE — ${(periodLabel || "ALL INVOICES").toUpperCase()}`, 14, 51.5);

  // Totals calculations
  let totalTaxable = 0;
  let totalTax = 0;
  let totalGross = 0;
  invoicesList.forEach(inv => {
    totalTaxable += Number(inv.taxableSubtotal || 0);
    totalTax += Number(inv.totalTax || 0);
    totalGross += Number(inv.grandTotal || 0);
  });

  // KPI Summary Card
  masterDoc.setFillColor(248, 250, 252);
  masterDoc.rect(11, 57, 187, 16, "F");
  masterDoc.setDrawColor(226, 232, 240);
  masterDoc.rect(11, 57, 187, 16);

  masterDoc.setFont("Helvetica", "bold");
  masterDoc.setFontSize(8);
  masterDoc.setTextColor(100, 116, 139);
  masterDoc.text("INVOICES COUNT", 15, 62);
  masterDoc.text("TAXABLE TURNOVER", 62, 62);
  masterDoc.text("TOTAL GST COLLECTED", 112, 62);
  masterDoc.text("TOTAL GROSS BILLED", 160, 62);

  masterDoc.setFontSize(10.5);
  masterDoc.setTextColor(15, 23, 42);
  masterDoc.text(`${invoicesList.length} Invoices`, 15, 69);
  masterDoc.text(`INR ${totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 62, 69);
  masterDoc.text(`INR ${totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 112, 69);
  masterDoc.setTextColor(197, 27, 36);
  masterDoc.text(`INR ${totalGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 160, 69);

  // Table of Invoices (up to 26 rows on summary sheet)
  let tableY = 78;
  masterDoc.setFillColor(241, 245, 249);
  masterDoc.rect(11, tableY, 187, 6, "F");
  masterDoc.rect(11, tableY, 187, 6);
  masterDoc.setFont("Helvetica", "bold");
  masterDoc.setFontSize(7.5);
  masterDoc.setTextColor(51, 65, 85);
  masterDoc.text("#", 14, tableY + 4.2);
  masterDoc.text("INVOICE #", 22, tableY + 4.2);
  masterDoc.text("DATE", 52, tableY + 4.2);
  masterDoc.text("CUSTOMER & GSTIN", 76, tableY + 4.2);
  masterDoc.text("PLACE OF SUPPLY", 125, tableY + 4.2);
  masterDoc.text("STATUS", 160, tableY + 4.2);
  masterDoc.text("TOTAL (INR)", 195, tableY + 4.2, { align: "right" });

  tableY += 6;
  masterDoc.setFont("Helvetica", "normal");
  masterDoc.setFontSize(7);
  masterDoc.setTextColor(15, 23, 42);

  const displayRows = invoicesList.slice(0, 26);
  displayRows.forEach((inv, idx) => {
    const rowY = tableY + 4;
    masterDoc.text(String(idx + 1), 14, rowY);
    masterDoc.setFont("Helvetica", "bold");
    masterDoc.text(inv.invoiceNumber || "—", 22, rowY);
    masterDoc.setFont("Helvetica", "normal");
    masterDoc.text(inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "—", 52, rowY);
    const custStr = `${(inv.customerName || "Customer").slice(0, 20)}${inv.customerGstin ? ` (${inv.customerGstin.slice(0, 7)}..)` : ""}`;
    masterDoc.text(custStr, 76, rowY);
    masterDoc.text((inv.placeOfSupply || "33 - TN").slice(0, 18), 125, rowY);
    masterDoc.text(inv.documentStatus || inv.paymentStatus || "Issued", 160, rowY);
    masterDoc.text(Number(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 195, rowY, { align: "right" });

    tableY += 6;
    masterDoc.setDrawColor(241, 245, 249);
    masterDoc.line(11, tableY, 198, tableY);
  });

  if (invoicesList.length > 26) {
    masterDoc.setFontSize(7);
    masterDoc.setTextColor(100, 116, 139);
    masterDoc.text(`... and ${invoicesList.length - 26} more invoices included in sequential pages below`, 14, tableY + 4);
  }

  // Footer for summary page
  masterDoc.setFontSize(7);
  masterDoc.setTextColor(148, 163, 184);
  masterDoc.text(`Page 1 of ${invoicesList.length + 1} • EToSM Billing Software • Official Monthly Tax Invoices Archive`, 11, 287);

  // Page 2..N: Sequential individual invoice pages
  for (let i = 0; i < invoicesList.length; i++) {
    masterDoc.addPage("a4", "portrait");
    await generateEtosmInvoicePdf(invoicesList[i], customAssets, masterDoc);
  }

  return masterDoc;
}
