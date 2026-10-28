import API_BASE_URL from "../apiConfig";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Printer,
  Download,
  Package,
  Truck,
  MapPin,
  Barcode,
  QrCode,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Sliders,
  Maximize2,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import jsPDF from "jspdf";
import AdminLayout from "./AdminLayout";
import "./ShippingLabelsPage.css";

const CARRIERS = [
  "Delhivery Express",
  "DTDC Express",
  "India Post Speed Post",
  "Blue Dart",
  "Trackon Couriers",
  "Surface Cargo",
  "Ecom Express"
];

const ShippingLabelsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // State
  const [sources, setSources] = useState({ orders: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [selectedSourceType, setSelectedSourceType] = useState("order"); // "order", "invoice", "custom"
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Label Form Data (defaults to 4" x 6" thermal format)
  const [labelData, setLabelData] = useState({
    documentNumber: "ORD-1001",
    trackingNumber: "ET" + Math.floor(1000000000 + Math.random() * 9000000000),
    carrier: "Delhivery Express",
    serviceType: "Standard Air Express",
    shipDate: new Date().toISOString().split("T")[0],
    isCOD: false,
    collectAmount: 0,
    weightKg: "0.50",
    dimensions: "15 x 10 x 5 cm",
    packageCount: "1 of 1",
    // Shipper / Return Address
    shipperName: "EToSM TECHNOLOGY",
    shipperAddress: "2/167, Merkukadu, Ramapuram, Tiruchengodu",
    shipperCity: "Namakkal",
    shipperState: "Tamil Nadu",
    shipperPincode: "637202",
    shipperPhone: "+91 88070 80216",
    shipperGstin: "33AAACE1234F1Z5",
    // Recipient Address
    receiverName: "Senthil Kumar",
    receiverCompany: "GreenTech Innovations",
    receiverPhone: "+91 98765 43210",
    receiverAddress: "45, Anna Nagar Cross Street, Near Bus Stand",
    receiverCity: "Coimbatore",
    receiverState: "Tamil Nadu",
    receiverPincode: "641001",
    // Box Contents
    items: [
      { name: "Li-Ion 18650 Battery Cells 2500mAh", sku: "BAT-18650", quantity: 4 }
    ],
    handlingInstructions: "HANDLE WITH CARE • SENSITIVE ELECTRONICS & BATTERY CELLS • DO NOT DROP"
  });

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth & Init
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
    } else {
      fetchSources();
    }
  }, [navigate]);

  // Check if passed via location state
  useEffect(() => {
    if (location.state && location.state.prefill) {
      const p = location.state.prefill;
      applyPrefill(p);
    }
  }, [location.state]);

  const applyPrefill = (p) => {
    if (!p) return;
    setLabelData((prev) => ({
      ...prev,
      documentNumber: p.documentNumber || prev.documentNumber,
      trackingNumber: p.trackingNumber || ("ET" + Math.floor(1000000000 + Math.random() * 9000000000)),
      isCOD: !!p.isCOD,
      collectAmount: p.collectAmount || 0,
      carrier: p.carrier || prev.carrier,
      receiverName: p.shipTo?.name || prev.receiverName,
      receiverCompany: p.shipTo?.company || "",
      receiverPhone: p.shipTo?.phone || prev.receiverPhone,
      receiverAddress: p.shipTo?.address || prev.receiverAddress,
      receiverCity: p.shipTo?.city || prev.receiverCity,
      receiverState: p.shipTo?.state || prev.receiverState,
      receiverPincode: p.shipTo?.pincode || prev.receiverPincode,
      items: Array.isArray(p.itemsSummary) && p.itemsSummary.length > 0 ? p.itemsSummary : prev.items
    }));
  };

  // Fetch Sources (Orders and Invoices)
  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/shipping-labels/sources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSources({
          orders: Array.isArray(data?.orders) ? data.orders : [],
          invoices: Array.isArray(data?.invoices) ? data.invoices : []
        });

        // Preload first order if available
        if (data?.orders && data.orders.length > 0 && !location.state?.prefill) {
          applyPrefill(data.orders[0]);
          setSelectedSourceId(data.orders[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load shipping label sources:", err);
      showToast("Error loading source orders", "error");
    } finally {
      setLoading(false);
    }
  };

  // Select Source Order or Invoice
  const handleSelectSource = (id, type) => {
    setSelectedSourceId(id);
    const list = (type === "order" ? sources?.orders : sources?.invoices) || [];
    const found = list.find((item) => String(item.id) === String(id));
    if (found) {
      applyPrefill(found);
      showToast(`Loaded shipping details from ${type} #${found.documentNumber}`);
    }
  };

  // Direct 4x6 / 6x4 Browser Thermal Print - Strictly 1 Single Page Guarantee
  const handlePrintThermal = () => {
    const labelEl = document.getElementById("thermal-label-print");
    if (!labelEl) {
      window.print();
      return;
    }

    // Clean up any previously attached print iframe
    const oldFrame = document.getElementById("thermal-print-iframe");
    if (oldFrame) {
      oldFrame.remove();
    }

    // Create an isolated hidden print iframe containing only the thermal label
    const printFrame = document.createElement("iframe");
    printFrame.id = "thermal-print-iframe";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Shipping_Label_${labelData.documentNumber || "EToSM"}</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 0mm !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 4in !important;
      height: 6in !important;
      max-height: 6in !important;
      overflow: hidden !important;
      background: #ffffff !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif;
      color: #000000;
    }
    .thermal-label-container {
      width: 4in !important;
      height: 6in !important;
      max-height: 6in !important;
      margin: 0 !important;
      padding: 0.08in !important;
      border: 2px solid #000000 !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      overflow: hidden !important;
      background: #ffffff !important;
      page-break-before: avoid !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
      break-before: avoid !important;
      break-after: avoid !important;
      break-inside: avoid !important;
    }
    .t-carrier-banner {
      background: #000000 !important;
      color: #ffffff !important;
      padding: 6px 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-bottom: 2px solid #000000 !important;
    }
    .t-carrier-name {
      margin: 0 !important;
      font-size: 16px !important;
      font-weight: 900 !important;
      color: #ffffff !important;
      letter-spacing: 0.03em !important;
    }
    .t-service-type {
      font-size: 9.5px !important;
      font-weight: 700 !important;
      display: block !important;
      color: #f1f5f9 !important;
    }
    .t-routing-hub {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
    }
    .t-hub-label {
      font-size: 8.5px !important;
      color: #cbd5e1 !important;
      font-weight: 700 !important;
    }
    .t-hub-val {
      font-size: 15px !important;
      font-weight: 900 !important;
      color: #ffffff !important;
    }
    .t-tracking-block {
      padding: 6px 6px !important;
      border-bottom: 2px solid #000000 !important;
      text-align: center !important;
    }
    .t-tracking-meta {
      display: flex !important;
      justify-content: space-between !important;
      font-size: 9.5px !important;
      font-weight: 800 !important;
      margin-bottom: 4px !important;
    }
    .t-barcode-bars {
      display: flex !important;
      justify-content: center !important;
      align-items: flex-end !important;
      height: 42px !important;
      gap: 2px !important;
      margin: 3px 0 2px 0 !important;
    }
    .t-barcode-bars .bar {
      background: #000000 !important;
      height: 100% !important;
    }
    .t-barcode-bars .bar.thin { width: 2px !important; }
    .t-barcode-bars .bar.medium { width: 4px !important; }
    .t-barcode-bars .bar.thick { width: 6px !important; }
    .t-barcode-text {
      font-size: 10.5px !important;
      font-weight: 800 !important;
      letter-spacing: 0.08em !important;
    }
    .t-ship-to-section {
      padding: 8px 8px !important;
      border-bottom: 2px solid #000000 !important;
      background: #ffffff !important;
    }
    .t-section-label {
      display: block !important;
      font-size: 8.5px !important;
      font-weight: 900 !important;
      letter-spacing: 0.05em !important;
      color: #000000 !important;
      margin-bottom: 3px !important;
    }
    .t-receiver-name {
      font-size: 16px !important;
      font-weight: 900 !important;
      margin: 0 0 2px 0 !important;
      color: #000000 !important;
      line-height: 1.15 !important;
    }
    .t-receiver-company {
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #000000 !important;
      margin-bottom: 2px !important;
    }
    .t-receiver-address {
      font-size: 11.5px !important;
      font-weight: 600 !important;
      color: #000000 !important;
      margin-bottom: 3px !important;
      line-height: 1.25 !important;
    }
    .t-receiver-city-state {
      font-size: 12px !important;
      font-weight: 800 !important;
      color: #000000 !important;
      margin-bottom: 4px !important;
    }
    .t-pincode-phone-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-top: 3px !important;
    }
    .t-pincode-highlight {
      background: #000000 !important;
      color: #ffffff !important;
      padding: 3px 8px !important;
      font-size: 15px !important;
      font-weight: 900 !important;
      letter-spacing: 0.05em !important;
    }
    .t-receiver-phone {
      font-size: 12px !important;
      font-weight: 900 !important;
      color: #000000 !important;
    }
    .t-payment-banner {
      padding: 6px 8px !important;
      text-align: center !important;
      border-bottom: 2px solid #000000 !important;
    }
    .t-payment-banner.prepaid {
      background: #f1f5f9 !important;
      border-top: 1px solid #000000 !important;
    }
    .t-payment-banner.cod {
      background: #000000 !important;
      color: #ffffff !important;
    }
    .t-pay-title {
      font-size: 13px !important;
      font-weight: 900 !important;
      display: block !important;
      letter-spacing: 0.04em !important;
    }
    .t-payment-banner.cod .t-pay-title,
    .t-collect-amount {
      color: #ffffff !important;
    }
    .t-collect-amount {
      font-size: 15px !important;
      font-weight: 900 !important;
      display: block !important;
      margin-top: 2px !important;
    }
    .t-bottom-details-grid {
      display: grid !important;
      grid-template-columns: 1.4fr 0.8fr !important;
      border-bottom: 2px solid #000000 !important;
    }
    .t-return-block {
      padding: 6px 6px !important;
      border-right: 2px solid #000000 !important;
      font-size: 9px !important;
    }
    .t-shipper-name {
      display: block !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      color: #000000 !important;
      margin-bottom: 1px !important;
    }
    .t-shipper-address {
      font-size: 8.5px !important;
      line-height: 1.2 !important;
      color: #000000 !important;
    }
    .t-shipper-contact {
      font-size: 8.5px !important;
      font-weight: 700 !important;
      margin-top: 2px !important;
    }
    .t-package-specs {
      padding: 6px 6px !important;
      font-size: 9px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 1.5px !important;
    }
    .t-box-contents-strip {
      padding: 5px 6px !important;
      border-bottom: 2px solid #000000 !important;
      font-size: 9px !important;
    }
    .t-items-list {
      display: flex !important;
      flex-direction: column !important;
      gap: 1.5px !important;
    }
    .t-item-line {
      display: flex !important;
      justify-content: space-between !important;
      font-size: 8.5px !important;
      color: #000000 !important;
    }
    .t-footer-warning {
      padding: 4px 6px !important;
      text-align: center !important;
      font-size: 8px !important;
      font-weight: 900 !important;
      color: #000000 !important;
    }
    .t-footer-sub {
      font-size: 7.5px !important;
      font-weight: normal !important;
      margin-top: 1px !important;
    }
  </style>
</head>
<body>
  ${labelEl.outerHTML}
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.error("Iframe print error, falling back to window.print():", err);
        window.print();
      }
    }, 200);
  };

  // Generate 4" x 6" Vector Thermal PDF via jsPDF
  const handleDownloadThermalPDF = () => {
    // 4 inches wide x 6 inches high (standard 6x4 thermal shipping label)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: [4, 6]
    });

    const d = labelData;

    // Outer Border (crisp pure black for thermal head)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.02);
    doc.rect(0.08, 0.08, 3.84, 5.84);

    // 1. CARRIER HEADER BOX
    doc.setFillColor(0, 0, 0);
    doc.rect(0.08, 0.08, 3.84, 0.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text(String(d.carrier).toUpperCase(), 0.18, 0.35);

    doc.setFontSize(9);
    doc.text(String(d.serviceType || "STANDARD AIR").toUpperCase(), 0.18, 0.5);

    doc.setFontSize(11);
    doc.text(`PIN: ${d.receiverPincode || "637202"}`, 2.8, 0.38);

    // 2. AWB & BARCODE BOX
    doc.setDrawColor(0, 0, 0);
    doc.line(0.08, 0.58, 3.92, 0.58);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.text(`AWB / TRACKING #: ${d.trackingNumber}`, 0.18, 0.72);
    doc.setFont("Helvetica", "normal");
    doc.text(`Doc Ref: ${d.documentNumber} | Date: ${d.shipDate}`, 0.18, 0.84);

    // Synthetic Barcode Lines (crisp vector bars suitable for 203 DPI thermal printers)
    let barX = 0.18;
    const barY = 0.92;
    const barHeight = 0.42;
    const digits = String(d.trackingNumber).replace(/\D/g, "") || "8807080216";

    for (let i = 0; i < 48; i++) {
      const isThick = digits.charCodeAt(i % digits.length) % 2 === 0;
      const barWidth = isThick ? 0.035 : 0.018;
      doc.setFillColor(0, 0, 0);
      doc.rect(barX, barY, barWidth, barHeight, "F");
      barX += barWidth + 0.03;
      if (barX > 3.75) break;
    }

    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "bold");
    doc.text(`* ${d.trackingNumber} *`, 1.35, 1.44);

    // Divider
    doc.line(0.08, 1.5, 3.92, 1.5);

    // 3. SHIP TO / CONSIGNEE (PRIMARY DELIVERY BLOCK)
    doc.setFillColor(240, 240, 240);
    doc.rect(0.08, 1.5, 3.84, 0.22, "F");
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.text("DELIVER TO / SHIP TO:", 0.18, 1.65);

    // Consignee Name (Big & Bold)
    doc.setFontSize(13);
    doc.setFont("Helvetica", "bold");
    doc.text(String(d.receiverName).toUpperCase(), 0.18, 1.9);

    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    let shipY = 2.05;
    if (d.receiverCompany) {
      doc.text(String(d.receiverCompany), 0.18, shipY);
      shipY += 0.14;
    }

    const splitAddr = doc.splitTextToSize(String(d.receiverAddress || "Address"), 3.5);
    doc.text(splitAddr, 0.18, shipY);
    shipY += splitAddr.length * 0.14;

    doc.setFont("Helvetica", "bold");
    doc.text(`${d.receiverCity || ""}, ${d.receiverState || "Tamil Nadu"}`, 0.18, shipY);
    shipY += 0.16;

    // Large PINCODE Box
    doc.setFillColor(0, 0, 0);
    doc.rect(0.18, shipY, 1.8, 0.32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`PIN: ${d.receiverPincode}`, 0.25, shipY + 0.23);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Phone: ${d.receiverPhone}`, 2.1, shipY + 0.21);

    // Divider
    doc.line(0.08, 3.0, 3.92, 3.0);

    // 4. COD / PREPAID STATUS BLOCK
    doc.setFillColor(d.isCOD ? 0 : 235, d.isCOD ? 0 : 235, d.isCOD ? 0 : 235);
    doc.rect(0.08, 3.0, 3.84, 0.44, "F");

    if (d.isCOD) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("Helvetica", "bold");
      doc.text("CASH ON DELIVERY (COD)", 0.2, 3.25);
      doc.setFontSize(13);
      doc.text(`COLLECT: INR ${Number(d.collectAmount).toLocaleString("en-IN")}`, 0.2, 3.39);
    } else {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(15);
      doc.setFont("Helvetica", "bold");
      doc.text("PREPAID - DO NOT COLLECT CASH", 0.2, 3.3);
    }

    // Divider
    doc.line(0.08, 3.44, 3.92, 3.44);

    // 5. SHIPPER / RETURN TO (BOTTOM LEFT) & PACKAGE DETAILS (BOTTOM RIGHT)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.text("RETURN IF UNDELIVERED TO:", 0.18, 3.6);

    doc.setFontSize(9);
    doc.text(d.shipperName, 0.18, 3.75);

    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "normal");
    const splitReturn = doc.splitTextToSize(
      `${d.shipperAddress}, ${d.shipperCity}, ${d.shipperState} - ${d.shipperPincode}`,
      2.1
    );
    doc.text(splitReturn, 0.18, 3.9);
    doc.text(`Phone: ${d.shipperPhone}`, 0.18, 4.2);
    doc.text(`GST: ${d.shipperGstin}`, 0.18, 4.32);

    // Package details on Right
    doc.line(2.4, 3.44, 2.4, 4.45);
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.text("PACKAGE DETAILS:", 2.5, 3.6);
    doc.setFont("Helvetica", "normal");
    doc.text(`Weight: ${d.weightKg} kg`, 2.5, 3.76);
    doc.text(`Dims: ${d.dimensions}`, 2.5, 3.9);
    doc.text(`Packages: ${d.packageCount}`, 2.5, 4.04);
    doc.text(`Order: ${d.documentNumber}`, 2.5, 4.18);

    // Divider
    doc.line(0.08, 4.45, 3.92, 4.45);

    // 6. ITEM CONTENTS SUMMARY TABLE
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.text("BOX CONTENTS / PACKING SLIP:", 0.18, 4.6);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    let itemY = 4.75;
    (d.items || []).slice(0, 3).forEach((item, idx) => {
      const title = `${idx + 1}. ${String(item.name).substring(0, 36)} ${item.sku ? `(${item.sku})` : ""}`;
      doc.text(title, 0.18, itemY);
      doc.text(`Qty: ${item.quantity || 1}`, 3.4, itemY);
      itemY += 0.14;
    });

    // Divider
    doc.line(0.08, 5.25, 3.92, 5.25);

    // 7. FOOTER NOTICE (BOLD THERMAL ATTENTION)
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.text(String(d.handlingInstructions), 0.18, 5.45);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Thermal Shipping Slip • Verified by EToSM Logistics Dispatch", 0.18, 5.75);

    doc.save(`EToSM_ThermalLabel_6x4_${d.documentNumber}.pdf`);
    showToast(`Downloaded 6x4 Thermal Shipping Label for #${d.documentNumber}`);
  };

  // Filtered source list
  const filteredSources = useMemo(() => {
    const list = (selectedSourceType === "order" ? sources?.orders : sources?.invoices) || [];
    if (!Array.isArray(list)) return [];
    if (!searchTerm || !searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (s) =>
        (s?.documentNumber || "").toLowerCase().includes(q) ||
        (s?.shipTo?.name || "").toLowerCase().includes(q) ||
        (s?.shipTo?.phone || "").includes(q) ||
        (s?.shipTo?.city || "").toLowerCase().includes(q)
    );
  }, [sources, selectedSourceType, searchTerm]);

  return (
    <AdminLayout>
      <div className="shipping-labels-page">
        {/* Toast */}
        {toast && (
          <div className={`sl-toast ${toast.type}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="sl-page-header no-print">
          <div className="header-title-box">
            <span className="sl-eyebrow">LOGISTICS & DISPATCH</span>
            <h1>9. Shipping Labels (6*4 Thermal)</h1>
            <p>
              Standard 6x4 inch (100mm × 150mm) high-contrast thermal shipping labels formatted for roll printers (Rollo, Zebra, Munbyn, TSC, TVS). Direct 1-click thermal printing and vector PDF export.
            </p>
          </div>

          <div className="header-actions-box">
            <button className="sl-btn primary" onClick={handlePrintThermal}>
              <Printer size={16} />
              <span>Print 6x4 Thermal Label</span>
            </button>
            <button className="sl-btn secondary" onClick={handleDownloadThermalPDF}>
              <Download size={16} />
              <span>Download 6x4 PDF</span>
            </button>
            <button className="sl-btn icon-only" onClick={fetchSources} title="Refresh Source Orders">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Main 2-Column Workspace: Left Controls / Right 6x4 Thermal Preview */}
        <div className="sl-workspace-grid">
          {/* ========================================================
              LEFT COLUMN: SOURCE PICKER & CUSTOMIZATION CONTROLS
             ======================================================== */}
          <div className="sl-controls-panel no-print">
            {/* Source Selection Card */}
            <div className="sl-card">
              <div className="card-top-row">
                <h3>1. Select Source Package</h3>
                <div className="type-toggle-pills">
                  <button
                    className={`toggle-pill ${selectedSourceType === "order" ? "active" : ""}`}
                    onClick={() => setSelectedSourceType("order")}
                  >
                    Online Orders ({sources?.orders?.length || 0})
                  </button>
                  <button
                    className={`toggle-pill ${selectedSourceType === "invoice" ? "active" : ""}`}
                    onClick={() => setSelectedSourceType("invoice")}
                  >
                    Invoices ({sources?.invoices?.length || 0})
                  </button>
                </div>
              </div>

              <div className="source-search-wrap">
                <Search size={14} className="s-icon" />
                <input
                  type="text"
                  placeholder={`Search ${selectedSourceType} by ID, customer name, phone...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="source-items-list">
                {(filteredSources || []).slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className={`source-item-row ${selectedSourceId === item.id ? "selected" : ""}`}
                    onClick={() => handleSelectSource(item.id, selectedSourceType)}
                  >
                    <div className="item-meta">
                      <strong className="doc-num">#{item.documentNumber}</strong>
                      <span className="cust-title">{item.shipTo?.name || "Customer"}</span>
                      <small className="loc-text">{item.shipTo?.city || item.shipTo?.state || "Tamil Nadu"}</small>
                    </div>
                    <div className="item-badge-wrap">
                      <span className={`cod-tag ${item.isCOD ? "cod" : "prepaid"}`}>
                        {item.isCOD ? `COD ₹${item.collectAmount}` : "PREPAID"}
                      </span>
                    </div>
                  </div>
                ))}
                {(!filteredSources || filteredSources.length === 0) && (
                  <div style={{ padding: "16px 12px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    No matching {selectedSourceType === "order" ? "orders" : "invoices"} found.
                  </div>
                )}
              </div>
            </div>

            {/* Customization Details Card */}
            <div className="sl-card mt-16">
              <h3>2. Shipping & Carrier Details</h3>

              <div className="sl-form-grid-2">
                <div className="sl-field">
                  <label>Carrier / Logistics</label>
                  <select
                    value={labelData.carrier}
                    onChange={(e) => setLabelData({ ...labelData, carrier: e.target.value })}
                  >
                    {CARRIERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="sl-field">
                  <label>Service Speed</label>
                  <input
                    type="text"
                    value={labelData.serviceType}
                    onChange={(e) => setLabelData({ ...labelData, serviceType: e.target.value })}
                  />
                </div>
              </div>

              <div className="sl-form-grid-2">
                <div className="sl-field">
                  <label>Tracking / AWB Number</label>
                  <input
                    type="text"
                    value={labelData.trackingNumber}
                    onChange={(e) => setLabelData({ ...labelData, trackingNumber: e.target.value })}
                  />
                </div>

                <div className="sl-field">
                  <label>Order / Doc Reference</label>
                  <input
                    type="text"
                    value={labelData.documentNumber}
                    onChange={(e) => setLabelData({ ...labelData, documentNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="sl-form-grid-3">
                <div className="sl-field">
                  <label>Weight (kg)</label>
                  <input
                    type="text"
                    value={labelData.weightKg}
                    onChange={(e) => setLabelData({ ...labelData, weightKg: e.target.value })}
                  />
                </div>

                <div className="sl-field">
                  <label>Dimensions</label>
                  <input
                    type="text"
                    value={labelData.dimensions}
                    onChange={(e) => setLabelData({ ...labelData, dimensions: e.target.value })}
                  />
                </div>

                <div className="sl-field">
                  <label>Packages</label>
                  <input
                    type="text"
                    value={labelData.packageCount}
                    onChange={(e) => setLabelData({ ...labelData, packageCount: e.target.value })}
                  />
                </div>
              </div>

              <div className="sl-cod-toggle-box">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={labelData.isCOD}
                    onChange={(e) => setLabelData({ ...labelData, isCOD: e.target.checked })}
                  />
                  <span>Cash on Delivery (COD)</span>
                </label>

                {labelData.isCOD && (
                  <div className="cod-amount-input">
                    <label>Collect (₹):</label>
                    <input
                      type="number"
                      value={labelData.collectAmount}
                      onChange={(e) => setLabelData({ ...labelData, collectAmount: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Consignee Address Card */}
            <div className="sl-card mt-16">
              <h3>3. Consignee Delivery Address</h3>

              <div className="sl-form-grid-2">
                <div className="sl-field">
                  <label>Receiver Full Name *</label>
                  <input
                    type="text"
                    value={labelData.receiverName}
                    onChange={(e) => setLabelData({ ...labelData, receiverName: e.target.value })}
                  />
                </div>

                <div className="sl-field">
                  <label>Contact Mobile Number *</label>
                  <input
                    type="tel"
                    value={labelData.receiverPhone}
                    onChange={(e) => setLabelData({ ...labelData, receiverPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="sl-field">
                <label>Delivery Street Address *</label>
                <textarea
                  rows={2}
                  value={labelData.receiverAddress}
                  onChange={(e) => setLabelData({ ...labelData, receiverAddress: e.target.value })}
                />
              </div>

              <div className="sl-form-grid-3">
                <div className="sl-field">
                  <label>City / Town</label>
                  <input
                    type="text"
                    value={labelData.receiverCity}
                    onChange={(e) => setLabelData({ ...labelData, receiverCity: e.target.value })}
                  />
                </div>

                <div className="sl-field">
                  <label>State</label>
                  <input
                    type="text"
                    value={labelData.receiverState}
                    onChange={(e) => setLabelData({ ...labelData, receiverState: e.target.value })}
                  />
                </div>

                <div className="sl-field">
                  <label>Delivery PINCODE *</label>
                  <input
                    type="text"
                    value={labelData.receiverPincode}
                    onChange={(e) => setLabelData({ ...labelData, receiverPincode: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: EXACT 6x4 THERMAL PRINTER PREVIEW
             ======================================================== */}
          <div className="sl-preview-panel">
            <div className="preview-top-toolbar no-print">
              <span className="thermal-badge">
                <Printer size={14} />
                <span>6" × 4" THERMAL PRINT PREVIEW (100mm × 150mm)</span>
              </span>
              <div className="preview-actions">
                <button className="sl-btn primary small" onClick={handlePrintThermal}>
                  <Printer size={14} /> Print Thermal
                </button>
                <button className="sl-btn secondary small" onClick={handleDownloadThermalPDF}>
                  <Download size={14} /> Vector PDF
                </button>
              </div>
            </div>

            {/* THE THERMAL LABEL CONTAINER (EXACT 4" x 6" ASPECT RATIO) */}
            <div className="thermal-label-container print-target" id="thermal-label-print">
              {/* 1. CARRIER HEADER */}
              <div className="t-carrier-banner">
                <div className="t-carrier-info">
                  <h2 className="t-carrier-name">{(labelData.carrier || "DELIVERY EXPRESS").toUpperCase()}</h2>
                  <span className="t-service-type">{(labelData.serviceType || "STANDARD AIR").toUpperCase()}</span>
                </div>
                <div className="t-routing-hub">
                  <span className="t-hub-label">HUB / PIN</span>
                  <strong className="t-hub-val">{labelData.receiverPincode || "637202"}</strong>
                </div>
              </div>

              {/* 2. TRACKING & BARCODE */}
              <div className="t-tracking-block">
                <div className="t-tracking-meta">
                  <span className="t-track-bold">AWB / TRACKING #: {labelData.trackingNumber || "N/A"}</span>
                  <span className="t-doc-ref">DOC: #{labelData.documentNumber || "N/A"} | DATE: {labelData.shipDate || ""}</span>
                </div>

                {/* Pure CSS/SVG Thermal-Clean Barcode Representation */}
                <div className="t-barcode-bars" aria-hidden="true">
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar medium"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar medium"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar medium"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar medium"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar medium"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                  <div className="bar thin"></div>
                  <div className="bar thick"></div>
                  <div className="bar thin"></div>
                </div>
                <div className="t-barcode-text">* {labelData.trackingNumber || "AWB"} *</div>
              </div>

              {/* 3. PRIMARY SHIP-TO CONSIGNEE SECTION */}
              <div className="t-ship-to-section">
                <span className="t-section-label">DELIVER TO / SHIP TO:</span>
                <h3 className="t-receiver-name">{(labelData.receiverName || "CUSTOMER").toUpperCase()}</h3>

                {labelData.receiverCompany && (
                  <div className="t-receiver-company">{labelData.receiverCompany}</div>
                )}

                <div className="t-receiver-address">
                  {labelData.receiverAddress || "Address"}
                </div>

                <div className="t-receiver-city-state">
                  <strong>{labelData.receiverCity || ""}{labelData.receiverState ? `, ${labelData.receiverState}` : ""}</strong>
                </div>

                <div className="t-pincode-phone-row">
                  <div className="t-pincode-highlight">
                    PIN: {labelData.receiverPincode || "637202"}
                  </div>
                  <div className="t-receiver-phone">
                    PHONE: {labelData.receiverPhone || "N/A"}
                  </div>
                </div>
              </div>

              {/* 4. COD OR PREPAID BANNER */}
              <div className={`t-payment-banner ${labelData.isCOD ? "cod" : "prepaid"}`}>
                {labelData.isCOD ? (
                  <div className="t-cod-content">
                    <span className="t-pay-title">CASH ON DELIVERY (COD)</span>
                    <strong className="t-collect-amount">COLLECT: ₹{Number(labelData.collectAmount).toLocaleString("en-IN")}</strong>
                  </div>
                ) : (
                  <div className="t-prepaid-content">
                    <span className="t-pay-title">PREPAID - DO NOT COLLECT CASH</span>
                  </div>
                )}
              </div>

              {/* 5. RETURN SENDER INFO & PACKAGE SPECS */}
              <div className="t-bottom-details-grid">
                <div className="t-return-block">
                  <span className="t-section-label">RETURN IF UNDELIVERED TO:</span>
                  <strong className="t-shipper-name">{labelData.shipperName}</strong>
                  <div className="t-shipper-address">
                    {labelData.shipperAddress}, {labelData.shipperCity}, {labelData.shipperState} - {labelData.shipperPincode}
                  </div>
                  <div className="t-shipper-contact">
                    Ph: {labelData.shipperPhone} | GST: {labelData.shipperGstin}
                  </div>
                </div>

                <div className="t-package-specs">
                  <span className="t-section-label">SPECS:</span>
                  <div><strong>WT:</strong> {labelData.weightKg} kg</div>
                  <div><strong>DIMS:</strong> {labelData.dimensions}</div>
                  <div><strong>PKG:</strong> {labelData.packageCount}</div>
                  <div><strong>REF:</strong> #{labelData.documentNumber}</div>
                </div>
              </div>

              {/* 6. BOX PACKING LIST ITEMS */}
              <div className="t-box-contents-strip">
                <span className="t-section-label">BOX CONTENTS:</span>
                <div className="t-items-list">
                  {(labelData.items || []).slice(0, 3).map((it, idx) => (
                    <div key={idx} className="t-item-line">
                      <span>{idx + 1}. {it.name} {it.sku ? `(${it.sku})` : ""}</span>
                      <strong>x{it.quantity || 1}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. THERMAL FOOTER WARNING */}
              <div className="t-footer-warning">
                <strong>{labelData.handlingInstructions}</strong>
                <div className="t-footer-sub">
                  Official Thermal Shipping Slip • EToSM Technology Logistics
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ShippingLabelsPage;
