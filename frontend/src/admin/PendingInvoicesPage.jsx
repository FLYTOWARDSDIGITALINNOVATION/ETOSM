import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  X,
  FileText,
  IndianRupee,
  CheckCircle2,
  Check,
  ChevronDown,
  Building,
  Phone,
  Mail,
  Send,
  ExternalLink,
  MessageCircle,
  Receipt,
  ArrowRight,
  TrendingUp,
  Percent
} from "lucide-react";
import { jsPDF } from "jspdf";
import AdminLayout from "./AdminLayout";
import "./PendingInvoicesPage.css";

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

const PendingInvoicesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // State
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalPendingCount: 0,
    unpaidCount: 0,
    partiallyPaidCount: 0,
    overdueCount: 0,
    totalInvoiceAmount: 0,
    totalAmountPaid: 0,
    totalOutstandingBalance: 0,
    totalOverdueAmount: 0
  });
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "Pending", "Partially Paid", "overdue"
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "this_week", "this_month", "overdue", "custom"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("dueDate_asc"); // "dueDate_asc", "balance_high", "balance_low", "amount_high", "newest", "oldest", "customer_asc"

  // Selected invoice for Review Modal
  const [reviewInvoice, setReviewInvoice] = useState(null);

  // Manage / Record Payment Modal
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

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
    fetchPendingInvoices();
  }, [statusFilter, dateFilter, startDate, endDate, sortBy]);

  // Fetch Pending Invoices
  const fetchPendingInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter !== "all") params.append("dateFilter", dateFilter);
      if (dateFilter === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }
      if (sortBy) params.append("sort", sortBy);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`${API_BASE_URL}/admin/invoices/pending?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to load pending invoices (${res.status})`);
      }

      const data = await res.json();
      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching pending invoices:", err);
      showToast("Failed to load pending invoices data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPendingInvoices();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    fetchPendingInvoices();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    setStartDate("");
    setEndDate("");
    setSortBy("dueDate_asc");
  };

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

  // Open Record Payment Modal
  const handleOpenPaymentModal = (inv) => {
    setPaymentModalInvoice(inv);
    // Pre-fill paymentAmount with full outstanding balance
    setPaymentAmount(inv.balanceAmount ? String(inv.balanceAmount) : String(inv.grandTotal || 0));
    setPaymentMode(inv.paymentMode || "Bank Transfer");
    setPaymentRef("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
  };

  // Submit Payment Record
  const handleRecordPayment = async (actionType = "record_payment", targetStatus = null) => {
    if (!paymentModalInvoice) return;
    setRecordingPayment(true);

    try {
      const payload = {
        action: actionType,
        targetStatus: targetStatus,
        amount: Number(paymentAmount) || 0,
        paymentMode: paymentMode,
        reference: paymentRef,
        paymentDate: paymentDate,
        notes: paymentNotes
      };

      const res = await fetch(`${API_BASE_URL}/admin/invoices/${paymentModalInvoice._id}/record-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to record payment");
      }

      if (actionType === "mark_paid" || (Number(paymentAmount) >= paymentModalInvoice.balanceAmount && actionType === "record_payment")) {
        showToast(`Invoice ${paymentModalInvoice.invoiceNumber} is now marked as Paid! Moved to Paid Invoices.`);
      } else {
        showToast(`Payment of ₹${Number(paymentAmount).toLocaleString("en-IN")} recorded successfully!`);
      }

      setPaymentModalInvoice(null);
      fetchPendingInvoices();
    } catch (err) {
      console.error("Payment error:", err);
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setRecordingPayment(false);
    }
  };

  // 1-Click Quick Mark as Paid
  const handleQuickMarkPaid = async (inv) => {
    if (!window.confirm(`Mark invoice "${inv.invoiceNumber}" for ${inv.customerName} as Fully Paid? Outstanding balance: ₹${(inv.balanceAmount || inv.grandTotal).toLocaleString("en-IN")}`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/${inv._id}/record-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "mark_paid",
          paymentMode: inv.paymentMode || "Bank Transfer",
          reference: "Quick Settle by Admin",
          notes: "Marked as Paid in full directly from Pending Invoices."
        })
      });

      if (res.ok) {
        showToast(`Invoice ${inv.invoiceNumber} marked as Fully Paid!`, "success");
        fetchPendingInvoices();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error("Quick mark paid error:", err);
      showToast(err.message || "Failed to update invoice", "error");
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
        showToast(`Invoice ${inv.invoiceNumber} deleted successfully`);
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
      "Invoice Date",
      "Due Date",
      "Overdue Status",
      "Customer Name",
      "Phone",
      "Email",
      "Company",
      "Payment Mode",
      "Payment Status",
      "Total Invoiced (INR)",
      "Amount Paid (INR)",
      "Outstanding Balance (INR)"
    ];

    const csvRows = [headers.join(",")];

    filteredInvoices.forEach((inv) => {
      const isOverdue = inv.isOverdue ? `Overdue by ${inv.daysOverdue} days` : "On Time";
      const row = [
        `"${inv.invoiceNumber || ""}"`,
        `"${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : ""}"`,
        `"${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "N/A"}"`,
        `"${isOverdue}"`,
        `"${(inv.customerName || "").replace(/"/g, '""')}"`,
        `"${inv.customerPhone || ""}"`,
        `"${inv.customerEmail || ""}"`,
        `"${(inv.customerCompany || "").replace(/"/g, '""')}"`,
        `"${inv.paymentMode || "Bank Transfer"}"`,
        `"${inv.paymentStatus || "Pending"}"`,
        Number(inv.grandTotal || 0).toFixed(2),
        Number(inv.amountPaid || 0).toFixed(2),
        Number(inv.balanceAmount || 0).toFixed(2)
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
      `ETOSM_Pending_Invoices_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredInvoices.length} pending invoices to CSV`);
  };

  // Generate Vector PDF using jsPDF
  const handleDownloadPdf = (inv) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const primaryRed = [227, 0, 15]; // ETOSM Red
      const slateDark = [15, 23, 42]; // Slate 900
      const borderGray = [226, 232, 240];

      let y = 14;

      // Top Header Banner
      doc.setFillColor(...slateDark);
      doc.rect(14, y, 182, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(15);
      doc.text("ETOSM TECHNOLOGY", 20, y + 9);

      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "normal");
      doc.text("Lithium Battery Packs • Custom BMS • EV Electronics • Power Solutions", 20, y + 15);
      doc.text("Office: Namakkal, Tamil Nadu-637202 | Phone: +91 88070 80216 | Email: support@etosmtechnology.in", 20, y + 20);

      // Title Ribbon: PENDING / PARTIALLY PAID INVOICE
      doc.setFillColor(...primaryRed);
      doc.rect(14, y + 24, 182, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      const ribbonText = inv.paymentStatus === "Partially Paid"
        ? "TAX INVOICE (PARTIALLY PAID)"
        : "TAX INVOICE (PAYMENT PENDING)";
      doc.text(ribbonText, 20, y + 29);

      y += 37;

      // Meta Info Grid (Customer & Invoice)
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);
      doc.rect(14, y, 91, 38);
      doc.rect(105, y, 91, 38);

      // Customer Details (Left Box)
      doc.setTextColor(...slateDark);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("BILLED TO / CUSTOMER DETAILS:", 18, y + 6);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text(String(inv.customerName || "Customer"), 18, y + 12);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      let custY = y + 17;
      if (inv.customerCompany) {
        doc.text(`Company: ${inv.customerCompany}`, 18, custY);
        custY += 4.5;
      }
      if (inv.customerPhone) {
        doc.text(`Phone: ${inv.customerPhone}`, 18, custY);
        custY += 4.5;
      }
      if (inv.customerEmail) {
        doc.text(`Email: ${inv.customerEmail}`, 18, custY);
        custY += 4.5;
      }
      if (inv.customerGstin) {
        doc.text(`GSTIN: ${inv.customerGstin}`, 18, custY);
      }

      // Invoice Details (Right Box)
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("INVOICE & PAYMENT DETAILS:", 109, y + 6);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Invoice No:`, 109, y + 12);
      doc.setFont("Helvetica", "bold");
      doc.text(String(inv.invoiceNumber || "INV-0000"), 140, y + 12);

      doc.setFont("Helvetica", "normal");
      doc.text(`Invoice Date:`, 109, y + 17);
      doc.text(inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "N/A", 140, y + 17);

      doc.text(`Due Date:`, 109, y + 22);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(inv.isOverdue ? 227 : 15, inv.isOverdue ? 0 : 23, inv.isOverdue ? 15 : 42);
      doc.text(inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "Immediate", 140, y + 22);

      doc.setTextColor(...slateDark);
      doc.setFont("Helvetica", "normal");
      doc.text(`Payment Mode:`, 109, y + 27);
      doc.text(String(inv.paymentMode || "Bank Transfer"), 140, y + 27);

      doc.text(`Payment Status:`, 109, y + 32);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(227, 0, 15);
      doc.text(String(inv.paymentStatus || "Pending").toUpperCase(), 140, y + 32);

      y += 44;

      // Itemized Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, "F");
      doc.setDrawColor(...borderGray);
      doc.rect(14, y, 182, 7);

      doc.setTextColor(...slateDark);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text("#", 17, y + 5);
      doc.text("Item Description", 24, y + 5);
      doc.text("Qty", 108, y + 5);
      doc.text("Rate (INR)", 122, y + 5);
      doc.text("GST", 148, y + 5);
      doc.text("Amount (INR)", 170, y + 5);

      y += 7;

      // Table Rows
      const items = Array.isArray(inv.items) && inv.items.length > 0
        ? inv.items
        : [{ name: "Electronic Components & Power Assembly", quantity: 1, unitPrice: inv.grandTotal, gstPercent: 18, totalAmount: inv.grandTotal }];

      items.forEach((item, idx) => {
        if (y > 240) {
          doc.addPage();
          y = 15;
        }

        doc.setFillColor(idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 251);
        doc.rect(14, y, 182, 7, "F");
        doc.setDrawColor(...borderGray);
        doc.rect(14, y, 182, 7);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.text(String(idx + 1), 17, y + 5);

        const itemName = item.name.length > 45 ? item.name.substring(0, 42) + "..." : item.name;
        doc.text(itemName, 24, y + 5);

        doc.text(String(item.quantity || 1), 110, y + 5);
        doc.text(Number(item.unitPrice || 0).toFixed(2), 122, y + 5);
        doc.text(`${item.gstPercent || 18}%`, 149, y + 5);
        doc.setFont("Helvetica", "bold");
        doc.text(Number(item.totalAmount || 0).toFixed(2), 170, y + 5);

        y += 7;
      });

      y += 4;

      // Summary Box: Total, Paid, Outstanding Balance
      const summaryX = 110;
      doc.setFillColor(248, 250, 252);
      doc.rect(summaryX, y, 86, 38, "F");
      doc.setDrawColor(...borderGray);
      doc.rect(summaryX, y, 86, 38);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...slateDark);
      doc.text("Total Invoiced Amount:", summaryX + 4, y + 7);
      doc.setFont("Helvetica", "bold");
      doc.text(`INR ${Number(inv.grandTotal || 0).toLocaleString("en-IN")}`, summaryX + 52, y + 7);

      doc.setFont("Helvetica", "normal");
      doc.text("Amount Paid So Far:", summaryX + 4, y + 15);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(22, 101, 52); // green
      doc.text(`INR ${Number(inv.amountPaid || 0).toLocaleString("en-IN")}`, summaryX + 52, y + 15);

      // Red highlight for Outstanding Balance
      doc.setFillColor(254, 242, 242);
      doc.rect(summaryX + 2, y + 21, 82, 13, "F");
      doc.setDrawColor(227, 0, 15);
      doc.rect(summaryX + 2, y + 21, 82, 13);

      doc.setTextColor(227, 0, 15);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("OUTSTANDING BALANCE:", summaryX + 4, y + 29);
      doc.setFontSize(11);
      doc.text(`INR ${Number(inv.balanceAmount || 0).toLocaleString("en-IN")}`, summaryX + 50, y + 29);

      // Left Box: Bank Details for Remittance
      doc.setDrawColor(...borderGray);
      doc.rect(14, y, 92, 38);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...slateDark);
      doc.text("REMITTANCE & BANK TRANSFER DETAILS:", 18, y + 6);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      const b = inv.bankDetails || {};
      doc.text(`Bank Name: ${b.bankName || "State Bank of India"}`, 18, y + 12);
      doc.text(`Account No: ${b.accountNumber || "38920192837"}`, 18, y + 17);
      doc.text(`IFSC Code: ${b.ifscCode || "SBIN0001234"}`, 18, y + 22);
      doc.text(`Branch: ${b.branch || "Coimbatore Main Branch"}`, 18, y + 27);
      doc.text(`UPI ID: ${b.upiId || "etosm@sbi"}`, 18, y + 32);

      y += 46;

      // Amount in words
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Outstanding Balance in words: ${numberToWordsINR(inv.balanceAmount || inv.grandTotal)}`, 14, y);

      // Save PDF
      doc.save(`ETOSM_Invoice_${inv.invoiceNumber}_Pending.pdf`);
      showToast(`Invoice ${inv.invoiceNumber} PDF downloaded successfully!`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF", "error");
    }
  };

  // WhatsApp Reminder Link Generator
  const getWhatsAppReminderUrl = (inv) => {
    let cleanPhone = (inv.customerPhone || "").replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    if (!cleanPhone) return null;

    const balanceFormatted = Number(inv.balanceAmount || inv.grandTotal).toLocaleString("en-IN");
    const dueDateFormatted = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "Earliest";

    const msg = `Dear ${inv.customerName || "Customer"},

This is a gentle payment reminder regarding Invoice #${inv.invoiceNumber} from EToSM Technology.

• Total Invoiced: Rs. ${Number(inv.grandTotal).toLocaleString("en-IN")}
• Amount Paid: Rs. ${Number(inv.amountPaid || 0).toLocaleString("en-IN")}
• Outstanding Balance Due: Rs. ${balanceFormatted}
• Due Date: ${dueDateFormatted}

Bank Account for Transfer:
• Bank: State Bank of India
• A/C: 38920192837
• IFSC: SBIN0001234
• UPI: etosm@sbi

Kindly share the payment confirmation or UTR once transferred. Thank you for your business!
EToSM Technology Support`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Email Reminder Link Generator
  const getEmailReminderUrl = (inv) => {
    if (!inv.customerEmail) return null;
    const balanceFormatted = Number(inv.balanceAmount || inv.grandTotal).toLocaleString("en-IN");
    const subject = `Payment Reminder: Invoice #${inv.invoiceNumber} - EToSM Technology`;
    const body = `Dear ${inv.customerName || "Customer"},\n\nWe hope this email finds you well.\n\nThis is a friendly reminder that an outstanding balance of Rs. ${balanceFormatted} remains for Invoice #${inv.invoiceNumber}.\n\nTotal Invoiced: Rs. ${Number(inv.grandTotal).toLocaleString("en-IN")}\nAmount Paid So Far: Rs. ${Number(inv.amountPaid || 0).toLocaleString("en-IN")}\nBalance Due: Rs. ${balanceFormatted}\nDue Date: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "Immediate"}\n\nPlease let us know once payment has been initiated.\n\nBest regards,\nEToSM Technology Team\nsupport@etosmtechnology.in`;
    return `mailto:${inv.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <AdminLayout>
      <div className="pending-invoices-page">
        {/* Toast Notification */}
        {toast && (
          <div className={`pending-toast ${toast.type}`}>
            {toast.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="pending-page-header">
          <div className="pending-header-title">
            <span className="pending-eyebrow">ACCOUNTS RECEIVABLE</span>
            <h1>4. Pending Invoices</h1>
            <p>
              Track unpaid and partially paid invoices, monitor outstanding balances, and view or manage payment statuses.
            </p>
          </div>

          <div className="pending-header-actions">
            <button
              className="pending-btn secondary"
              onClick={() => navigate("/admin/create-invoice")}
            >
              <Plus size={16} />
              <span>Create Invoice</span>
            </button>
            <button
              className="pending-btn secondary"
              onClick={() => navigate("/admin/paid-invoices")}
            >
              <CheckCircle2 size={16} />
              <span>Paid Invoices</span>
            </button>
            <button className="pending-btn primary" onClick={handleExportCSV}>
              <FileSpreadsheet size={16} />
              <span>Export CSV</span>
            </button>
            <button className="pending-btn icon-only" onClick={fetchPendingInvoices} title="Refresh">
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="pending-kpi-grid">
          {/* Card 1: Outstanding Balance */}
          <div className="pending-kpi-card highlight-card">
            <div className="kpi-card-inner">
              <div className="kpi-icon-wrap alert-wrap">
                <AlertCircle size={24} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">TOTAL OUTSTANDING BALANCE</span>
                <h2 className="kpi-value alert-text">
                  ₹{Number(stats.totalOutstandingBalance || 0).toLocaleString("en-IN")}
                </h2>
                <span className="kpi-sub">Awaiting customer collection</span>
              </div>
            </div>
            <div className="kpi-card-footer alert-bg">
              <span>{stats.totalPendingCount} invoices with open balance</span>
            </div>
          </div>

          {/* Card 2: Total Invoice Amount */}
          <div className="pending-kpi-card">
            <div className="kpi-card-inner">
              <div className="kpi-icon-wrap primary-wrap">
                <FileText size={24} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">TOTAL INVOICE AMOUNT</span>
                <h2 className="kpi-value">
                  ₹{Number(stats.totalInvoiceAmount || 0).toLocaleString("en-IN")}
                </h2>
                <span className="kpi-sub">Gross billed value of pending invoices</span>
              </div>
            </div>
            <div className="kpi-card-footer">
              <span>100% of open accounts receivable</span>
            </div>
          </div>

          {/* Card 3: Amount Paid So Far */}
          <div className="pending-kpi-card">
            <div className="kpi-card-inner">
              <div className="kpi-icon-wrap success-wrap">
                <CheckCircle2 size={24} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">AMOUNT PAID SO FAR</span>
                <h2 className="kpi-value success-text">
                  ₹{Number(stats.totalAmountPaid || 0).toLocaleString("en-IN")}
                </h2>
                <span className="kpi-sub">Partial deposits collected</span>
              </div>
            </div>
            <div className="kpi-card-footer success-bg">
              <span>{stats.partiallyPaidCount} partially paid invoices</span>
            </div>
          </div>

          {/* Card 4: Overdue Invoices Alert */}
          <div className="pending-kpi-card">
            <div className="kpi-card-inner">
              <div className="kpi-icon-wrap overdue-wrap">
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">OVERDUE INVOICES</span>
                <h2 className="kpi-value overdue-text">
                  {stats.overdueCount || 0}
                </h2>
                <span className="kpi-sub">
                  ₹{Number(stats.totalOverdueAmount || 0).toLocaleString("en-IN")} past due
                </span>
              </div>
            </div>
            <div className="kpi-card-footer overdue-bg">
              <span>Require immediate payment follow-up</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="pending-filter-card">
          <div className="pending-filter-top">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="pending-search-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by invoice #, customer name, phone, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" className="search-clear-btn" onClick={handleClearSearch}>
                  <X size={15} />
                </button>
              )}
            </form>

            {/* Quick Status Pill Tabs */}
            <div className="pending-status-tabs">
              <button
                className={`status-tab ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All Pending ({stats.totalPendingCount})
              </button>
              <button
                className={`status-tab ${statusFilter === "Pending" ? "active" : ""}`}
                onClick={() => setStatusFilter("Pending")}
              >
                Unpaid Only ({stats.unpaidCount})
              </button>
              <button
                className={`status-tab ${statusFilter === "Partially Paid" ? "active" : ""}`}
                onClick={() => setStatusFilter("Partially Paid")}
              >
                Partially Paid ({stats.partiallyPaidCount})
              </button>
              <button
                className={`status-tab overdue-tab ${statusFilter === "overdue" ? "active" : ""}`}
                onClick={() => setStatusFilter("overdue")}
              >
                Overdue ({stats.overdueCount})
              </button>
            </div>
          </div>

          {/* Secondary Controls: Date Filter & Sort */}
          <div className="pending-filter-bottom">
            <div className="filter-group">
              <label>Due Date Filter:</label>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="all">All Dates</option>
                <option value="today">Due Today</option>
                <option value="this_week">Due This Week</option>
                <option value="this_month">Due This Month</option>
                <option value="overdue">Overdue Only</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {dateFilter === "custom" && (
              <div className="custom-date-range">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <div className="filter-group">
              <label>Sort By:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="dueDate_asc">Due Date (Urgent First)</option>
                <option value="balance_high">Highest Outstanding Balance</option>
                <option value="balance_low">Lowest Outstanding Balance</option>
                <option value="amount_high">Highest Total Amount</option>
                <option value="newest">Newest Invoice First</option>
                <option value="oldest">Oldest Invoice First</option>
                <option value="customer_asc">Customer Name (A-Z)</option>
              </select>
            </div>

            {(searchTerm || statusFilter !== "all" || dateFilter !== "all" || sortBy !== "dueDate_asc") && (
              <button className="reset-filters-btn" onClick={handleResetFilters}>
                <X size={14} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="pending-table-container">
          {loading ? (
            <div className="pending-loading-state">
              <div className="pending-spinner"></div>
              <p>Loading pending invoices and account balances...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="pending-empty-state">
              <CheckCircle2 size={54} color="#16a34a" />
              <h3>No Pending Invoices Found</h3>
              <p>
                {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                  ? "No invoices match your current search and filter criteria."
                  : "Great news! All customer invoices are currently fully paid and settled."}
              </p>
              {(searchTerm || statusFilter !== "all" || dateFilter !== "all") && (
                <button className="pending-btn secondary" onClick={handleResetFilters}>
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="pending-table-scroll">
              <table className="pending-table">
                <thead>
                  <tr>
                    <th>INVOICE #</th>
                    <th>CUSTOMER DETAILS</th>
                    <th>DUE DATE & TIMELINE</th>
                    <th style={{ textAlign: "right" }}>TOTAL AMOUNT</th>
                    <th style={{ textAlign: "right" }}>AMOUNT PAID</th>
                    <th style={{ textAlign: "right" }}>OUTSTANDING BALANCE</th>
                    <th>PAYMENT STATUS</th>
                    <th style={{ textAlign: "center" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const waUrl = getWhatsAppReminderUrl(inv);
                    const emailUrl = getEmailReminderUrl(inv);

                    return (
                      <tr key={inv._id} className={inv.isOverdue ? "row-overdue" : ""}>
                        {/* Invoice Number & Date */}
                        <td>
                          <div className="table-inv-meta">
                            <span
                              className="table-inv-num"
                              onClick={() => setReviewInvoice(inv)}
                              title="Click to preview invoice"
                            >
                              {inv.invoiceNumber}
                            </span>
                            <span className="table-inv-date">
                              {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td>
                          <div className="table-customer-cell">
                            <span className="table-customer-name">{inv.customerName}</span>
                            {inv.customerCompany && (
                              <span className="table-customer-company">
                                <Building size={12} /> {inv.customerCompany}
                              </span>
                            )}
                            <div className="table-customer-contact">
                              {inv.customerPhone && (
                                <a href={`tel:${inv.customerPhone}`} className="contact-link">
                                  <Phone size={12} /> {inv.customerPhone}
                                </a>
                              )}
                              {inv.customerEmail && (
                                <a href={`mailto:${inv.customerEmail}`} className="contact-link">
                                  <Mail size={12} /> {inv.customerEmail}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Due Date & Urgency Indicator */}
                        <td>
                          <div className="table-due-cell">
                            <span className="table-due-date">
                              {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN") : "Immediate"}
                            </span>
                            {inv.isOverdue ? (
                              <span className="urgency-pill overdue">
                                <AlertTriangle size={11} /> Overdue by {inv.daysOverdue} days
                              </span>
                            ) : inv.dueDate && new Date(inv.dueDate).toDateString() === new Date().toDateString() ? (
                              <span className="urgency-pill due-today">
                                <Clock size={11} /> Due Today
                              </span>
                            ) : (
                              <span className="urgency-pill on-schedule">
                                <Clock size={11} /> Pending Settlement
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td style={{ textAlign: "right" }}>
                          <span className="amount-cell total-amount">
                            ₹{Number(inv.grandTotal || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Amount Paid */}
                        <td style={{ textAlign: "right" }}>
                          <span className="amount-cell paid-amount">
                            ₹{Number(inv.amountPaid || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Outstanding Balance */}
                        <td style={{ textAlign: "right" }}>
                          <span className="amount-cell balance-amount">
                            ₹{Number(inv.balanceAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Status Pill */}
                        <td>
                          <span className={`status-pill ${inv.isOverdue ? "overdue" : (inv.paymentStatus || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                            {inv.isOverdue
                              ? "Overdue"
                              : inv.paymentStatus === "Partially Paid"
                              ? "Partially Paid"
                              : "Unpaid (Pending)"}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td>
                          <div className="table-action-row">
                            {/* Record / Manage Payment */}
                            <button
                              className="action-btn-primary"
                              onClick={() => handleOpenPaymentModal(inv)}
                              title="Record Payment or Manage Status"
                            >
                              <CreditCard size={14} />
                              <span>Collect Payment</span>
                            </button>

                            {/* 1-Click Quick Mark Paid */}
                            <button
                              className="action-btn-quick-paid"
                              onClick={() => handleQuickMarkPaid(inv)}
                              title="1-Click Mark as Fully Paid"
                            >
                              <Check size={14} />
                            </button>

                            {/* WhatsApp Reminder */}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-btn-icon wa-btn"
                                title="Send WhatsApp Payment Reminder"
                              >
                                <MessageCircle size={15} />
                              </a>
                            )}

                            {/* Email Reminder */}
                            {emailUrl && (
                              <a
                                href={emailUrl}
                                className="action-btn-icon email-btn"
                                title="Send Email Reminder"
                              >
                                <Mail size={15} />
                              </a>
                            )}

                            {/* View Invoice */}
                            <button
                              className="action-btn-icon"
                              onClick={() => setReviewInvoice(inv)}
                              title="Preview Invoice"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Download PDF */}
                            <button
                              className="action-btn-icon"
                              onClick={() => handleDownloadPdf(inv)}
                              title="Download PDF"
                            >
                              <Download size={15} />
                            </button>

                            {/* Delete */}
                            <button
                              className="action-btn-icon delete-btn"
                              onClick={() => handleDeleteInvoice(inv)}
                              title="Delete Invoice"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: RECORD PAYMENT / MANAGE PAYMENT STATUS */}
        {paymentModalInvoice && (
          <div className="modal-backdrop" onClick={() => setPaymentModalInvoice(null)}>
            <div className="pending-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">PAYMENT RECORDING & STATUS</span>
                  <h2>Invoice #{paymentModalInvoice.invoiceNumber}</h2>
                  <p className="modal-subtitle">Customer: {paymentModalInvoice.customerName}</p>
                </div>
                <button className="modal-close-btn" onClick={() => setPaymentModalInvoice(null)}>
                  <X size={20} />
                </button>
              </div>

              {/* Financial Summary Strip */}
              <div className="modal-financial-strip">
                <div className="fin-item">
                  <span className="fin-label">Total Invoiced</span>
                  <span className="fin-val">₹{Number(paymentModalInvoice.grandTotal || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="fin-divider"></div>
                <div className="fin-item">
                  <span className="fin-label">Already Paid</span>
                  <span className="fin-val success-val">₹{Number(paymentModalInvoice.amountPaid || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="fin-divider"></div>
                <div className="fin-item">
                  <span className="fin-label">Outstanding Balance</span>
                  <span className="fin-val alert-val">₹{Number(paymentModalInvoice.balanceAmount || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Payment Entry Form */}
              <div className="modal-form-section">
                <h3 className="section-label">Record New Payment</h3>

                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Payment Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      max={paymentModalInvoice.balanceAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount paid"
                    />
                    <div className="quick-amount-buttons">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(paymentModalInvoice.balanceAmount))}
                      >
                        Full Balance (₹{Number(paymentModalInvoice.balanceAmount).toLocaleString("en-IN")})
                      </button>
                      {paymentModalInvoice.balanceAmount > 1000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(String(Math.round(paymentModalInvoice.balanceAmount / 2)))}
                        >
                          50% Deposit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Payment Mode *</label>
                    <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="UPI / QR">UPI (Google Pay / PhonePe / Paytm)</option>
                      <option value="Cash">Cash Receipt</option>
                      <option value="Cheque">Bank Cheque</option>
                      <option value="Razorpay">Razorpay / Card</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Transaction Reference / UTR #</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR10293848, Cheque #849201"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Date *</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Notes & Remittance Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Received 50% advance for raw materials..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>

                {paymentAmount && Number(paymentAmount) > 0 && (
                  <div className="new-balance-preview">
                    <span>Balance Remaining After This Payment:</span>
                    <strong>
                      ₹{Math.max(0, paymentModalInvoice.balanceAmount - Number(paymentAmount)).toLocaleString("en-IN")}
                    </strong>
                    {Number(paymentAmount) >= paymentModalInvoice.balanceAmount && (
                      <span className="badge-cleared">✓ Will be marked as Fully Paid</span>
                    )}
                  </div>
                )}

                <div className="modal-primary-actions">
                  <button
                    className="modal-submit-btn"
                    disabled={recordingPayment || !paymentAmount || Number(paymentAmount) <= 0}
                    onClick={() => handleRecordPayment("record_payment")}
                  >
                    {recordingPayment ? "Saving Payment..." : "Save & Update Payment"}
                  </button>
                  <button
                    className="modal-mark-full-btn"
                    disabled={recordingPayment}
                    onClick={() => handleRecordPayment("mark_paid")}
                  >
                    1-Click Mark 100% Paid
                  </button>
                </div>
              </div>

              {/* Payment History Log */}
              {Array.isArray(paymentModalInvoice.paymentHistory) && paymentModalInvoice.paymentHistory.length > 0 && (
                <div className="modal-history-section">
                  <h3 className="section-label">Payment History for this Invoice</h3>
                  <table className="modal-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Reference</th>
                        <th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentModalInvoice.paymentHistory.map((ph, idx) => (
                        <tr key={idx}>
                          <td>{ph.paymentDate ? new Date(ph.paymentDate).toLocaleDateString("en-IN") : "N/A"}</td>
                          <td style={{ color: "#16a34a", fontWeight: "700" }}>₹{Number(ph.amount).toLocaleString("en-IN")}</td>
                          <td>{ph.paymentMode || "Bank"}</td>
                          <td>{ph.reference || "-"}</td>
                          <td>{ph.recordedBy || "Admin"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Status Reset Options */}
              <div className="modal-status-override">
                <span>Direct Status Override:</span>
                <div className="override-buttons">
                  <button
                    type="button"
                    className="btn-status-reset"
                    onClick={() => handleRecordPayment("mark_pending")}
                  >
                    Reset to Unpaid (Pending)
                  </button>
                  <button
                    type="button"
                    className="btn-status-cancel"
                    onClick={() => handleRecordPayment("mark_cancelled")}
                  >
                    Mark as Cancelled
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: INVOICE PREVIEW / REVIEW MODAL */}
        {reviewInvoice && (
          <div className="modal-backdrop" onClick={() => setReviewInvoice(null)}>
            <div className="preview-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="preview-modal-header">
                <div className="header-left">
                  <span className="preview-eyebrow">TAX INVOICE PREVIEW</span>
                  <h2>{reviewInvoice.invoiceNumber}</h2>
                  <span className={`preview-status-tag ${(reviewInvoice.paymentStatus || "pending").toLowerCase()}`}>
                    {reviewInvoice.paymentStatus || "Pending"}
                  </span>
                </div>
                <div className="header-right">
                  <button className="preview-btn primary" onClick={() => handleDownloadPdf(reviewInvoice)}>
                    <Download size={15} />
                    <span>Download PDF</span>
                  </button>
                  <button className="preview-btn secondary" onClick={() => handleOpenPaymentModal(reviewInvoice)}>
                    <CreditCard size={15} />
                    <span>Update Payment</span>
                  </button>
                  <button className="preview-close-btn" onClick={() => setReviewInvoice(null)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Invoice Sheet */}
              <div className="preview-invoice-sheet">
                <div className="sheet-top-header">
                  <div className="sheet-brand">
                    <img src="/logo1.png" alt="ETOSM Logo" style={{ height: "36px", marginBottom: "8px" }} />
                    <p>Lithium Battery Packs • Custom BMS • EV Electronics</p>
                    <p>Namakkal, Tamil Nadu-637202 | support@etosmtechnology.in</p>
                  </div>
                  <div className="sheet-inv-title">
                    <h3>TAX INVOICE</h3>
                    <div className="sheet-meta-grid">
                      <div>
                        <span>Invoice No:</span>
                        <strong>{reviewInvoice.invoiceNumber}</strong>
                      </div>
                      <div>
                        <span>Invoice Date:</span>
                        <strong>{reviewInvoice.invoiceDate ? new Date(reviewInvoice.invoiceDate).toLocaleDateString("en-IN") : "N/A"}</strong>
                      </div>
                      <div>
                        <span>Due Date:</span>
                        <strong style={{ color: reviewInvoice.isOverdue ? "#e3000f" : "#0f172a" }}>
                          {reviewInvoice.dueDate ? new Date(reviewInvoice.dueDate).toLocaleDateString("en-IN") : "Immediate"}
                        </strong>
                      </div>
                      <div>
                        <span>Place of Supply:</span>
                        <strong>{reviewInvoice.placeOfSupply || "33 - Tamil Nadu"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sheet-customer-strip">
                  <div className="cust-block">
                    <h4>BILLED TO:</h4>
                    <strong>{reviewInvoice.customerName}</strong>
                    {reviewInvoice.customerCompany && <p>{reviewInvoice.customerCompany}</p>}
                    {reviewInvoice.customerAddress && <p>{reviewInvoice.customerAddress}</p>}
                    {reviewInvoice.customerPhone && <p>Phone: {reviewInvoice.customerPhone}</p>}
                    {reviewInvoice.customerEmail && <p>Email: {reviewInvoice.customerEmail}</p>}
                    {reviewInvoice.customerGstin && <p>GSTIN: {reviewInvoice.customerGstin}</p>}
                  </div>
                  <div className="cust-block">
                    <h4>PAYMENT STATUS SUMMARY:</h4>
                    <div className="cust-balance-highlight">
                      <span>Total Invoice:</span>
                      <strong>₹{Number(reviewInvoice.grandTotal || 0).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="cust-balance-highlight success">
                      <span>Amount Paid:</span>
                      <strong>₹{Number(reviewInvoice.amountPaid || 0).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="cust-balance-highlight alert">
                      <span>Outstanding Balance:</span>
                      <strong>₹{Number(reviewInvoice.balanceAmount || 0).toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="sheet-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item Description</th>
                      <th style={{ textAlign: "center" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Unit Price</th>
                      <th style={{ textAlign: "right" }}>GST</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reviewInvoice.items || []).map((it, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <strong>{it.name}</strong>
                          {it.description && <span className="item-sub-desc">{it.description}</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>{it.quantity}</td>
                        <td style={{ textAlign: "right" }}>₹{Number(it.unitPrice || 0).toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right" }}>{it.gstPercent || 18}%</td>
                        <td style={{ textAlign: "right" }}>₹{Number(it.totalAmount || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Bottom Financial Grid */}
                <div className="sheet-bottom-grid">
                  <div className="sheet-bank-box">
                    <h4>REMITTANCE BANK DETAILS:</h4>
                    <p><strong>Bank:</strong> {reviewInvoice.bankDetails?.bankName || "State Bank of India"}</p>
                    <p><strong>Account:</strong> {reviewInvoice.bankDetails?.accountNumber || "38920192837"}</p>
                    <p><strong>IFSC:</strong> {reviewInvoice.bankDetails?.ifscCode || "SBIN0001234"}</p>
                    <p><strong>Branch:</strong> {reviewInvoice.bankDetails?.branch || "Coimbatore Main Branch"}</p>
                    <p><strong>UPI ID:</strong> {reviewInvoice.bankDetails?.upiId || "etosm@sbi"}</p>
                  </div>
                  <div className="sheet-totals-box">
                    <div className="total-row">
                      <span>Gross Subtotal:</span>
                      <span>₹{Number(reviewInvoice.grossSubtotal || reviewInvoice.grandTotal).toLocaleString("en-IN")}</span>
                    </div>
                    {Number(reviewInvoice.totalDiscount) > 0 && (
                      <div className="total-row discount">
                        <span>Total Discount:</span>
                        <span>- ₹{Number(reviewInvoice.totalDiscount).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="total-row">
                      <span>Total GST:</span>
                      <span>₹{Number(reviewInvoice.totalTax || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="total-row grand">
                      <span>Total Invoice Amount:</span>
                      <span>₹{Number(reviewInvoice.grandTotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="total-row paid">
                      <span>Amount Paid:</span>
                      <span>₹{Number(reviewInvoice.amountPaid || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="total-row balance">
                      <span>Outstanding Balance:</span>
                      <span>₹{Number(reviewInvoice.balanceAmount || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {reviewInvoice.notes && (
                  <div className="sheet-terms">
                    <h4>TERMS & CONDITIONS:</h4>
                    <p>{reviewInvoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PendingInvoicesPage;