import API_BASE_URL from "../apiConfig";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Printer,
  Download,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  MapPin,
  Phone,
  Hash,
  Sparkles,
  Info,
  Check
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { downloadShippingLabelPdf, splitAddress } from "../utils/shippingLabelPdfGenerator";
import "./ShippingLabelsPage.css";

const DEFAULT_LABEL = {
  documentNumber: "tv100045in",
  // SENDER
  senderName: "EToSM Technology",
  senderAddr1: "2/167, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu,",
  senderPincode: "637202",
  customerId: "1420189578",
  senderPhone: "8807080216",
  // RECEIVER
  receiverName: "Stainless",
  receiverAddr1: "Bituhar suvani bastraly, Bituhar shailendra chaubey village bituhar",
  receiverAddr2: "post sothigaw, Madhubani, BIHAR 847240",
  receiverPhone: "8080001850",
  // TRACKING
  trackingNo: "tv100045in"
};

const ShippingLabelsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // State
  const [sources, setSources] = useState({ orders: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [selectedSourceType, setSelectedSourceType] = useState("order"); // "order" | "invoice"
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Label Form Data (6" x 4" Official Thermal Format)
  const [labelData, setLabelData] = useState(DEFAULT_LABEL);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth & Initial load
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
      applyPrefill(location.state.prefill);
    }
  }, [location.state]);

  const applyPrefill = (p) => {
    if (!p) return;
    const ship = p.shipTo || {};
    let addr1 = ship.address || "";
    let addr2 = [ship.city, ship.state, ship.pincode].filter(Boolean).join(", ");

    if (!addr2 && addr1) {
      const sp = splitAddress(addr1);
      addr1 = sp.line1;
      addr2 = sp.line2;
    }

    const docNo = p.documentNumber || "ORD-1001";
    const trackNo = p.trackingNumber || ("tv" + Math.floor(100000 + Math.random() * 900000) + "in");
    const custId = ship.phone ? ship.phone.replace(/\D/g, "") : String(docNo).replace(/\D/g, "") || "1420189578";

    setLabelData((prev) => ({
      ...prev,
      documentNumber: docNo,
      customerId: custId,
      receiverName: ship.name || prev.receiverName,
      receiverAddr1: addr1 || prev.receiverAddr1,
      receiverAddr2: addr2 || prev.receiverAddr2,
      receiverPhone: ship.phone || prev.receiverPhone,
      trackingNo: trackNo
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

        // Preload first order if available and not passed via navigation state
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

  // Load Official Sample Data
  const handleLoadSample = () => {
    setLabelData(DEFAULT_LABEL);
    setSelectedSourceId("");
    showToast("Loaded official 6x4 sample template (Stainless / Bituhar)");
  };

  // Direct 6x4 Browser Thermal Print - Single Page Guarantee
  const handlePrintThermal = () => {
    const oldFrame = document.getElementById("thermal-print-iframe");
    if (oldFrame) {
      oldFrame.remove();
    }

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
  <title>Shipping_Label_${labelData.trackingNo || labelData.documentNumber || "EToSM"}</title>
  <style>
    @page {
      size: 6in 4in;
      margin: 0 !important;
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
      width: 6in !important;
      height: 4in !important;
      max-height: 4in !important;
      overflow: hidden !important;
      background: #ffffff !important;
      font-family: Helvetica, Arial, sans-serif !important;
      color: #000000 !important;
    }
    .thermal-label-container {
      width: 6in !important;
      height: 4in !important;
      max-height: 4in !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .t-top-bar {
      width: 100% !important;
      height: 0.15in !important;
      background: #b01a2b !important;
      flex-shrink: 0 !important;
    }
    .t-content {
      padding: 0.14in 0.24in 0.16in 0.24in !important;
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    .t-section-tag {
      font-size: 9pt !important;
      font-weight: 700 !important;
      color: #b01a2b !important;
      letter-spacing: 0.04em !important;
      text-transform: uppercase !important;
      margin-bottom: 2pt !important;
    }
    .t-sender-name {
      font-size: 12pt !important;
      font-weight: 700 !important;
      color: #000000 !important;
      margin: 0 !important;
      line-height: 1.2 !important;
    }
    .t-sender-address {
      font-size: 8pt !important;
      color: #383838 !important;
      line-height: 1.25 !important;
    }
    .t-sender-meta-row {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-top: 3pt !important;
    }
    .cust-id-group {
      display: flex !important;
      align-items: center !important;
      gap: 6pt !important;
    }
    .cust-id-label {
      font-size: 9pt !important;
      color: #595959 !important;
    }
    .cust-id-val {
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #b01a2b !important;
    }
    .sender-phone {
      font-size: 8pt !important;
      color: #383838 !important;
    }
    .t-divider {
      height: 0.8pt !important;
      background: #d1d1d1 !important;
      margin: 6pt 0 !important;
      border: none !important;
      width: 100% !important;
      flex-shrink: 0 !important;
    }
    .t-receiver-name {
      font-size: 15pt !important;
      font-weight: 700 !important;
      color: #000000 !important;
      margin: 0 0 3pt 0 !important;
      line-height: 1.2 !important;
    }
    .t-receiver-address {
      font-size: 10pt !important;
      color: #000000 !important;
      line-height: 1.35 !important;
    }
    .t-receiver-phone {
      font-size: 10pt !important;
      font-weight: 700 !important;
      color: #000000 !important;
      margin-top: 6pt !important;
    }
    .t-tracking-label {
      font-size: 8pt !important;
      color: #595959 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
    }
    .t-tracking-val {
      font-size: 15pt !important;
      font-weight: 700 !important;
      color: #000000 !important;
      line-height: 1.1 !important;
    }
  </style>
</head>
<body>
  <div class="thermal-label-container">
    <div class="t-top-bar"></div>
    <div class="t-content">
      <!-- SENDER -->
      <div class="t-sender-section">
        <div class="t-section-tag">SENDER</div>
        <div class="t-sender-name">${labelData.senderName}</div>
        <div class="t-sender-address">${labelData.senderAddr1}</div>
        <div class="t-sender-address">${labelData.senderPincode}</div>
        <div class="t-sender-meta-row">
          <div class="cust-id-group">
            <span class="cust-id-label">CUSTOMER ID:</span>
            <span class="cust-id-val">${labelData.customerId}</span>
          </div>
          <span class="sender-phone">Phone: ${labelData.senderPhone}</span>
        </div>
      </div>

      <div class="t-divider"></div>

      <!-- RECEIVER -->
      <div class="t-receiver-section">
        <div class="t-section-tag">RECEIVER</div>
        <div class="t-receiver-name">${labelData.receiverName}</div>
        <div class="t-receiver-address">${labelData.receiverAddr1}</div>
        ${labelData.receiverAddr2 ? `<div class="t-receiver-address">${labelData.receiverAddr2}</div>` : ""}
        <div class="t-receiver-phone">PHONE: ${labelData.receiverPhone}</div>
      </div>

      <div class="t-divider"></div>

      <!-- ARTICLE / TRACKING NO. -->
      <div class="t-tracking-section">
        <div class="t-tracking-label">ARTICLE / TRACKING NO.</div>
        <div class="t-tracking-val">${labelData.trackingNo}</div>
      </div>
    </div>
  </div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.error("Print thermal error:", err);
      }
    }, 200);
  };

  // Download Exact 6x4 Vector PDF (matching client specification)
  const handleDownloadThermalPDF = () => {
    const filename = `EToSM_ShippingLabel_6x4_${labelData.trackingNo || labelData.documentNumber || "label"}.pdf`;
    downloadShippingLabelPdf(labelData, filename);
    showToast(`Downloaded official 6x4 thermal PDF (${labelData.trackingNo})`);
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
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="sl-page-header no-print">
          <div className="header-title-box">
            <span className="sl-eyebrow">LOGISTICS & DISPATCH</span>
            <h1>Shipping Labels</h1>
            <p>
              Official thermal shipping label formatted strictly to company template specification. Direct 1-click thermal roll printing and vector PDF export.
            </p>
          </div>

          <div className="header-actions-box">
            <button className="sl-btn primary" onClick={handlePrintThermal}>
              <Printer size={16} />
              <span>Print Label</span>
            </button>
            <button className="sl-btn secondary" onClick={handleDownloadThermalPDF}>
              <Download size={16} />
              <span>Download PDF</span>
            </button>
            <button className="sl-btn secondary" onClick={handleLoadSample} title="Load Official PDF Sample">
              <Sparkles size={16} />
              <span>Load Sample PDF</span>
            </button>
            <button className="sl-btn icon-only" onClick={fetchSources} title="Refresh Source Orders">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* 1. TOP SOURCE SELECTION BAR (Full Width) */}
        <div className="sl-card sl-source-bar no-print">
          <div className="source-bar-header">
            <div className="source-bar-title-group">
              <h3>1. Select Source Package</h3>
              <span className="source-bar-sub">Click any package to auto-fill customer delivery & tracking details</span>
            </div>
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

          <div className="source-bar-body">
            <div className="source-search-inline">
              <Search size={14} className="s-icon" />
              <input
                type="text"
                placeholder={`Search ${selectedSourceType} by ID, name, phone...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="source-chips-container">
              {(filteredSources || []).slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className={`source-chip ${selectedSourceId === item.id ? "selected" : ""}`}
                  onClick={() => handleSelectSource(item.id, selectedSourceType)}
                >
                  <strong className="chip-doc">#{item.documentNumber}</strong>
                  <span className="chip-name">{item.shipTo?.name || "Customer"}</span>
                  <span className={`chip-badge ${item.isCOD ? "cod" : "prepaid"}`}>
                    {item.isCOD ? "COD" : "Prepaid"}
                  </span>
                </div>
              ))}
              {(!filteredSources || filteredSources.length === 0) && (
                <div style={{ color: "#64748b", fontSize: "12.5px", padding: "6px 8px" }}>
                  No matching {selectedSourceType === "order" ? "orders" : "invoices"} found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main 2-Column Equal Width Workspace */}
        <div className="sl-workspace-grid">
          {/* ========================================================
              LEFT COLUMN: FORM EDITORS
             ======================================================== */}
          <div className="sl-controls-panel no-print">
            {/* 2. SENDER Information Card */}
            <div className="sl-card">
              <div className="card-header-clean">
                <span className="card-step-badge">2</span>
                <h3>SENDER Details</h3>
              </div>

              <div className="sl-form-grid-2">
                <div className="sl-field">
                  <label>Company / Store Name</label>
                  <input
                    type="text"
                    value={labelData.senderName}
                    onChange={(e) => setLabelData({ ...labelData, senderName: e.target.value })}
                    placeholder="EToSM Technology"
                  />
                </div>
                <div className="sl-field">
                  <label>Sender Phone</label>
                  <input
                    type="text"
                    value={labelData.senderPhone}
                    onChange={(e) => setLabelData({ ...labelData, senderPhone: e.target.value })}
                    placeholder="8807080216"
                  />
                </div>
              </div>

              <div className="sl-field">
                <label>Sender Address Line 1</label>
                <input
                  type="text"
                  value={labelData.senderAddr1}
                  onChange={(e) => setLabelData({ ...labelData, senderAddr1: e.target.value })}
                  placeholder="2/167, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu,"
                />
              </div>

              <div className="sl-form-grid-2">
                <div className="sl-field">
                  <label>Pincode</label>
                  <input
                    type="text"
                    value={labelData.senderPincode}
                    onChange={(e) => setLabelData({ ...labelData, senderPincode: e.target.value })}
                    placeholder="637202"
                  />
                </div>
                <div className="sl-field">
                  <label>Customer / Ref ID</label>
                  <input
                    type="text"
                    value={labelData.customerId}
                    onChange={(e) => setLabelData({ ...labelData, customerId: e.target.value })}
                    placeholder="1420189578"
                  />
                </div>
              </div>
            </div>

            {/* 3. RECEIVER & TRACKING Details Card */}
            <div className="sl-card mt-16">
              <div className="card-header-clean">
                <span className="card-step-badge">3</span>
                <h3>RECEIVER & TRACKING Details</h3>
              </div>

              <div className="sl-form-grid-2">
                <div className="sl-field">
                  <label>Customer / Receiver Name</label>
                  <input
                    type="text"
                    value={labelData.receiverName}
                    onChange={(e) => setLabelData({ ...labelData, receiverName: e.target.value })}
                    placeholder="Stainless"
                  />
                </div>
                <div className="sl-field">
                  <label>Receiver Phone Number</label>
                  <input
                    type="text"
                    value={labelData.receiverPhone}
                    onChange={(e) => setLabelData({ ...labelData, receiverPhone: e.target.value })}
                    placeholder="8080001850"
                  />
                </div>
              </div>

              <div className="sl-field">
                <label>Receiver Address Line 1 (Street / Village / Area)</label>
                <input
                  type="text"
                  value={labelData.receiverAddr1}
                  onChange={(e) => setLabelData({ ...labelData, receiverAddr1: e.target.value })}
                  placeholder="Bituhar suvani bastraly, Bituhar shailendra chaubey village bituhar"
                />
              </div>

              <div className="sl-field">
                <label>Receiver Address Line 2 (Post, District, State & Pincode)</label>
                <input
                  type="text"
                  value={labelData.receiverAddr2}
                  onChange={(e) => setLabelData({ ...labelData, receiverAddr2: e.target.value })}
                  placeholder="post sothigaw, Madhubani, BIHAR 847240"
                />
              </div>

              <div className="tracking-input-box">
                <div className="sl-field" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                  <label>Article / Tracking Number</label>
                  <input
                    type="text"
                    value={labelData.trackingNo}
                    onChange={(e) => setLabelData({ ...labelData, trackingNo: e.target.value })}
                    placeholder="tv100045in"
                    className="tracking-highlight-input"
                  />
                </div>
                <button
                  type="button"
                  className="sl-btn secondary small"
                  onClick={() => {
                    const newTrack = "tv" + Math.floor(100000 + Math.random() * 900000) + "in";
                    setLabelData({ ...labelData, trackingNo: newTrack });
                  }}
                  title="Generate new Tracking ID"
                  style={{ alignSelf: "flex-end", height: "38px", flexShrink: 0 }}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: EXACT 6x4 THERMAL PRINTER PREVIEW
             ======================================================== */}
          <div className="sl-preview-panel">
            <div className="preview-top-toolbar no-print">
              <span className="thermal-badge">
                <Printer size={15} />
                <span>Label Preview</span>
              </span>
              <div className="preview-actions">
                <button className="sl-btn primary small" onClick={handlePrintThermal} title="Print 6x4 Thermal Label">
                  <Printer size={14} /> Print
                </button>
                <button className="sl-btn secondary small" onClick={handleDownloadThermalPDF} title="Download Vector PDF">
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>

            {/* THE THERMAL LABEL CONTAINER (EXACT 6" x 4" PROPORTION) */}
            <div className="thermal-label-container print-target" id="thermal-label-print">
              {/* TOP RED BAR (11pt / #b01a2b) */}
              <div className="t-top-bar"></div>

              {/* LABEL BODY CONTENT */}
              <div className="t-content">
                {/* 1. SENDER SECTION */}
                <div className="t-sender-section">
                  <span className="t-section-tag">SENDER</span>
                  <h2 className="t-sender-name">{labelData.senderName}</h2>
                  <div className="t-sender-address">{labelData.senderAddr1}</div>
                  <div className="t-sender-address">{labelData.senderPincode}</div>
                  <div className="t-sender-meta-row">
                    <div className="cust-id-group">
                      <span className="cust-id-label">CUSTOMER ID:</span>
                      <strong className="cust-id-val">{labelData.customerId}</strong>
                    </div>
                    <span className="sender-phone">Phone: {labelData.senderPhone}</span>
                  </div>
                </div>

                {/* DIVIDER 1 */}
                <div className="t-divider"></div>

                {/* 2. RECEIVER SECTION */}
                <div className="t-receiver-section">
                  <span className="t-section-tag">RECEIVER</span>
                  <h3 className="t-receiver-name">{labelData.receiverName}</h3>
                  <div className="t-receiver-address">{labelData.receiverAddr1}</div>
                  {labelData.receiverAddr2 && (
                    <div className="t-receiver-address">{labelData.receiverAddr2}</div>
                  )}
                  <div className="t-receiver-phone">PHONE: {labelData.receiverPhone}</div>
                </div>

                {/* DIVIDER 2 */}
                <div className="t-divider"></div>

                {/* 3. ARTICLE / TRACKING NO. SECTION */}
                <div className="t-tracking-section">
                  <span className="t-tracking-label">ARTICLE / TRACKING NO.</span>
                  <div className="t-tracking-val">{labelData.trackingNo}</div>
                </div>
              </div>
            </div>

            {/* Printer Specifications Guide Card */}
            <div className="thermal-spec-card no-print">
              <div className="spec-item">
                <Info size={14} className="spec-icon" />
                <span><strong>Format:</strong> 6" × 4" (152mm × 102mm) Landscape</span>
              </div>
              <div className="spec-item">
                <Check size={14} className="spec-icon green" />
                <span><strong>Resolution:</strong> 100% Vector PDF (203 / 300 DPI Thermal Heads)</span>
              </div>
              <div className="spec-item">
                <Printer size={14} className="spec-icon" />
                <span><strong>Printers:</strong> TVS, TSC, Rollo, Zebra, Munbyn, India Post Speed Post</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ShippingLabelsPage;
