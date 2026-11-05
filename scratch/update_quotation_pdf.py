quotation_file = "frontend/src/admin/QuotationManagementPage.jsx"

with open(quotation_file, "r", encoding="utf-8") as f:
    content = f.read()

# Locate handleDownloadPdf start and end
start_marker = "  // Generate Vector A4 PDF"
end_marker = '      showToast("Failed to generate PDF", "error");\n    }\n  };'
if end_marker.replace("\n", "\r\n") in content:
    end_marker_actual = end_marker.replace("\n", "\r\n")
else:
    end_marker_actual = end_marker

start_pos = content.find(start_marker)
end_pos = content.find(end_marker_actual, start_pos)

if start_pos == -1 or end_pos == -1:
    print("Could not find handleDownloadPdf markers!")
    exit(1)

end_pos += len(end_marker_actual)

new_code = """  // Helper to load image as base64 Data URL for jsPDF
  const loadImageDataUrl = async (url) => {
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
  };

  // Generate Vector A4 PDF - Exact 1:1 match to Official Price Quotation Preview Sheet
  const handleDownloadPdf = async (q) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const slateDark = [15, 23, 42];      // #0f172a
      const primaryRed = [227, 0, 15];     // #e3000f
      const bodyText = [51, 65, 85];       // #334155
      const mutedText = [100, 116, 139];   // #64748b
      const borderGray = [226, 232, 240];  // #e2e8f0
      const softBg = [248, 250, 252];      // #f8fafc
      const greenDiscount = [22, 163, 74]; // #16a34a

      // Load logo if available
      let logoData = null;
      try {
        logoData = await loadImageDataUrl("/logo1.png");
      } catch (e) {
        // ignore
      }

      // =======================================================================
      // 1. TOP HEADER (Matches Sheet Header)
      // =======================================================================
      // Left: Logo and Company Info
      if (logoData) {
        try {
          doc.addImage(logoData, "PNG", 14, 12, 36, 9.5);
        } catch (e) {
          // fallback logo
          doc.setFillColor(227, 0, 15);
          doc.roundedRect(14, 12, 9, 9, 1.5, 1.5, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8);
          doc.text("E", 17.5, 18);
          doc.setTextColor(...slateDark);
          doc.setFontSize(13);
          doc.text("ETOSM", 25, 19);
        }
      } else {
        doc.setFillColor(227, 0, 15);
        doc.roundedRect(14, 12, 9, 9, 1.5, 1.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.text("E", 17.5, 18);
        doc.setTextColor(...slateDark);
        doc.setFontSize(13);
        doc.text("ETOSM", 25, 19);
      }

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...slateDark);
      doc.text("ETOSM TECHNOLOGY", 14, 27);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedText);
      doc.text("Lithium Battery Packs • Custom BMS • EV Electronics", 14, 31.5);
      doc.text("Office: Namakkal, Tamil Nadu-637202 | support@etosmtechnology.in", 14, 35.5);

      // Right: PRICE QUOTATION and Meta Details
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...primaryRed);
      doc.text("PRICE QUOTATION", 196, 18, { align: "right" });

      const quoteNum = String(q.quotationNumber || q.docNumber || "QT-0001");
      const qDate = q.quotationDate ? new Date(q.quotationDate).toLocaleDateString("en-IN") : "N/A";
      const vUntil = q.validUntil ? new Date(q.validUntil).toLocaleDateString("en-IN") : "30 days";
      const pos = String(q.placeOfSupply || "Tamil Nadu (33)");

      doc.setFontSize(8);
      // Quote No
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(...mutedText);
      doc.text("Quote No:", 158, 24, { align: "right" });
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(...slateDark);
      doc.text(quoteNum, 196, 24, { align: "right" });

      // Date
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(...mutedText);
      doc.text("Date:", 158, 28.5, { align: "right" });
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(...slateDark);
      doc.text(qDate, 196, 28.5, { align: "right" });

      // Valid Until (Highlighted in Red)
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(...mutedText);
      doc.text("Valid Until:", 158, 33, { align: "right" });
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(...primaryRed);
      doc.text(vUntil, 196, 33, { align: "right" });

      // Place of Supply
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(...mutedText);
      doc.text("Place of Supply:", 158, 37.5, { align: "right" });
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(...slateDark);
      doc.text(pos, 196, 37.5, { align: "right" });

      // Header Divider Line
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);
      doc.line(14, 42, 196, 42);

      // =======================================================================
      // 2. CLIENT INFORMATION STRIP (QUOTATION FOR)
      // =======================================================================
      const clientY = 46;
      doc.setFillColor(...softBg);
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.25);
      doc.roundedRect(14, clientY, 182, 22, 2, 2, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedText);
      doc.text("QUOTATION FOR:", 18, clientY + 5.5);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...slateDark);
      doc.text(q.customerName || "Valued Client", 18, clientY + 11);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...bodyText);

      const clientMetaLeft = [];
      if (q.customerCompany) clientMetaLeft.push(q.customerCompany);
      if (q.customerAddress) clientMetaLeft.push(q.customerAddress);

      const clientMetaRight = [];
      if (q.customerPhone) clientMetaRight.push(`Phone: ${q.customerPhone}`);
      if (q.customerEmail) clientMetaRight.push(`Email: ${q.customerEmail}`);
      if (q.customerGstin) clientMetaRight.push(`GSTIN: ${q.customerGstin}`);

      doc.text(clientMetaLeft.join(" • ") || "Tamil Nadu, India", 18, clientY + 16.5);
      if (clientMetaRight.length > 0) {
        doc.text(clientMetaRight.join("   |   "), 192, clientY + 16.5, { align: "right" });
      }

      // =======================================================================
      // 3. LINE ITEMS TABLE (Dark Slate Header like Sheet)
      // =======================================================================
      let tableY = 73;

      doc.setFillColor(...slateDark);
      doc.rect(14, tableY, 182, 7.5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text("#", 18, tableY + 5.2);
      doc.text("Item Description", 28, tableY + 5.2);
      doc.text("Qty", 115, tableY + 5.2, { align: "center" });
      doc.text("Rate (₹)", 145, tableY + 5.2, { align: "right" });
      doc.text("GST", 166, tableY + 5.2, { align: "right" });
      doc.text("Total (₹)", 192, tableY + 5.2, { align: "right" });

      tableY += 7.5;

      const rawQItems = Array.isArray(q.items) ? q.items : [];
      const validQItems = rawQItems.filter((i) => i && (i.name || "").trim() !== "" && (i.name || "").trim().toLowerCase() !== "product item");
      const qItems = validQItems.length > 0
        ? validQItems
        : [{ name: "Electronic Component Assembly", quantity: 1, unitPrice: Number(q.grandTotal || 0), gstPercent: 18, totalAmount: Number(q.grandTotal || 0) }];

      qItems.forEach((item, idx) => {
        const hasDesc = !!item.description;
        const rowHeight = hasDesc ? 10 : 7.5;

        doc.setFillColor(255, 255, 255);
        doc.rect(14, tableY, 182, rowHeight, "F");
        doc.setDrawColor(...borderGray);
        doc.setLineWidth(0.2);
        doc.line(14, tableY + rowHeight, 196, tableY + rowHeight);

        // #
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...bodyText);
        doc.text(String(idx + 1), 18, tableY + 5);

        // Item Name & Description
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(...slateDark);
        const itemName = item.name.length > 48 ? item.name.substring(0, 45) + "..." : item.name;
        doc.text(itemName, 28, tableY + 5);

        if (hasDesc) {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...mutedText);
          const itDesc = item.description.length > 60 ? item.description.substring(0, 58) + "..." : item.description;
          doc.text(itDesc, 28, tableY + 8.5);
        }

        // Qty, Rate, GST, Total
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...bodyText);
        doc.text(String(item.quantity || 1), 115, tableY + 5, { align: "center" });
        doc.text(`₹${Number(item.unitPrice || 0).toLocaleString("en-IN")}`, 145, tableY + 5, { align: "right" });
        doc.text(`${item.gstPercent || 18}%`, 166, tableY + 5, { align: "right" });

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(...slateDark);
        doc.text(`₹${Number(item.totalAmount || 0).toLocaleString("en-IN")}`, 192, tableY + 5, { align: "right" });

        tableY += rowHeight;
      });

      // =======================================================================
      // 4. BOTTOM SECTION (Terms on Left, Financials on Right)
      // =======================================================================
      let bottomY = Math.max(tableY + 6, 142);

      // Left Box: Terms & Conditions Box
      const defaultTerms = "1. Quotation prices are valid for 30 days from date of issue.\\n2. Taxes as applicable at the time of invoicing.\\n3. Delivery timeline: 3-5 business days upon PO confirmation.";
      const termsText = (q.notes || defaultTerms).trim();

      doc.setFillColor(...softBg);
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.25);
      doc.roundedRect(14, bottomY, 95, 36, 2, 2, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedText);
      doc.text("TERMS & CONDITIONS:", 18, bottomY + 5.5);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...bodyText);

      const termLines = doc.splitTextToSize(termsText, 87);
      termLines.slice(0, 6).forEach((line, lIdx) => {
        doc.text(line, 18, bottomY + 10.5 + lIdx * 4);
      });

      // Right: Totals Box (Matches Sheet Totals Box)
      const totalsX = 115;
      let totalsY = bottomY + 2;

      // Subtotal
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...bodyText);
      doc.text("Subtotal:", totalsX, totalsY + 4);
      doc.text(`₹${Number(q.grossSubtotal || q.grandTotal || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });
      totalsY += 6;

      // Discount if any
      if (Number(q.totalDiscount || 0) > 0) {
        doc.setTextColor(...greenDiscount);
        doc.text("Discount:", totalsX, totalsY + 4);
        doc.text(`- ₹${Number(q.totalDiscount).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });
        totalsY += 6;
      }

      // GST (Tax)
      doc.setTextColor(...bodyText);
      doc.text("GST (Tax):", totalsX, totalsY + 4);
      doc.text(`₹${Number(q.totalTax || q.taxAmount || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });
      totalsY += 6;

      // Grand Total Highlight Line
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);
      doc.line(totalsX, totalsY + 2, 196, totalsY + 2);
      totalsY += 4;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...slateDark);
      doc.text("TOTAL ESTIMATE:", totalsX, totalsY + 4);
      doc.text(`₹${Number(q.grandTotal || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });
      totalsY += 7;

      // In words
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedText);
      const wordsText = numberToWordsINR(q.grandTotal);
      doc.text(wordsText, 196, totalsY + 3, { align: "right" });

      // =======================================================================
      // 5. FOOTER & SIGNATORY BLOCK (Plentiful Space, No Cutoff!)
      // =======================================================================
      let footerY = Math.max(bottomY + 44, totalsY + 12);
      footerY = Math.min(Math.max(footerY, 215), 235);

      // Footer divider
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.25);
      doc.line(14, footerY, 196, footerY);

      // Left: Thank you message
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...mutedText);
      doc.text("Thank you for your business enquiry!", 14, footerY + 22);

      // Right: Signatory Block (Centered on 168mm)
      const signCenterX = 168;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...slateDark);
      doc.text("For ETOSM TECHNOLOGY", signCenterX, footerY + 8, { align: "center" });

      // 20mm clean physical signature / stamp gap
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...bodyText);
      doc.text("Authorized Signatory", signCenterX, footerY + 28, { align: "center" });

      const cleanNum = (q.quotationNumber || q.docNumber || "QT-0001").replace(/[/\\\\?%*:|"<>]/g, "-");
      doc.save(`ETOSM_Quotation_${cleanNum}.pdf`);
      showToast(`Quotation ${cleanNum} downloaded as A4 PDF!`);
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Failed to generate PDF", "error");
    }
  };"""

# Replace in content
updated_content = content[:start_pos] + new_code + content[end_pos:]

with open(quotation_file, "w", encoding="utf-8") as f:
    f.write(updated_content)

print("Updated handleDownloadPdf in QuotationManagementPage.jsx successfully!")
