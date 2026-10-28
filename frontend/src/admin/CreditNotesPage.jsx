import API_BASE_URL from "../apiConfig";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Download,
  Printer,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle,
  Building,
  Phone,
  Receipt,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Tag
} from "lucide-react";
import jsPDF from "jspdf";
import AdminLayout from "./AdminLayout";
import "./CreditNotesPage.css";

const CREDIT_REASONS = [
  "Goods Returned",
  "Overbilling / Price Correction",
  "Post-Sale Discount",
  "Order / Invoice Cancellation",
  "Defective / Damaged Component",
  "Warranty Credit",
  "Other"
];

const CreditNotesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // State
  const [creditNotes, setCreditNotes] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalCreditValue: 0,
    appliedValue: 0,
    refundedValue: 0,
    issuedCount: 0,
    appliedCount: 0,
    refundedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Available Invoices & Customers for Auto-fill
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewCN, setPreviewCN] = useState(null);
  const [statusModalCN, setStatusModalCN] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    creditNoteNumber: "",
    creditNoteDate: new Date().toISOString().split("T")[0],
    invoiceId: "",
    invoiceNumber: "",
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    customerAddress: "",
    customerGstin: "",
    placeOfSupply: "Tamil Nadu (33)",
    reason: "Goods Returned",
    items: [
      {
        name: "",
        description: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        gstPercent: 18
      }
    ],
    status: "Issued",
    deductFromInvoiceBalance: true,
    refundMode: "Bank Transfer",
    refundReference: "",
    notes: "Credit note issued subject to standard return policy."
  });
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth check & init
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
    } else {
      fetchCreditNotes();
      fetchInvoicesAndCustomers();
    }
  }, [navigate]);

  // Fetch Credit Notes
  const fetchCreditNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/credit-notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setCreditNotes(Array.isArray(data.creditNotes) ? data.creditNotes : []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Failed to load credit notes:", err);
      showToast("Error loading credit notes", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Invoices & Customers for Quick Selection
  const fetchInvoicesAndCustomers = async () => {
    try {
      const [invRes, custRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/customers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setAvailableInvoices(Array.isArray(invData) ? invData : []);
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        setAvailableCustomers(Array.isArray(custData.customers) ? custData.customers : []);
      }
    } catch (err) {
      console.error("Failed to load invoice/customer catalogs:", err);
    }
  };

  // Fetch Next CN Number
  const fetchNextNumber = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/credit-notes/next-number`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.nextNumber;
      }
    } catch (err) {
      console.error("Error fetching next number:", err);
    }
    const year = new Date().getFullYear();
    return `CN-${year}-${String(creditNotes.length + 1).padStart(4, "0")}`;
  };

  // Open Create Modal
  const handleOpenCreateModal = async () => {
    const nextNum = await fetchNextNumber();
    setFormData({
      creditNoteNumber: nextNum,
      creditNoteDate: new Date().toISOString().split("T")[0],
      invoiceId: "",
      invoiceNumber: "",
      customerId: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerCompany: "",
      customerAddress: "",
      customerGstin: "",
      placeOfSupply: "Tamil Nadu (33)",
      reason: "Goods Returned",
      items: [
        {
          name: "",
          description: "",
          sku: "",
          quantity: 1,
          unitPrice: 0,
          gstPercent: 18
        }
      ],
      status: "Issued",
      deductFromInvoiceBalance: true,
      refundMode: "Bank Transfer",
      refundReference: "",
      notes: "Credit note issued subject to standard return policy."
    });
    setCreateModalOpen(true);
  };

  // Select Linked Invoice
  const handleSelectInvoice = (invId) => {
    const inv = availableInvoices.find((i) => i._id === invId);
    if (!inv) return;

    setFormData((prev) => ({
      ...prev,
      invoiceId: inv._id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId || "",
      customerName: inv.customerName || "",
      customerEmail: inv.customerEmail || "",
      customerPhone: inv.customerPhone || "",
      customerCompany: inv.customerCompany || "",
      customerAddress: inv.customerAddress || "",
      customerGstin: inv.customerGstin || "",
      placeOfSupply: inv.placeOfSupply || "Tamil Nadu (33)",
      items: Array.isArray(inv.items) && inv.items.length > 0
        ? inv.items.map((i) => ({
            name: i.name,
            description: i.description || "",
            sku: i.sku || "",
            quantity: 1,
            unitPrice: i.unitPrice || 0,
            gstPercent: i.gstPercent || 18
          }))
        : prev.items
    }));
    showToast(`Loaded invoice details for #${inv.invoiceNumber}`);
  };

  // Select Saved Customer
  const handleSelectCustomer = (cust) => {
    setFormData((prev) => ({
      ...prev,
      customerId: cust._id || "",
      customerName: cust.name || "",
      customerEmail: cust.email || "",
      customerPhone: cust.phone || "",
      customerCompany: cust.company || "",
      customerAddress: cust.address || "",
      customerGstin: cust.gstin || ""
    }));
  };

  // Line Item Handlers
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          name: "",
          description: "",
          sku: "",
          quantity: 1,
          unitPrice: 0,
          gstPercent: 18
        }
      ]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) {
      showToast("Credit note must have at least one line item", "error");
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  // Calculated Totals
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    const computedItems = formData.items.map((i) => {
      const qty = Number(i.quantity) || 1;
      const unit = Number(i.unitPrice) || 0;
      const taxable = qty * unit;
      const rate = Number(i.gstPercent) || 0;
      const tax = (taxable * rate) / 100;
      const total = taxable + tax;

      subtotal += taxable;
      totalTax += tax;

      return {
        ...i,
        taxableAmount: taxable,
        taxAmount: tax,
        totalAmount: total
      };
    });

    const isInterState = !(formData.placeOfSupply || "").toLowerCase().includes("tamil nadu");
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = totalTax;
    } else {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    }

    const totalCreditAmount = subtotal + totalTax;

    return {
      items: computedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      cgstTotal: Math.round(cgst * 100) / 100,
      sgstTotal: Math.round(sgst * 100) / 100,
      igstTotal: Math.round(igst * 100) / 100,
      totalCreditAmount: Math.round(totalCreditAmount * 100) / 100
    };
  }, [formData.items, formData.placeOfSupply]);

  // Submit Credit Note
  const handleSaveCreditNote = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      showToast("Please enter customer name", "error");
      return;
    }
    if (formData.items.some((i) => !i.name.trim() || Number(i.unitPrice) <= 0)) {
      showToast("Please provide valid product name and price for all items", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        items: calculations.items,
        subtotal: calculations.subtotal,
        totalTax: calculations.totalTax,
        cgstTotal: calculations.cgstTotal,
        sgstTotal: calculations.sgstTotal,
        igstTotal: calculations.igstTotal,
        totalCreditAmount: calculations.totalCreditAmount
      };

      const res = await fetch(`${API_BASE_URL}/admin/credit-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create credit note");

      showToast(`Credit Note #${payload.creditNoteNumber} issued successfully!`);
      setCreateModalOpen(false);
      fetchCreditNotes();
    } catch (err) {
      console.error("Save CN error:", err);
      showToast(err.message || "Failed to save credit note", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (cn, newStatus, refundInfo = {}) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/credit-notes/${cn._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, ...refundInfo })
      });

      if (res.ok) {
        showToast(`Credit note #${cn.creditNoteNumber} updated to "${newStatus}"`);
        setStatusModalCN(null);
        fetchCreditNotes();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  // Delete Credit Note
  const handleDeleteCreditNote = async (cn) => {
    if (!window.confirm(`Are you sure you want to delete Credit Note #${cn.creditNoteNumber}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/credit-notes/${cn._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showToast(`Credit Note #${cn.creditNoteNumber} deleted`);
        fetchCreditNotes();
        if (previewCN && previewCN._id === cn._id) setPreviewCN(null);
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      showToast(err.message || "Failed to delete credit note", "error");
    }
  };

  // Generate Vector PDF
  const handleDownloadPDF = (cn) => {
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
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 88, 38, "F");
    doc.rect(14, y, 88, 38);

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
    if (cn.customerGstin) {
      doc.text(`GSTIN: ${cn.customerGstin}`, 18, custY);
    }

    // Right: Credit Note Meta Box
    doc.setFillColor(248, 250, 252);
    doc.rect(108, y, 88, 38, "F");
    doc.rect(108, y, 88, 38);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("CREDIT NOTE DETAILS:", 112, y + 6);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
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
    doc.text("Place of Supply:", 112, y + 32);
    doc.text(String(cn.placeOfSupply || "Tamil Nadu (33)"), 146, y + 32);

    y += 46;

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
      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
      doc.rect(14, y, 182, 8, "F");
      doc.rect(14, y, 182, 8);

      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(String(idx + 1), 17, y + 5.5);
      doc.setFont("Helvetica", "bold");
      doc.text(String(item.name || "").substring(0, 36), 26, y + 5.5);

      doc.setFont("Helvetica", "normal");
      doc.text(String(item.quantity || 1), 108, y + 5.5);
      doc.text(Number(item.unitPrice || 0).toFixed(2), 125, y + 5.5);
      doc.text(`${item.gstPercent || 18}%`, 155, y + 5.5);
      doc.setFont("Helvetica", "bold");
      doc.text(Number(item.totalAmount || 0).toFixed(2), 175, y + 5.5);

      y += 8;
    });

    // Totals Box
    y += 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(118, y, 78, 28, "F");
    doc.rect(118, y, 78, 28);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Taxable Subtotal:", 122, y + 6);
    doc.text(`INR ${Number(cn.subtotal || 0).toFixed(2)}`, 164, y + 6);

    doc.text("GST Tax Total:", 122, y + 12);
    doc.text(`INR ${Number(cn.totalTax || 0).toFixed(2)}`, 164, y + 12);

    doc.setDrawColor(226, 232, 240);
    doc.line(122, y + 16, 192, y + 16);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(227, 0, 15);
    doc.text("Total Credit:", 122, y + 23);
    doc.text(`INR ${Number(cn.totalCreditAmount || 0).toFixed(2)}`, 164, y + 23);

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

    doc.save(`EToSM_CreditNote_${cn.creditNoteNumber}.pdf`);
    showToast(`Downloaded Credit Note #${cn.creditNoteNumber} PDF`);
  };

  // Filtered List
  const filteredCreditNotes = useMemo(() => {
    return creditNotes.filter((cn) => {
      if (statusFilter !== "all" && cn.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      return (
        (cn.creditNoteNumber || "").toLowerCase().includes(q) ||
        (cn.invoiceNumber || "").toLowerCase().includes(q) ||
        (cn.customerName || "").toLowerCase().includes(q) ||
        (cn.customerPhone || "").includes(q) ||
        (cn.customerCompany || "").toLowerCase().includes(q) ||
        (cn.reason || "").toLowerCase().includes(q)
      );
    });
  }, [creditNotes, statusFilter, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredCreditNotes.length === 0) {
      showToast("No credit notes to export", "error");
      return;
    }

    const headers = [
      "Credit Note #",
      "Date",
      "Customer Name",
      "Company",
      "Phone",
      "Original Invoice #",
      "Reason",
      "Taxable Subtotal (INR)",
      "Total GST (INR)",
      "Total Credit Amount (INR)",
      "Status",
      "Refund Mode",
      "Refund Reference"
    ];

    const rows = [headers.join(",")];
    filteredCreditNotes.forEach((cn) => {
      rows.push([
        `"${cn.creditNoteNumber}"`,
        `"${cn.creditNoteDate ? new Date(cn.creditNoteDate).toLocaleDateString("en-IN") : ""}"`,
        `"${(cn.customerName || "").replace(/"/g, '""')}"`,
        `"${(cn.customerCompany || "").replace(/"/g, '""')}"`,
        `"${cn.customerPhone || ""}"`,
        `"${cn.invoiceNumber || ""}"`,
        `"${cn.reason || ""}"`,
        Number(cn.subtotal || 0).toFixed(2),
        Number(cn.totalTax || 0).toFixed(2),
        Number(cn.totalCreditAmount || 0).toFixed(2),
        `"${cn.status || "Issued"}"`,
        `"${cn.refundMode || ""}"`,
        `"${cn.refundReference || ""}"`
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETOSM_CreditNotes_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredCreditNotes.length} credit notes to CSV`);
  };

  return (
    <AdminLayout>
      <div className="credit-notes-page">
        {/* Toast */}
        {toast && (
          <div className={`cn-toast ${toast.type}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="cn-page-header">
          <div className="header-title-box">
            <span className="cn-eyebrow">ACCOUNTING ADJUSTMENTS & RETURNS</span>
            <h1>8. Credit Notes</h1>
            <p>
              Issue, manage, and track credit notes for goods returned, billing corrections, discounts, and order cancellations. Deduct directly from invoice balances or issue customer refunds.
            </p>
          </div>

          <div className="header-actions-box">
            <button className="cn-btn primary" onClick={handleOpenCreateModal}>
              <Plus size={16} />
              <span>Issue Credit Note</span>
            </button>
            <button className="cn-btn secondary" onClick={handleExportCSV}>
              <FileSpreadsheet size={16} />
              <span>Export CSV</span>
            </button>
            <button className="cn-btn icon-only" onClick={fetchCreditNotes} title="Refresh List">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* 4 KPI CARDS */}
        <div className="cn-kpis-grid">
          <div className="cn-kpi-card">
            <div className="kpi-icon-wrap primary">
              <FileText size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">TOTAL CREDIT NOTES</span>
              <h2 className="kpi-val">{stats.totalCount || 0}</h2>
              <span className="kpi-sub">{stats.issuedCount || 0} open / active notes</span>
            </div>
          </div>

          <div className="cn-kpi-card highlight">
            <div className="kpi-icon-wrap danger">
              <DollarSign size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">TOTAL CREDIT VALUE</span>
              <h2 className="kpi-val danger">₹{Number(stats.totalCreditValue || 0).toLocaleString("en-IN")}</h2>
              <span className="kpi-sub">Total credited amount issued</span>
            </div>
          </div>

          <div className="cn-kpi-card">
            <div className="kpi-icon-wrap success">
              <Receipt size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">APPLIED TO INVOICES</span>
              <h2 className="kpi-val text-success">₹{Number(stats.appliedValue || 0).toLocaleString("en-IN")}</h2>
              <span className="kpi-sub">{stats.appliedCount || 0} invoice balance offsets</span>
            </div>
          </div>

          <div className="cn-kpi-card">
            <div className="kpi-icon-wrap info">
              <RotateCcw size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">DIRECT REFUNDED</span>
              <h2 className="kpi-val text-info">₹{Number(stats.refundedValue || 0).toLocaleString("en-IN")}</h2>
              <span className="kpi-sub">{stats.refundedCount || 0} refunded payments</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="cn-filter-card">
          <div className="filter-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search credit note #, invoice #, customer name, company, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-btn" onClick={() => setSearchTerm("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-status-tabs">
            <button
              className={`status-tab ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({creditNotes.length})
            </button>
            <button
              className={`status-tab ${statusFilter === "Issued" ? "active" : ""}`}
              onClick={() => setStatusFilter("Issued")}
            >
              Issued ({stats.issuedCount || 0})
            </button>
            <button
              className={`status-tab ${statusFilter === "Applied to Invoice" ? "active" : ""}`}
              onClick={() => setStatusFilter("Applied to Invoice")}
            >
              Applied to Invoice ({stats.appliedCount || 0})
            </button>
            <button
              className={`status-tab ${statusFilter === "Refunded" ? "active" : ""}`}
              onClick={() => setStatusFilter("Refunded")}
            >
              Refunded ({stats.refundedCount || 0})
            </button>
          </div>
        </div>

        {/* Credit Notes Table */}
        <div className="cn-table-container">
          {loading ? (
            <div className="cn-loading-box">
              <div className="cn-spinner"></div>
              <p>Loading credit notes records...</p>
            </div>
          ) : filteredCreditNotes.length === 0 ? (
            <div className="cn-empty-box">
              <FileText size={48} color="#94a3b8" />
              <h3>No Credit Notes Found</h3>
              <p>
                {searchTerm || statusFilter !== "all"
                  ? "No credit notes matched your search criteria."
                  : "Issue a new credit note for returned products, price adjustments, or refunds."}
              </p>
              <button className="cn-btn primary" onClick={handleOpenCreateModal}>
                <Plus size={16} />
                <span>Issue First Credit Note</span>
              </button>
            </div>
          ) : (
            <div className="cn-table-scroll">
              <table className="cn-table">
                <thead>
                  <tr>
                    <th>CREDIT NOTE # & DATE</th>
                    <th>CUSTOMER & ENTITY</th>
                    <th>REASON</th>
                    <th>LINKED INVOICE</th>
                    <th style={{ textAlign: "right" }}>TAX</th>
                    <th style={{ textAlign: "right" }}>CREDIT AMOUNT</th>
                    <th style={{ textAlign: "center" }}>STATUS</th>
                    <th style={{ textAlign: "center" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreditNotes.map((cn) => (
                    <tr key={cn._id}>
                      <td>
                        <strong className="cn-number-bold">{cn.creditNoteNumber}</strong>
                        <span className="cn-date-sub">
                          {cn.creditNoteDate ? new Date(cn.creditNoteDate).toLocaleDateString("en-IN") : "N/A"}
                        </span>
                      </td>

                      <td>
                        <div className="cust-block">
                          <strong>{cn.customerName}</strong>
                          {cn.customerCompany && (
                            <span className="cust-company"><Building size={11} /> {cn.customerCompany}</span>
                          )}
                          {cn.customerPhone && (
                            <span className="cust-phone"><Phone size={11} /> {cn.customerPhone}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="reason-pill">{cn.reason || "Goods Returned"}</span>
                      </td>

                      <td>
                        {cn.invoiceNumber ? (
                          <span className="linked-inv-badge">#{cn.invoiceNumber}</span>
                        ) : (
                          <span className="text-muted">Standalone</span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <span className="tax-val">₹{Number(cn.totalTax || 0).toLocaleString("en-IN")}</span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <strong className="credit-amt-large">
                          ₹{Number(cn.totalCreditAmount || 0).toLocaleString("en-IN")}
                        </strong>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span className={`cn-status-badge ${cn.status?.toLowerCase().replace(/[^a-z]/g, "")}`}>
                          {cn.status || "Issued"}
                        </span>
                      </td>

                      <td>
                        <div className="table-actions-row">
                          <button
                            className="action-icon view"
                            onClick={() => setPreviewCN(cn)}
                            title="Preview Credit Note"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="action-icon print"
                            onClick={() => handleDownloadPDF(cn)}
                            title="Download Official A4 PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            className="action-icon status"
                            onClick={() => setStatusModalCN(cn)}
                            title="Change Status (Applied / Refunded)"
                          >
                            <Tag size={15} />
                          </button>
                          <button
                            className="action-icon delete"
                            onClick={() => handleDeleteCreditNote(cn)}
                            title="Delete Credit Note"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: ISSUE CREDIT NOTE MODAL */}
        {createModalOpen && (
          <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
            <div className="cn-form-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">NEW CREDIT ADJUSTMENT</span>
                  <h2>Issue Credit Note</h2>
                  <p className="modal-subtitle">
                    Credit notes can be linked to an existing invoice to offset balances or issued standalone for returns.
                  </p>
                </div>
                <button className="modal-close" onClick={() => setCreateModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCreditNote} className="cn-form-body">
                {/* Invoice Auto-Fill Selector */}
                <div className="quick-import-card">
                  <div className="import-row">
                    <label>⚡ Quick Link to Existing Invoice (Auto-Fills Client & Items):</label>
                    <select
                      value={formData.invoiceId}
                      onChange={(e) => handleSelectInvoice(e.target.value)}
                    >
                      <option value="">-- Choose an Invoice to credit against --</option>
                      {availableInvoices.map((inv) => (
                        <option key={inv._id} value={inv._id}>
                          #{inv.invoiceNumber} - {inv.customerName} (₹{Number(inv.grandTotal).toLocaleString("en-IN")})
                          {Number(inv.balanceAmount) > 0 ? ` [Balance Due: ₹${inv.balanceAmount}]` : " [Paid]"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="cn-form-group">
                    <label>Credit Note Number *</label>
                    <input
                      type="text"
                      value={formData.creditNoteNumber}
                      onChange={(e) => setFormData({ ...formData, creditNoteNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="cn-form-group">
                    <label>Credit Note Date *</label>
                    <input
                      type="date"
                      value={formData.creditNoteDate}
                      onChange={(e) => setFormData({ ...formData, creditNoteDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="cn-form-group">
                    <label>Reason for Credit Note *</label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    >
                      {CREDIT_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="cn-form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Anandha Kumar"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="cn-form-group">
                    <label>Mobile Number (Phone)</label>
                    <input
                      type="tel"
                      placeholder="+91 88070 80216"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    />
                  </div>

                  <div className="cn-form-group">
                    <label>Company / Entity Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Power Systems Ltd"
                      value={formData.customerCompany}
                      onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="cn-form-group">
                    <label>Full Billing / Return Address</label>
                    <input
                      type="text"
                      placeholder="e.g. 2/167, Merkukadu, Ramapuram, Tiruchengodu"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    />
                  </div>

                  <div className="cn-form-group">
                    <label>Customer GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="33AAAAA0000A1Z5"
                      value={formData.customerGstin}
                      onChange={(e) => setFormData({ ...formData, customerGstin: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Items Builder */}
                <div className="cn-items-section">
                  <div className="items-header">
                    <h4>Credited Products & Line Items</h4>
                    <button type="button" className="cn-btn secondary small" onClick={handleAddItem}>
                      <Plus size={14} /> <span>Add Line Item</span>
                    </button>
                  </div>

                  <table className="cn-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40%" }}>PRODUCT / RETURN ITEM NAME</th>
                        <th style={{ width: "12%" }}>QTY</th>
                        <th style={{ width: "18%" }}>UNIT PRICE (₹)</th>
                        <th style={{ width: "14%" }}>GST %</th>
                        <th style={{ width: "16%", textAlign: "right" }}>CREDIT TOTAL (₹)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, idx) => {
                        const rowTotal =
                          (Number(item.quantity) || 1) *
                          (Number(item.unitPrice) || 0) *
                          (1 + (Number(item.gstPercent) || 0) / 100);

                        return (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                className="item-inp bold"
                                placeholder="Product or component name *"
                                value={item.name}
                                onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="item-inp center"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value)))}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="item-inp right"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                              />
                            </td>
                            <td>
                              <select
                                className="item-inp center"
                                value={item.gstPercent}
                                onChange={(e) => handleItemChange(idx, "gstPercent", Number(e.target.value))}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong>₹{rowTotal.toFixed(2)}</strong>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="row-del-btn"
                                onClick={() => handleRemoveItem(idx)}
                                title="Remove row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Financial Summary */}
                <div className="cn-summary-row">
                  <div className="summary-left">
                    {formData.invoiceId && (
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.deductFromInvoiceBalance}
                          onChange={(e) => setFormData({ ...formData, deductFromInvoiceBalance: e.target.checked })}
                        />
                        <span>Automatically deduct this credit note amount from invoice #{formData.invoiceNumber} balance</span>
                      </label>
                    )}

                    <div className="cn-form-group mt-12">
                      <label>Internal Audit Notes & Return Terms</label>
                      <textarea
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Remarks regarding return condition or refund reference..."
                      />
                    </div>
                  </div>

                  <div className="summary-right">
                    <div className="sum-line">
                      <span>Taxable Subtotal:</span>
                      <span>₹{calculations.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="sum-line">
                      <span>Total GST Tax:</span>
                      <span>₹{calculations.totalTax.toFixed(2)}</span>
                    </div>
                    <div className="sum-line total">
                      <span>Grand Total Credit:</span>
                      <strong className="grand-credit-val">₹{calculations.totalCreditAmount.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <div className="modal-actions-bar">
                  <button type="button" className="cn-btn secondary" onClick={() => setCreateModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="cn-btn primary" disabled={submitting}>
                    {submitting ? "Issuing Credit Note..." : `Issue Credit Note (₹${calculations.totalCreditAmount.toFixed(2)})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: PREVIEW CREDIT NOTE */}
        {previewCN && (
          <div className="modal-backdrop" onClick={() => setPreviewCN(null)}>
            <div className="cn-preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">OFFICIAL CREDIT DOCUMENT</span>
                  <h2>Credit Note #{previewCN.creditNoteNumber}</h2>
                  <p className="modal-subtitle">
                    Issued on {previewCN.creditNoteDate ? new Date(previewCN.creditNoteDate).toLocaleDateString("en-IN") : "N/A"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="cn-btn primary small" onClick={() => handleDownloadPDF(previewCN)}>
                    <Download size={14} /> <span>Download PDF</span>
                  </button>
                  <button className="modal-close" onClick={() => setPreviewCN(null)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="preview-body">
                <div className="preview-top-grid">
                  <div className="p-box">
                    <span className="p-label">CREDIT ISSUED TO:</span>
                    <strong className="p-name">{previewCN.customerName}</strong>
                    {previewCN.customerCompany && <div>{previewCN.customerCompany}</div>}
                    {previewCN.customerPhone && <div>Phone: {previewCN.customerPhone}</div>}
                    {previewCN.customerAddress && <div>Address: {previewCN.customerAddress}</div>}
                    {previewCN.customerGstin && <div>GSTIN: {previewCN.customerGstin}</div>}
                  </div>

                  <div className="p-box">
                    <span className="p-label">DOCUMENT DETAILS:</span>
                    <div>Credit Note #: <strong>{previewCN.creditNoteNumber}</strong></div>
                    <div>Original Invoice #: <strong>{previewCN.invoiceNumber || "Standalone"}</strong></div>
                    <div>Reason: <span className="reason-pill">{previewCN.reason}</span></div>
                    <div>Status: <span className="status-pill-small">{previewCN.status}</span></div>
                    {previewCN.refundMode && <div>Refund Method: {previewCN.refundMode}</div>}
                  </div>
                </div>

                <table className="preview-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item Description</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>GST</th>
                      <th style={{ textAlign: "right" }}>Total Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewCN.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.quantity}</td>
                        <td>₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td>{item.gstPercent}%</td>
                        <td style={{ textAlign: "right" }}>₹{Number(item.totalAmount || (item.quantity * item.unitPrice)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="preview-totals-box">
                  <div>Taxable Subtotal: <strong>₹{Number(previewCN.subtotal || 0).toFixed(2)}</strong></div>
                  <div>GST Tax: <strong>₹{Number(previewCN.totalTax || 0).toFixed(2)}</strong></div>
                  <div className="grand-credit-line">
                    Total Credit Amount: <span>₹{Number(previewCN.totalCreditAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: STATUS UPDATE MODAL */}
        {statusModalCN && (
          <div className="modal-backdrop" onClick={() => setStatusModalCN(null)}>
            <div className="cn-status-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Update Status: #{statusModalCN.creditNoteNumber}</h3>
                <button className="modal-close" onClick={() => setStatusModalCN(null)}><X size={18} /></button>
              </div>
              <div className="status-modal-content">
                <p>Choose the target status for this credit note:</p>
                <div className="status-options-list">
                  <button
                    className="status-choice-btn"
                    onClick={() => handleUpdateStatus(statusModalCN, "Applied to Invoice")}
                  >
                    <CheckCircle2 size={16} color="#16a34a" />
                    <div>
                      <strong>Mark as Applied to Invoice</strong>
                      <small>Credit applied to reduce outstanding invoice balance</small>
                    </div>
                  </button>

                  <button
                    className="status-choice-btn"
                    onClick={() => handleUpdateStatus(statusModalCN, "Refunded", { refundMode: "Bank Transfer", refundReference: "Bank Refund Settled" })}
                  >
                    <RotateCcw size={16} color="#2563eb" />
                    <div>
                      <strong>Mark as Refunded to Customer</strong>
                      <small>Money refunded via Bank Transfer / UPI</small>
                    </div>
                  </button>

                  <button
                    className="status-choice-btn"
                    onClick={() => handleUpdateStatus(statusModalCN, "Issued")}
                  >
                    <Clock size={16} color="#ea580c" />
                    <div>
                      <strong>Keep Open as Issued</strong>
                      <small>Available for future invoice deductions</small>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CreditNotesPage;
