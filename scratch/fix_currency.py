path = "frontend/src/admin/QuotationManagementPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Replacements inside handleDownloadPdf:
text = text.replace('doc.text("Rate (₹)", 145, tableY + 5.2, { align: "right" });', 'doc.text("Rate (Rs.)", 145, tableY + 5.2, { align: "right" });')
text = text.replace('doc.text("Total (₹)", 192, tableY + 5.2, { align: "right" });', 'doc.text("Total (Rs.)", 192, tableY + 5.2, { align: "right" });')
text = text.replace('doc.text(`₹${Number(item.unitPrice || 0).toLocaleString("en-IN")}`, 145, tableY + 5, { align: "right" });', 'doc.text(`Rs. ${Number(item.unitPrice || 0).toLocaleString("en-IN")}`, 145, tableY + 5, { align: "right" });')
text = text.replace('doc.text(`₹${Number(item.totalAmount || 0).toLocaleString("en-IN")}`, 192, tableY + 5, { align: "right" });', 'doc.text(`Rs. ${Number(item.totalAmount || 0).toLocaleString("en-IN")}`, 192, tableY + 5, { align: "right" });')
text = text.replace('doc.text(`₹${Number(q.grossSubtotal || q.grandTotal || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });', 'doc.text(`Rs. ${Number(q.grossSubtotal || q.grandTotal || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });')
text = text.replace('doc.text(`- ₹${Number(q.totalDiscount).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });', 'doc.text(`- Rs. ${Number(q.totalDiscount).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });')
text = text.replace('doc.text(`₹${Number(q.totalTax || q.taxAmount || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });', 'doc.text(`Rs. ${Number(q.totalTax || q.taxAmount || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });')
text = text.replace('doc.text(`₹${Number(q.grandTotal || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });', 'doc.text(`Rs. ${Number(q.grandTotal || 0).toLocaleString("en-IN")}`, 196, totalsY + 4, { align: "right" });')

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Currency symbols updated successfully!")
