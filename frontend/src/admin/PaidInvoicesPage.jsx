import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Trash2,
  Edit3,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  X,
  FileText,
  TrendingUp,
  IndianRupee,
  ShieldCheck,
  Check,
  ChevronDown,
  Building,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Package
} from "lucide-react";
import { generateEtosmInvoicePdf, printEtosmInvoicePdf } from "../utils/invoicePdfGenerator";
import AdminLayout from "./AdminLayout";
import { cacheGet, cacheSet } from "../utils/dataCache";
import "./PaidInvoicesPage.css";

// Helper: Convert number to Indian currency words
function numberToWordsINR(num) {
  if (!num || num === 0) return "Zero Rupees Only";
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n) {
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

  const rounded = Math.round(num);
  return `Rupees ${inWords(rounded)} Only`;
}

const PaidInvoicesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // State
  const [invoices, setInvoices] = useState(() => cacheGet("admin_paid_invoices") || []);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalRevenue: 0,
    totalTaxCollected: 0,
    thisMonthRevenue: 0,
    averageValue: 0
  });
  const [loading, setLoading] = useState(() => !(cacheGet("admin_paid_invoices") && cacheGet("admin_paid_invoices").length > 0));

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "this_week", "this_month", "custom"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // "newest", "oldest", "amount_high", "amount_low", "customer_asc"

  // Selected invoice for Review Modal
  const [reviewInvoice, setReviewInvoice] = useState(null);

  // Manage / Edit modal state
  const [editModalInvoice, setEditModalInvoice] = useState(null);
  const [editPaymentStatus, setEditPaymentStatus] = useState("Paid");
  const [editPaymentRef, setEditPaymentRef] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [updatingInvoice, setUpdatingInvoice] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth verification
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
      return;
    }
    fetchPaidInvoices();
  }, [paymentModeFilter, dateFilter, startDate, endDate, sortBy]);

  // Fetch Paid Invoices
  const fetchPaidInvoices = async () => {
    try {
      if (!cacheGet("admin_paid_invoices")) setLoading(true);
      const params = new URLSearchParams();
      if (paymentModeFilter !== "all") params.append("paymentMode", paymentModeFilter);
      if (dateFilter !== "all") params.append("dateFilter", dateFilter);
      if (dateFilter === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }
      if (sortBy) params.append("sort", sortBy);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`${API_BASE_URL}/admin/invoices/paid?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to load paid invoices (${res.status})`);
      }

      const data = await res.json();
      const list = Array.isArray(data.invoices) ? data.invoices : [];
      setInvoices(list);
      cacheSet("admin_paid_invoices", list);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching paid invoices:", err);
      showToast("Failed to load paid invoices data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on Enter or clear
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPaidInvoices();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    fetchPaidInvoices();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setPaymentModeFilter("all");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
    setSortBy("newest");
  };

  // Has any active filter?
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    paymentModeFilter !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "newest";

  // Filtered invoices client-side fallback
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const q = searchTerm.toLowerCase();
    return invoices.filter(
      (inv) =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerEmail && inv.customerEmail.toLowerCase().includes(q)) ||
        (inv.customerPhone && inv.customerPhone.includes(q)) ||
        (inv.customerCompany && inv.customerCompany.toLowerCase().includes(q)) ||
        (inv.items && inv.items.some((i) => i.name && i.name.toLowerCase().includes(q)))
    );
  }, [invoices, searchTerm]);

  // Open Edit/Manage Modal
  const handleOpenEdit = (inv) => {
    setEditModalInvoice(inv);
    setEditPaymentStatus(inv.paymentStatus || "Paid");
    setEditPaymentRef(inv.paymentReference || "");
    setEditNotes(inv.notes || "");
  };

  // Save changes to invoice
  const handleSaveInvoiceEdit = async () => {
    if (!editModalInvoice) return;
    setUpdatingInvoice(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/${editModalInvoice._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: editPaymentStatus,
          paymentReference: editPaymentRef,
          notes: editNotes
        })
      });

      if (res.ok) {
        showToast("Invoice record updated successfully!");
        setEditModalInvoice(null);
        fetchPaidInvoices();
      } else {
        throw new Error("Failed to update invoice");
      }
    } catch (err) {
      console.error("Update error:", err);
      showToast(err.message || "Failed to update record", "error");
    } finally {
      setUpdatingInvoice(false);
    }
  };

  // Delete invoice record
  const handleDeleteInvoice = async (inv) => {
    if (!window.confirm(`Are you sure you want to delete invoice record "${inv.invoiceNumber}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/${inv._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setInvoices((prev) => prev.filter((item) => item._id !== inv._id));
        showToast(`Invoice ${inv.invoiceNumber} deleted from records`);
        if (reviewInvoice && reviewInvoice._id === inv._id) {
          setReviewInvoice(null);
        }
      } else {
        throw new Error("Failed to delete record");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete invoice", "error");
    }
  };

  // Export Filtered Records to CSV Spreadsheet
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      showToast("No records available to export", "error");
      return;
    }

    const headers = [
      "Invoice Number",
      "Date",
      "Customer Name",
      "Phone",
      "Email",
      "Company",
      "GSTIN",
      "Payment Mode",
      "Payment Status",
      "Items Count",
      "Taxable Value (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "IGST (INR)",
      "Total Tax (INR)",
      "Shipping (INR)",
      "Grand Total (INR)"
    ];

    const csvRows = [headers.join(",")];

    filteredInvoices.forEach((inv) => {
      const row = [
        `"${inv.invoiceNumber || ""}"`,
        `"${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : ""}"`,
        `"${(inv.customerName || "").replace(/"/g, '""')}"`,
        `"${inv.customerPhone || ""}"`,
        `"${inv.customerEmail || ""}"`,
        `"${(inv.customerCompany || "").replace(/"/g, '""')}"`,
        `"${inv.customerGstin || ""}"`,
        `"${inv.paymentMode || "UPI"}"`,
        `"${inv.paymentStatus || "Paid"}"`,
        inv.items ? inv.items.length : 1,
        Number(inv.taxableSubtotal || 0).toFixed(2),
        Number(inv.cgstTotal || 0).toFixed(2),
        Number(inv.sgstTotal || 0).toFixed(2),
        Number(inv.igstTotal || 0).toFixed(2),
        Number(inv.totalTax || 0).toFixed(2),
        Number(inv.shippingCharges || 0).toFixed(2),
        Number(inv.grandTotal || 0).toFixed(2)
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ETOSM_Paid_Invoices_Export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredInvoices.length} paid invoices to CSV`);
  };

  // Generate Vector PDF using generateEtosmInvoicePdf
  const handleDownloadPdf = async (inv) => {
    try {
      const doc = await generateEtosmInvoicePdf(inv);
      const cleanNum = (inv.invoiceNumber || "Invoice").replace(/[/\\?%*:|"<>]/g, "-");
      doc.save(`Paid_Invoice_${cleanNum}.pdf`);
      showToast(`Invoice PDF downloaded for ${inv.invoiceNumber}`);
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Failed to generate PDF document", "error");
    }
  };

  return (
    <AdminLayout>
      <div className="pi-container">
        {/* Toast Feedback */}
        {toast && (
          <div className={`pi-toast ${toast.type}`}>
            {toast.type === "error" ? <X size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="pi-header">
          <div className="pi-header-left">
            <span className="pi-module-tag">
              <ShieldCheck size={12} /> Admin Module 3 • Financial Records
            </span>
            <h1>3. Paid Invoices</h1>
            <p>
              View, search, filter, review, and manage all fully settled customer invoices.
              Generate official receipts, download GST Tax Invoice PDFs, and export data for accounting.
            </p>
          </div>

          <div className="pi-header-actions">
            <button
              className="pi-btn pi-btn-secondary"
              onClick={fetchPaidInvoices}
              title="Refresh invoice list"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              className="pi-btn pi-btn-secondary"
              onClick={handleExportCSV}
              title="Export all filtered records to CSV spreadsheet"
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
            <button
              className="pi-btn pi-btn-primary"
              onClick={() => navigate("/admin/create-invoice")}
            >
              <Plus size={15} /> Create Invoice
            </button>
          </div>
        </div>

        {/* KPI Financial Overview Cards */}
        <div className="pi-kpi-grid">
          <div className="pi-kpi-card total-invoices">
            <div className="pi-kpi-icon">
              <FileText size={22} />
            </div>
            <div className="pi-kpi-info">
              <h3>{stats.totalCount}</h3>
              <p>Paid Invoices Count</p>
            </div>
          </div>

          <div className="pi-kpi-card total-revenue">
            <div className="pi-kpi-icon">
              <CheckCircle2 size={22} />
            </div>
            <div className="pi-kpi-info">
              <h3>₹{stats.totalRevenue.toLocaleString("en-IN")}</h3>
              <p>Total Revenue Collected</p>
            </div>
          </div>

          <div className="pi-kpi-card month-revenue">
            <div className="pi-kpi-icon">
              <TrendingUp size={22} />
            </div>
            <div className="pi-kpi-info">
              <h3>₹{stats.thisMonthRevenue.toLocaleString("en-IN")}</h3>
              <p>This Month Collections</p>
            </div>
          </div>

          <div className="pi-kpi-card avg-value">
            <div className="pi-kpi-icon">
              <IndianRupee size={22} />
            </div>
            <div className="pi-kpi-info">
              <h3>₹{stats.averageValue.toLocaleString("en-IN")}</h3>
              <p>Average Invoice Value</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls Card */}
        <div className="pi-card pi-controls-card">
          <form onSubmit={handleSearchSubmit} className="pi-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by Invoice # (e.g. INV-2026), Customer Name, Phone, Email, Company, or Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="pi-search-clear"
                onClick={handleClearSearch}
              >
                <X size={14} />
              </button>
            )}
          </form>

          <div className="pi-filters-group">
            {/* Payment Mode Filter */}
            <select
              className="pi-select"
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
            >
              <option value="all">Payment Mode: All Modes</option>
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="bank">Bank Transfer (NEFT/RTGS)</option>
              <option value="cash">Cash on Delivery</option>
              <option value="razorpay">Razorpay Gateway</option>
              <option value="cheque">Bank Cheque</option>
            </select>

            {/* Date Range Filter */}
            <select
              className="pi-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Date: All Time</option>
              <option value="today">Today</option>
              <option value="this_week">Past 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {/* Custom Date Pickers */}
            {dateFilter === "custom" && (
              <div className="pi-date-range-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pi-date-input"
                  title="Start Date"
                />
                <span className="pi-date-sep">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pi-date-input"
                  title="End Date"
                />
              </div>
            )}

            {/* Sort Options */}
            <select
              className="pi-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="amount_high">Amount: High to Low</option>
              <option value="amount_low">Amount: Low to High</option>
              <option value="customer_asc">Customer: Name (A-Z)</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                className="pi-btn-reset"
                onClick={handleResetFilters}
                title="Reset all active filters"
              >
                <X size={13} /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Counter Bar */}
        <div className="pi-results-meta-bar">
          <span>
            Showing <strong>{filteredInvoices.length}</strong> fully paid invoice records
          </span>
          {filteredInvoices.length > 0 && (
            <span className="pi-meta-sub">
              Total Value:{" "}
              <strong>
                ₹
                {filteredInvoices
                  .reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0)
                  .toLocaleString("en-IN")}
              </strong>
            </span>
          )}
        </div>

        {/* Main Content: Paid Invoices Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <div className="pi-spinner" style={{ margin: "0 auto 12px" }}></div>
            <p>Loading paid invoices and transaction records...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="pi-card pi-empty-card">
            <CheckCircle2 size={48} color="#cbd5e1" style={{ marginBottom: "12px" }} />
            <h3>No Paid Invoices Found</h3>
            <p>
              {hasActiveFilters
                ? "No invoice records matched your search or filter criteria. Try clearing filters."
                : "There are currently no paid invoices recorded in the system."}
            </p>
            {hasActiveFilters ? (
              <button
                className="pi-btn pi-btn-secondary"
                onClick={handleResetFilters}
                style={{ marginTop: "14px" }}
              >
                Clear Search & Filters
              </button>
            ) : (
              <button
                className="pi-btn pi-btn-primary"
                onClick={() => navigate("/admin/create-invoice")}
                style={{ marginTop: "14px" }}
              >
                <Plus size={15} /> Create a New Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="pi-card pi-table-card">
            <div className="pi-table-responsive">
              <table className="pi-table">
                <thead>
                  <tr>
                    <th style={{ width: "135px" }}>Invoice #</th>
                    <th style={{ width: "105px" }}>Payment Date</th>
                    <th style={{ minWidth: "190px" }}>Customer Details</th>
                    <th style={{ minWidth: "170px" }}>Items Summary</th>
                    <th style={{ width: "130px" }}>Payment Mode</th>
                    <th style={{ width: "110px" }}>Taxable (₹)</th>
                    <th style={{ width: "125px" }}>Total Paid (₹)</th>
                    <th style={{ width: "105px" }}>Status</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const grandTotal = Number(inv.grandTotal || 0);
                    const taxable = Number(inv.taxableSubtotal || inv.taxableAmount || 0);
                    const itemsCount = inv.items ? inv.items.length : 1;
                    const firstItem = inv.items && inv.items[0] ? inv.items[0].name : "Standard Item";

                    return (
                      <tr key={inv._id || inv.invoiceNumber}>
                        {/* Invoice Number */}
                        <td>
                          <div
                            className="pi-inv-badge"
                            onClick={() => setReviewInvoice(inv)}
                            title="Click to review complete invoice"
                          >
                            <span>{inv.invoiceNumber}</span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="pi-date-cell">
                          <span>
                            {inv.invoiceDate
                              ? new Date(inv.invoiceDate).toLocaleDateString("en-IN")
                              : new Date(inv.createdAt).toLocaleDateString("en-IN")}
                          </span>
                          <span className="time-sub">
                            {inv.createdAt
                              ? new Date(inv.createdAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : ""}
                          </span>
                        </td>

                        {/* Customer */}
                        <td>
                          <div className="pi-cust-cell">
                            <strong>{inv.customerName || "Customer"}</strong>
                            <div className="pi-cust-sub">
                              {inv.customerPhone && inv.customerPhone !== "N/A" && (
                                <span>📞 {inv.customerPhone}</span>
                              )}
                              {inv.customerCompany && (
                                <span className="company-tag">🏢 {inv.customerCompany}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Items Summary */}
                        <td>
                          <div className="pi-items-cell">
                            <span className="item-title" title={firstItem}>
                              {firstItem}
                            </span>
                            {itemsCount > 1 && (
                              <span className="more-pill">+{itemsCount - 1} more items</span>
                            )}
                          </div>
                        </td>

                        {/* Payment Mode */}
                        <td>
                          <span className="pi-paymode-pill">
                            <CreditCard size={12} />
                            {inv.paymentMode || "UPI"}
                          </span>
                        </td>

                        {/* Taxable Amount */}
                        <td>
                          <span className="pi-taxable-val">
                            ₹{taxable.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Grand Total */}
                        <td>
                          <span className="pi-total-val">
                            ₹{grandTotal.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className="pi-paid-pill">
                            <CheckCircle2 size={12} /> Paid in Full
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div className="pi-actions-row">
                            <button
                              className="pi-action-btn view"
                              onClick={() => setReviewInvoice(inv)}
                              title="Review Invoice Record"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="pi-action-btn pdf"
                              onClick={() => handleDownloadPdf(inv)}
                              title="Download Tax Invoice PDF"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              className="pi-action-btn edit"
                              onClick={() => handleOpenEdit(inv)}
                              title="Manage Record & Notes"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="pi-action-btn delete"
                              onClick={() => handleDeleteInvoice(inv)}
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 1: REVIEW PAID INVOICE DETAIL MODAL
            ========================================================================= */}
        {reviewInvoice && (
          <div className="pi-modal-overlay" onClick={() => setReviewInvoice(null)}>
            <div className="pi-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="pi-modal-header">
                <div className="pi-modal-title">
                  <ShieldCheck size={20} color="#e3000f" />
                  <div>
                    <h3>Invoice {reviewInvoice.invoiceNumber}</h3>
                    <span className="pi-modal-sub">
                      Paid & Verified Record • Issued on{" "}
                      {new Date(reviewInvoice.invoiceDate || reviewInvoice.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="pi-modal-header-actions">
                  <button
                    className="pi-btn pi-btn-secondary"
                    onClick={() => handleDownloadPdf(reviewInvoice)}
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <button
                    className="pi-btn pi-btn-secondary"
                    onClick={() => printEtosmInvoicePdf(reviewInvoice)}
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button
                    className="pi-modal-close"
                    onClick={() => setReviewInvoice(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="pi-modal-body">
                {/* Meta & Customer Details Grid */}
                <div className="pi-review-top-grid">
                  <div className="pi-review-box">
                    <h4>Billed To / Customer Information</h4>
                    <p><strong>Name:</strong> {reviewInvoice.customerName || "N/A"}</p>
                    <p><strong>Phone:</strong> {reviewInvoice.customerPhone || "N/A"}</p>
                    <p><strong>Email:</strong> {reviewInvoice.customerEmail || "N/A"}</p>
                    {reviewInvoice.customerCompany && (
                      <p><strong>Company:</strong> {reviewInvoice.customerCompany}</p>
                    )}
                    {reviewInvoice.customerGstin && (
                      <p><strong>GSTIN:</strong> {reviewInvoice.customerGstin}</p>
                    )}
                    {reviewInvoice.customerAddress && (
                      <p><strong>Address:</strong> {reviewInvoice.customerAddress}</p>
                    )}
                  </div>

                  <div className="pi-review-box">
                    <h4>Payment & Settlement Details</h4>
                    <p><strong>Invoice Number:</strong> {reviewInvoice.invoiceNumber}</p>
                    <p><strong>Payment Mode:</strong> {reviewInvoice.paymentMode || "UPI / Online"}</p>
                    <p>
                      <strong>Payment Status:</strong>{" "}
                      <span className="pi-paid-pill" style={{ display: "inline-flex" }}>
                        ● Paid in Full
                      </span>
                    </p>
                    <p><strong>Place of Supply:</strong> {reviewInvoice.placeOfSupply || "33 - Tamil Nadu"}</p>
                    {reviewInvoice.paymentReference && (
                      <p><strong>UTR / Ref No:</strong> {reviewInvoice.paymentReference}</p>
                    )}
                  </div>
                </div>

                {/* Itemized Table */}
                <h4 style={{ margin: "20px 0 10px 0", color: "#0f172a" }}>Itemized Line Items</h4>
                <div className="pi-table-responsive">
                  <table className="pi-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product Item</th>
                        <th>Qty</th>
                        <th>Rate (₹)</th>
                        <th>Discount (₹)</th>
                        <th>Taxable (₹)</th>
                        <th>GST %</th>
                        <th style={{ textAlign: "right" }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reviewInvoice.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{item.name}</strong>
                            {item.productId && (
                              <span className="pi-prod-id-pill" style={{ marginLeft: "8px" }}>
                                {item.productId}
                              </span>
                            )}
                            {item.description && (
                              <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>
                                {item.description}
                              </span>
                            )}
                          </td>
                          <td>{item.quantity || 1}</td>
                          <td>₹{Number(item.unitPrice || 0).toLocaleString("en-IN")}</td>
                          <td>
                            {Number(item.discountAmount || 0) > 0
                              ? `- ₹${Number(item.discountAmount).toFixed(2)}`
                              : "-"}
                          </td>
                          <td>₹{Number(item.taxableAmount || 0).toLocaleString("en-IN")}</td>
                          <td>{item.gstPercent || 18}%</td>
                          <td style={{ textAlign: "right", fontWeight: "700" }}>
                            ₹{Number(item.totalAmount || 0).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="pi-review-totals-box">
                  <div className="row">
                    <span>Taxable Subtotal:</span>
                    <strong>₹{Number(reviewInvoice.taxableSubtotal || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  {Number(reviewInvoice.totalDiscount || 0) > 0 && (
                    <div className="row discount">
                      <span>Total Discount:</span>
                      <span>- ₹{Number(reviewInvoice.totalDiscount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {reviewInvoice.isInterState ? (
                    <div className="row">
                      <span>IGST (18%):</span>
                      <span>+ ₹{Number(reviewInvoice.igstTotal || reviewInvoice.totalTax || 0).toLocaleString("en-IN")}</span>
                    </div>
                  ) : (
                    <>
                      <div className="row">
                        <span>CGST (9%):</span>
                        <span>+ ₹{Number(reviewInvoice.cgstTotal || (reviewInvoice.totalTax || 0) / 2).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="row">
                        <span>SGST (9%):</span>
                        <span>+ ₹{Number(reviewInvoice.sgstTotal || (reviewInvoice.totalTax || 0) / 2).toLocaleString("en-IN")}</span>
                      </div>
                    </>
                  )}
                  {Number(reviewInvoice.shippingCharges || 0) > 0 && (
                    <div className="row">
                      <span>Shipping / Freight:</span>
                      <span>+ ₹{Number(reviewInvoice.shippingCharges).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="row total">
                    <span>Grand Total Paid:</span>
                    <strong style={{ color: "#e3000f", fontSize: "18px" }}>
                      ₹{Number(reviewInvoice.grandTotal || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="in-words">
                    <strong>Amount in Words:</strong> {numberToWordsINR(reviewInvoice.grandTotal || 0)}
                  </div>
                </div>

                {/* Notes */}
                {reviewInvoice.notes && (
                  <div className="pi-review-notes">
                    <strong>Customer Notes / Terms:</strong>
                    <p>{reviewInvoice.notes}</p>
                  </div>
                )}
              </div>

              <div className="pi-modal-footer">
                <button
                  className="pi-btn pi-btn-secondary"
                  onClick={() => setReviewInvoice(null)}
                >
                  Close
                </button>
                <button
                  className="pi-btn pi-btn-primary"
                  onClick={() => handleDownloadPdf(reviewInvoice)}
                >
                  <Download size={14} /> Download PDF Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: MANAGE & EDIT RECORD MODAL
            ========================================================================= */}
        {editModalInvoice && (
          <div className="pi-modal-overlay" onClick={() => setEditModalInvoice(null)}>
            <div className="pi-modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
              <div className="pi-modal-header">
                <div className="pi-modal-title">
                  <Edit3 size={18} color="#e3000f" />
                  <h3>Manage Record: {editModalInvoice.invoiceNumber}</h3>
                </div>
                <button
                  className="pi-modal-close"
                  onClick={() => setEditModalInvoice(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="pi-modal-body">
                <div className="pi-form-group">
                  <label>Customer Name</label>
                  <input
                    type="text"
                    value={editModalInvoice.customerName}
                    disabled
                    style={{ background: "#f8fafc", color: "#64748b" }}
                  />
                </div>

                <div className="pi-form-group">
                  <label>Payment Status</label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value)}
                    className="pi-select"
                  >
                    <option value="Paid">🟢 Paid in Full</option>
                    <option value="Pending">🟡 Pending Verification</option>
                    <option value="Partially Paid">🟠 Partially Paid</option>
                    <option value="Cancelled">🔴 Cancelled / Refunded</option>
                  </select>
                </div>

                <div className="pi-form-group">
                  <label>Bank Reference / UTR Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR3892018237 or NEFT Ref #12345"
                    value={editPaymentRef}
                    onChange={(e) => setEditPaymentRef(e.target.value)}
                  />
                </div>

                <div className="pi-form-group">
                  <label>Admin Remarks / Internal Notes</label>
                  <textarea
                    rows="3"
                    placeholder="Add settlement notes, verification date, etc..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="pi-modal-footer">
                <button
                  className="pi-btn pi-btn-secondary"
                  onClick={() => setEditModalInvoice(null)}
                >
                  Cancel
                </button>
                <button
                  className="pi-btn pi-btn-primary"
                  onClick={handleSaveInvoiceEdit}
                  disabled={updatingInvoice}
                >
                  {updatingInvoice ? "Saving..." : "Save Record"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PaidInvoicesPage;
