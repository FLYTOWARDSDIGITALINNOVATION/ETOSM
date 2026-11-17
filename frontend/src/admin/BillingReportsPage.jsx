import API_BASE_URL from "../apiConfig";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  CreditCard,
  Clock,
  Calendar,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Eye,
  X,
  FileText,
  Building,
  Phone,
  User,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  RefreshCw,
  Printer,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  Package,
  Award
} from "lucide-react";
import jsPDF from "jspdf";
import { generateEtosmBulkInvoicesPdf } from "../utils/invoicePdfGenerator";
import AdminLayout from "./AdminLayout";
import "./BillingReportsPage.css";

const BillingReportsPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // State
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "auditor" | "skusales" | "bestsellers" | "datewise" | "transactions" | "customers"

  // BUG-015: Monthly bulk invoice PDF download state
  const [bulkPdfModalOpen, setBulkPdfModalOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(() => new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(() => new Date().getFullYear());
  const [generatingBulkPdf, setGeneratingBulkPdf] = useState(false);

  // BUG-017 & BUG-018: SKU and Bestseller view state
  const [skuSearchTerm, setSkuSearchTerm] = useState("");
  const [bestsellerMetric, setBestsellerMetric] = useState("qty"); // "qty" | "revenue"
  const [bestsellerLimit, setBestsellerLimit] = useState(10); // 10 | 20 | "all"

  // Data from backend
  const [reportsData, setReportsData] = useState({
    summary: {
      totalSales: 0,
      totalPaid: 0,
      totalPendingBalance: 0,
      totalTax: 0,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 0,
      taxableAmount: 0,
      collectionEfficiency: 0,
      totalInvoicesCount: 0,
      paidCount: 0,
      partiallyPaidCount: 0,
      unpaidCount: 0,
      cancelledCount: 0
    },
    agingSummary: {
      current: { count: 0, amount: 0 },
      overdue1to15: { count: 0, amount: 0 },
      overdue16to30: { count: 0, amount: 0 },
      overdue31plus: { count: 0, amount: 0 }
    },
    paymentModeBreakdown: [],
    dateWiseReports: [],
    transactions: [],
    topCustomers: [],
    invoices: [],
    skuSalesReport: [],
    topSellingProducts: { byQuantity: [], byRevenue: [] },
    auditorSalesRegister: [],
    creditNotes: []
  });

  // Modals
  const [selectedDayReport, setSelectedDayReport] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth check
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
    } else {
      fetchBillingReports();
    }
  }, [navigate, dateFilter, paymentStatusFilter, paymentModeFilter]);

  // Fetch Reports
  const fetchBillingReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("dateFilter", dateFilter);
      if (dateFilter === "custom") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
      }
      if (paymentStatusFilter !== "all") {
        params.append("paymentStatus", paymentStatusFilter);
      }
      if (paymentModeFilter !== "all") {
        params.append("paymentMode", paymentModeFilter);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await fetch(`${API_BASE_URL}/admin/billing-reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setReportsData(data);
    } catch (err) {
      console.error("Failed to load billing reports:", err);
      showToast("Error loading billing reports data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomDates = (e) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      showToast("Please choose both Start and End dates", "error");
      return;
    }
    setDateFilter("custom");
    fetchBillingReports();
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return reportsData.transactions || [];
    const q = searchQuery.toLowerCase();
    return (reportsData.transactions || []).filter(
      (t) =>
        (t.invoiceNumber || "").toLowerCase().includes(q) ||
        (t.customerName || "").toLowerCase().includes(q) ||
        (t.customerPhone || "").includes(q) ||
        (t.reference || "").toLowerCase().includes(q) ||
        (t.paymentMode || "").toLowerCase().includes(q)
    );
  }, [reportsData.transactions, searchQuery]);

  // Export Date-Wise Report to CSV
  const handleExportDateWiseCSV = () => {
    if (!reportsData.dateWiseReports || reportsData.dateWiseReports.length === 0) {
      showToast("No date-wise records to export", "error");
      return;
    }

    const headers = [
      "Date",
      "Formatted Date",
      "Total Invoices Issued",
      "Total Sales (INR)",
      "Amount Paid / Collected (INR)",
      "Pending Balance Added (INR)",
      "Total GST (INR)"
    ];

    const rows = [headers.join(",")];
    reportsData.dateWiseReports.forEach((d) => {
      rows.push([
        `"${d.date}"`,
        `"${d.displayDate}"`,
        d.invoiceCount || 0,
        Number(d.totalSales || 0).toFixed(2),
        Number(d.amountPaid || 0).toFixed(2),
        Number(d.balanceAmount || 0).toFixed(2),
        Number(d.taxAmount || 0).toFixed(2)
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETOSM_DateWise_Billing_Report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${reportsData.dateWiseReports.length} date records to CSV`);
  };

  // Export Transactions Ledger to CSV
  const handleExportTransactionsCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      showToast("No billing transactions to export", "error");
      return;
    }

    const headers = [
      "Payment Date",
      "Transaction ID",
      "Invoice Number",
      "Customer Name",
      "Company",
      "Phone",
      "Payment Mode",
      "Amount Paid (INR)",
      "Reference",
      "Recorded By",
      "Status"
    ];

    const rows = [headers.join(",")];
    filteredTransactions.forEach((t) => {
      rows.push([
        `"${t.paymentDate ? new Date(t.paymentDate).toLocaleDateString("en-IN") : "N/A"}"`,
        `"${t.transactionId}"`,
        `"${t.invoiceNumber}"`,
        `"${(t.customerName || "").replace(/"/g, '""')}"`,
        `"${(t.customerCompany || "").replace(/"/g, '""')}"`,
        `"${t.customerPhone || ""}"`,
        `"${t.paymentMode}"`,
        Number(t.amount || 0).toFixed(2),
        `"${(t.reference || "").replace(/"/g, '""')}"`,
        `"${t.recordedBy || "Admin"}"`,
        `"${t.invoiceStatus}"`
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETOSM_Billing_Transactions_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredTransactions.length} transaction entries to CSV`);
  };

  // BUG-016: Export Auditor-Ready GST Sales Register (CSV)
  const handleExportAuditorGSTReport = () => {
    const list = reportsData.auditorSalesRegister || [];
    if (list.length === 0) {
      showToast("No auditor sales records found for this period", "error");
      return;
    }

    const headers = [
      "Invoice Number",
      "Invoice Date",
      "Source Order ID",
      "Sales Channel",
      "Customer Name",
      "Customer GSTIN",
      "Billing State",
      "Place of Supply",
      "Taxable Value (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "IGST (INR)",
      "Total GST (INR)",
      "Round Off (INR)",
      "Gross Total (INR)",
      "Document Status",
      "Payment Status",
      "Linked Credit Notes",
      "Credited Taxable (INR)",
      "Credited GST (INR)",
      "Credited Gross Total (INR)",
      "Net Adjusted Taxable (INR)",
      "Net Adjusted GST (INR)",
      "Net Adjusted Sales Total (INR)"
    ];

    const rows = [headers.join(",")];
    list.forEach((inv) => {
      rows.push([
        `"${inv.invoiceNumber}"`,
        `"${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "N/A"}"`,
        `"${(inv.sourceOrderNumber || "").replace(/"/g, '""')}"`,
        `"${inv.salesChannel || "Direct"}"`,
        `"${(inv.customerName || "").replace(/"/g, '""')}"`,
        `"${inv.customerGstin || ""}"`,
        `"${(inv.billingState || "").replace(/"/g, '""')}"`,
        `"${(inv.placeOfSupply || "").replace(/"/g, '""')}"`,
        Number(inv.taxableSubtotal || 0).toFixed(2),
        Number(inv.cgstTotal || 0).toFixed(2),
        Number(inv.sgstTotal || 0).toFixed(2),
        Number(inv.igstTotal || 0).toFixed(2),
        Number(inv.totalTax || 0).toFixed(2),
        Number(inv.roundOff || 0).toFixed(2),
        Number(inv.grandTotal || 0).toFixed(2),
        `"${inv.documentStatus || "Issued"}"`,
        `"${inv.paymentStatus || "Paid"}"`,
        `"${(inv.linkedCreditNoteNumbers || []).join("; ")}"`,
        Number(inv.totalCreditedTaxable || 0).toFixed(2),
        Number(inv.totalCreditedTax || 0).toFixed(2),
        Number(inv.totalCreditedGross || 0).toFixed(2),
        Number(inv.netTaxable || 0).toFixed(2),
        Number(inv.netTax || 0).toFixed(2),
        Number(inv.netGross || 0).toFixed(2)
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETOSM_Auditor_GST_Sales_Register_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${list.length} auditor sales records to CSV`);
  };

  // BUG-016: Export Credit Notes Register (CSV)
  const handleExportCreditNotesRegisterCSV = () => {
    const list = reportsData.creditNotes || [];
    if (list.length === 0) {
      showToast("No credit notes found for this period", "error");
      return;
    }

    const headers = [
      "Credit Note #",
      "Date",
      "Linked Invoice #",
      "Customer Name",
      "Customer GSTIN",
      "Place of Supply",
      "Reason",
      "Taxable Amount (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "IGST (INR)",
      "Total GST (INR)",
      "Total Credit Amount (INR)",
      "Status",
      "Refund Mode",
      "Refund Reference"
    ];

    const rows = [headers.join(",")];
    list.forEach((cn) => {
      rows.push([
        `"${cn.creditNoteNumber}"`,
        `"${cn.creditNoteDate ? new Date(cn.creditNoteDate).toLocaleDateString("en-IN") : "N/A"}"`,
        `"${cn.invoiceNumber || "Standalone"}"`,
        `"${(cn.customerName || "").replace(/"/g, '""')}"`,
        `"${cn.customerGstin || ""}"`,
        `"${(cn.placeOfSupply || "").replace(/"/g, '""')}"`,
        `"${(cn.reason || "").replace(/"/g, '""')}"`,
        Number(cn.subtotal || 0).toFixed(2),
        Number(cn.cgstTotal || 0).toFixed(2),
        Number(cn.sgstTotal || 0).toFixed(2),
        Number(cn.igstTotal || 0).toFixed(2),
        Number(cn.totalTax || 0).toFixed(2),
        Number(cn.totalCreditAmount || 0).toFixed(2),
        `"${cn.status || "Issued"}"`,
        `"${cn.refundMode || ""}"`,
        `"${(cn.refundReference || "").replace(/"/g, '""')}"`
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETOSM_Credit_Notes_Register_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${list.length} credit note records to CSV`);
  };

  // BUG-017: Export SKU-Wise Sales Quantity Report (CSV)
  const handleExportSkuSalesCSV = () => {
    const list = reportsData.skuSalesReport || [];
    if (list.length === 0) {
      showToast("No SKU sales records found for this period", "error");
      return;
    }

    const headers = [
      "SKU",
      "Product Name",
      "Invoiced Units",
      "Credited / Returned Units",
      "Net Units Sold",
      "Invoiced Taxable (INR)",
      "Credited Value (INR)",
      "Net Sales Taxable (INR)"
    ];

    const rows = [headers.join(",")];
    list.forEach((item) => {
      rows.push([
        `"${(item.sku || "N/A").replace(/"/g, '""')}"`,
        `"${(item.name || "").replace(/"/g, '""')}"`,
        item.invoicedQuantity || 0,
        item.creditedQuantity || 0,
        item.netQuantity || 0,
        Number(item.taxableSales || 0).toFixed(2),
        Number(item.creditedValue || 0).toFixed(2),
        Number(item.netSales || 0).toFixed(2)
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETOSM_SKU_Sales_Quantity_Report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${list.length} SKU sales records to CSV`);
  };

  // BUG-018: Export Best-Selling Products (CSV)
  const handleExportBestSellersCSV = () => {
    const rawList = bestsellerMetric === "qty"
      ? (reportsData.topSellingProducts?.byQuantity || [])
      : (reportsData.topSellingProducts?.byRevenue || []);
    const list = bestsellerLimit === "all" ? rawList : rawList.slice(0, Number(bestsellerLimit) || 10);
    if (list.length === 0) {
      showToast("No best-seller records to export", "error");
      return;
    }

    const headers = [
      "Rank",
      "SKU",
      "Product Title",
      "Net Units Sold",
      "Net Sales Revenue (INR)"
    ];

    const rows = [headers.join(",")];
    list.forEach((item, index) => {
      rows.push([
        index + 1,
        `"${(item.sku || "N/A").replace(/"/g, '""')}"`,
        `"${(item.name || "").replace(/"/g, '""')}"`,
        item.netQuantity || 0,
        Number(item.netSales || 0).toFixed(2)
      ].join(","));
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETOSM_Best_Selling_Products_${bestsellerMetric}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${list.length} top products to CSV`);
  };

  // BUG-015: Handle Monthly Bulk Invoices PDF Download
  const handleDownloadMonthlyBulkPdf = async () => {
    setGeneratingBulkPdf(true);
    try {
      showToast("Fetching invoices and preparing bulk PDF bundle...", "info");
      const res = await fetch(`${API_BASE_URL}/admin/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const allInvoices = await res.json();

      const monthInvoices = (Array.isArray(allInvoices) ? allInvoices : []).filter((inv) => {
        const invDate = new Date(inv.invoiceDate || inv.createdAt);
        return (
          invDate.getFullYear() === Number(bulkYear) &&
          invDate.getMonth() + 1 === Number(bulkMonth) &&
          inv.documentStatus !== "Cancelled"
        );
      });

      if (monthInvoices.length === 0) {
        showToast(`No issued invoices found for ${new Date(bulkYear, bulkMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" })}`, "error");
        setGeneratingBulkPdf(false);
        return;
      }

      const monthName = new Date(bulkYear, bulkMonth - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
      const bundleDoc = await generateEtosmBulkInvoicesPdf(monthInvoices, monthName);
      bundleDoc.save(`EToSM_Invoices_Bundle_${bulkYear}_${String(bulkMonth).padStart(2, "0")}.pdf`);
      showToast(`Successfully downloaded bulk bundle for ${monthName} (${monthInvoices.length} invoices)!`);
      setBulkPdfModalOpen(false);
    } catch (err) {
      console.error("Bulk PDF generation error:", err);
      showToast(err.message || "Failed to generate bulk invoices PDF", "error");
    } finally {
      setGeneratingBulkPdf(false);
    }
  };

  // Export Executive Summary PDF
  const handleDownloadPDFSummary = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const s = reportsData.summary || {};
    const aging = reportsData.agingSummary || {};

    // Header Band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ETOSM TECHNOLOGY - EXECUTIVE BILLING REPORT", 14, 15);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const dateRangeLabel =
      dateFilter === "custom"
        ? `Custom Range: ${customStartDate} to ${customEndDate}`
        : `Reporting Period: ${dateFilter.replace("_", " ").toUpperCase()}`;
    doc.text(`${dateRangeLabel} | Generated on: ${new Date().toLocaleString("en-IN")}`, 14, 22);

    // Key Financial Totals Box
    let y = 42;
    doc.setTextColor(15, 23, 42);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. FINANCIAL OVERVIEW & AR SUMMARY", 14, y);

    y += 8;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 36, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 36);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL INVOICED SALES:", 20, y + 9);
    doc.text("TOTAL PAID / COLLECTED:", 80, y + 9);
    doc.text("OUTSTANDING BALANCE:", 140, y + 9);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`INR ${Number(s.totalSales || 0).toLocaleString("en-IN")}`, 20, y + 17);

    doc.setTextColor(22, 163, 74);
    doc.text(`INR ${Number(s.totalPaid || 0).toLocaleString("en-IN")}`, 80, y + 17);

    doc.setTextColor(227, 0, 15);
    doc.text(`INR ${Number(s.totalPendingBalance || 0).toLocaleString("en-IN")}`, 140, y + 17);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Invoices Issued: ${s.totalInvoicesCount || 0} (${s.paidCount || 0} Paid, ${s.partiallyPaidCount || 0} Partial, ${s.unpaidCount || 0} Unpaid)`, 20, y + 27);
    doc.text(`Collection Efficiency: ${s.collectionEfficiency || 0}%`, 140, y + 27);

    // Tax Details
    y += 44;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("2. TAX & GST REVENUE BREAKDOWN", 14, y);

    y += 7;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 22, "F");
    doc.rect(14, y, 182, 22);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Taxable Subtotal: INR ${Number(s.taxableAmount || 0).toLocaleString("en-IN")}`, 20, y + 8);
    doc.text(`Total GST Collected: INR ${Number(s.totalTax || 0).toLocaleString("en-IN")}`, 105, y + 8);
    doc.text(`CGST: INR ${Number(s.cgstTotal || 0).toLocaleString("en-IN")}`, 20, y + 15);
    doc.text(`SGST: INR ${Number(s.sgstTotal || 0).toLocaleString("en-IN")}`, 75, y + 15);
    doc.text(`IGST: INR ${Number(s.igstTotal || 0).toLocaleString("en-IN")}`, 130, y + 15);

    // Aging Analysis
    y += 30;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("3. OUTSTANDING AGING & OVERDUE ANALYSIS", 14, y);

    y += 7;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 24, "F");
    doc.rect(14, y, 182, 24);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Current (Not Due): INR ${Number(aging.current?.amount || 0).toLocaleString("en-IN")} (${aging.current?.count || 0})`, 20, y + 8);
    doc.text(`1 - 15 Days Overdue: INR ${Number(aging.overdue1to15?.amount || 0).toLocaleString("en-IN")} (${aging.overdue1to15?.count || 0})`, 105, y + 8);
    doc.text(`16 - 30 Days Overdue: INR ${Number(aging.overdue16to30?.amount || 0).toLocaleString("en-IN")} (${aging.overdue16to30?.count || 0})`, 20, y + 16);
    doc.setTextColor(220, 38, 38);
    doc.text(`31+ Days Overdue: INR ${Number(aging.overdue31plus?.amount || 0).toLocaleString("en-IN")} (${aging.overdue31plus?.count || 0})`, 105, y + 16);

    // Payment Mode Breakdown
    y += 32;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("4. COLLECTIONS BY PAYMENT MODE", 14, y);

    y += 6;
    (reportsData.paymentModeBreakdown || []).slice(0, 5).forEach((pm) => {
      y += 6;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${pm.mode}: INR ${Number(pm.amount || 0).toLocaleString("en-IN")} (${pm.percentage}%)`, 20, y);
    });

    // Date-wise summary top 8
    y += 12;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("5. RECENT DATE-WISE ACTIVITY SUMMARY", 14, y);

    y += 6;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, "F");
    doc.rect(14, y, 182, 6);
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("DATE", 18, y + 4.5);
    doc.text("INVOICES", 55, y + 4.5);
    doc.text("SALES (INR)", 90, y + 4.5);
    doc.text("PAID (INR)", 135, y + 4.5);
    doc.text("BALANCE (INR)", 165, y + 4.5);

    doc.setFont("Helvetica", "normal");
    (reportsData.dateWiseReports || []).slice(0, 8).forEach((d) => {
      y += 6;
      doc.text(String(d.displayDate || d.date), 18, y + 4);
      doc.text(String(d.invoiceCount || 0), 60, y + 4);
      doc.text(Number(d.totalSales || 0).toLocaleString("en-IN"), 90, y + 4);
      doc.text(Number(d.amountPaid || 0).toLocaleString("en-IN"), 135, y + 4);
      doc.text(Number(d.balanceAmount || 0).toLocaleString("en-IN"), 165, y + 4);
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 6, 196, y + 6);
    });

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("ETOSM Management Suite • Confidential Internal Billing Document", 14, 287);

    doc.save(`ETOSM_Executive_Billing_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    showToast("Downloaded Executive Billing Report PDF");
  };

  const s = reportsData.summary || {};
  const aging = reportsData.agingSummary || {};

  return (
    <AdminLayout>
      <div className="billing-reports-page">
        {/* Toast */}
        {toast && (
          <div className={`report-toast ${toast.type}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="reports-page-header">
          <div className="header-title-box">
            <span className="reports-eyebrow">FINANCIAL INTELLIGENCE & AUDIT</span>
            <h1>7. Billing Reports</h1>
            <p>
              View total sales and paid amounts. Track pending payment balances. Generate date-wise invoice reports. Review billing transactions and payment summaries.
            </p>
          </div>

          <div className="header-actions-box">
            <button className="r-btn primary" onClick={() => setBulkPdfModalOpen(true)} title="Download Monthly Sequential Bulk Invoices PDF (BUG-015)">
              <Download size={16} />
              <span>Monthly Bulk Invoices PDF</span>
            </button>
            <button className="r-btn secondary" onClick={handleDownloadPDFSummary}>
              <FileText size={16} />
              <span>Executive PDF</span>
            </button>
            <button className="r-btn secondary" onClick={handleExportDateWiseCSV}>
              <FileSpreadsheet size={16} />
              <span>Export Date-Wise CSV</span>
            </button>
            <button className="r-btn icon-only" onClick={fetchBillingReports} title="Refresh Data">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="reports-filter-bar">
          <div className="filter-presets-row">
            <div className="preset-tabs">
              <button
                className={`preset-tab ${dateFilter === "today" ? "active" : ""}`}
                onClick={() => setDateFilter("today")}
              >
                Today
              </button>
              <button
                className={`preset-tab ${dateFilter === "yesterday" ? "active" : ""}`}
                onClick={() => setDateFilter("yesterday")}
              >
                Yesterday
              </button>
              <button
                className={`preset-tab ${dateFilter === "this_week" ? "active" : ""}`}
                onClick={() => setDateFilter("this_week")}
              >
                This Week
              </button>
              <button
                className={`preset-tab ${dateFilter === "this_month" ? "active" : ""}`}
                onClick={() => setDateFilter("this_month")}
              >
                This Month
              </button>
              <button
                className={`preset-tab ${dateFilter === "last_month" ? "active" : ""}`}
                onClick={() => setDateFilter("last_month")}
              >
                Last Month
              </button>
              <button
                className={`preset-tab ${dateFilter === "this_quarter" ? "active" : ""}`}
                onClick={() => setDateFilter("this_quarter")}
              >
                This Quarter
              </button>
              <button
                className={`preset-tab ${dateFilter === "this_year" ? "active" : ""}`}
                onClick={() => setDateFilter("this_year")}
              >
                This Year
              </button>
              <button
                className={`preset-tab ${dateFilter === "custom" ? "active" : ""}`}
                onClick={() => setDateFilter("custom")}
              >
                Custom Range
              </button>
            </div>

            {/* Status & Mode Dropdowns */}
            <div className="filter-selects-group">
              <div className="select-pill">
                <Filter size={13} />
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                >
                  <option value="all">Status: All Invoices</option>
                  <option value="Paid">Status: Fully Paid</option>
                  <option value="Partially Paid">Status: Partially Paid</option>
                  <option value="Pending">Status: Pending / Unpaid</option>
                  <option value="Cancelled">Status: Cancelled</option>
                </select>
              </div>

              <div className="select-pill">
                <CreditCard size={13} />
                <select
                  value={paymentModeFilter}
                  onChange={(e) => setPaymentModeFilter(e.target.value)}
                >
                  <option value="all">Payment: All Modes</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI / Online</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Razorpay">Razorpay / Card</option>
                </select>
              </div>
            </div>
          </div>

          {/* Custom Date Form (visible if custom selected) */}
          {dateFilter === "custom" && (
            <form onSubmit={handleApplyCustomDates} className="custom-date-row">
              <div className="date-input-group">
                <label>From Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="date-input-group">
                <label>To Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="r-btn primary small">
                Apply Date Range
              </button>
            </form>
          )}
        </div>

        {/* 4 CORE KPI METRIC CARDS */}
        <div className="reports-kpi-grid">
          {/* 1. Total Sales */}
          <div className="kpi-box sales">
            <div className="kpi-top">
              <span className="kpi-label">TOTAL SALES (BILLED)</span>
              <div className="kpi-icon-wrap primary">
                <TrendingUp size={20} />
              </div>
            </div>
            <h2 className="kpi-number">₹{Number(s.totalSales || 0).toLocaleString("en-IN")}</h2>
            <div className="kpi-bottom-detail">
              <span>{s.totalInvoicesCount || 0} invoices issued in period</span>
              <span className="taxable-sub">Taxable: ₹{Number(s.taxableAmount || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* 2. Total Paid Amounts */}
          <div className="kpi-box paid">
            <div className="kpi-top">
              <span className="kpi-label">TOTAL PAID / COLLECTED</span>
              <div className="kpi-icon-wrap success">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <h2 className="kpi-number text-success">₹{Number(s.totalPaid || 0).toLocaleString("en-IN")}</h2>
            <div className="kpi-bottom-detail">
              <span className="efficiency-pill">{s.collectionEfficiency || 0}% Collected</span>
              <span>{s.paidCount || 0} paid in full</span>
            </div>
          </div>

          {/* 3. Pending Payment Balance */}
          <div className="kpi-box pending">
            <div className="kpi-top">
              <span className="kpi-label">PENDING BALANCE (AR)</span>
              <div className="kpi-icon-wrap danger">
                <Clock size={20} />
              </div>
            </div>
            <h2 className="kpi-number text-danger">₹{Number(s.totalPendingBalance || 0).toLocaleString("en-IN")}</h2>
            <div className="kpi-bottom-detail">
              <span>{s.unpaidCount || 0} unpaid + {s.partiallyPaidCount || 0} partial</span>
              <button
                className="kpi-link-btn"
                onClick={() => navigate("/admin/pending-invoices")}
              >
                View AR <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* 4. GST & Tax Collected */}
          <div className="kpi-box tax">
            <div className="kpi-top">
              <span className="kpi-label">TOTAL GST TAX COLLECTED</span>
              <div className="kpi-icon-wrap info">
                <Receipt size={20} />
              </div>
            </div>
            <h2 className="kpi-number">₹{Number(s.totalTax || 0).toLocaleString("en-IN")}</h2>
            <div className="kpi-bottom-detail tax-splits">
              <span>CGST: ₹{Number(s.cgstTotal || 0).toLocaleString("en-IN")}</span>
              <span>SGST: ₹{Number(s.sgstTotal || 0).toLocaleString("en-IN")}</span>
              <span>IGST: ₹{Number(s.igstTotal || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="reports-tabs-strip">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <BarChart3 size={15} />
            <span>Financial Overview & Aging</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "auditor" ? "active" : ""}`}
            onClick={() => setActiveTab("auditor")}
          >
            <ShieldCheck size={15} />
            <span>Auditor GST Register ({reportsData.auditorSalesRegister?.length || 0})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "skusales" ? "active" : ""}`}
            onClick={() => setActiveTab("skusales")}
          >
            <Package size={15} />
            <span>SKU Sales ({reportsData.skuSalesReport?.length || 0})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "bestsellers" ? "active" : ""}`}
            onClick={() => setActiveTab("bestsellers")}
          >
            <Award size={15} />
            <span>Best-Selling Products</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "datewise" ? "active" : ""}`}
            onClick={() => setActiveTab("datewise")}
          >
            <Calendar size={15} />
            <span>Date-Wise Invoice Reports ({reportsData.dateWiseReports?.length || 0})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            <CreditCard size={15} />
            <span>Billing Transactions Ledger ({filteredTransactions?.length || 0})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            <Building size={15} />
            <span>Top Client Accounts ({reportsData.topCustomers?.length || 0})</span>
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="reports-loading-state">
            <div className="r-spinner"></div>
            <p>Compiling financial and billing reports data...</p>
          </div>
        ) : (
          <>
            {/* ========================================================
                TAB 1: FINANCIAL OVERVIEW, AGING & PAYMENT MODES
               ======================================================== */}
            {activeTab === "overview" && (
              <div className="overview-tab-content">
                <div className="overview-grid-2">
                  {/* Left: Outstanding Aging Breakdown */}
                  <div className="overview-card">
                    <div className="card-header-row">
                      <div>
                        <h3>Pending Payment Aging Analysis</h3>
                        <p className="card-sub">Track balance aging to accelerate collections</p>
                      </div>
                      <span className="total-aging-pill">
                        Total AR: ₹{Number(s.totalPendingBalance || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="aging-brackets-list">
                      {/* Current */}
                      <div className="aging-bracket current">
                        <div className="bracket-info">
                          <span className="bracket-title">Current (Not Yet Due)</span>
                          <span className="bracket-count">{aging.current?.count || 0} invoice{aging.current?.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="bracket-amount">
                          ₹{Number(aging.current?.amount || 0).toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* 1 - 15 Days */}
                      <div className="aging-bracket warning-light">
                        <div className="bracket-info">
                          <span className="bracket-title">1 - 15 Days Overdue</span>
                          <span className="bracket-count">{aging.overdue1to15?.count || 0} invoice{aging.overdue1to15?.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="bracket-amount text-amber">
                          ₹{Number(aging.overdue1to15?.amount || 0).toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* 16 - 30 Days */}
                      <div className="aging-bracket warning-medium">
                        <div className="bracket-info">
                          <span className="bracket-title">16 - 30 Days Overdue</span>
                          <span className="bracket-count">{aging.overdue16to30?.count || 0} invoice{aging.overdue16to30?.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="bracket-amount text-orange">
                          ₹{Number(aging.overdue16to30?.amount || 0).toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* 31+ Days */}
                      <div className="aging-bracket danger">
                        <div className="bracket-info">
                          <span className="bracket-title">31+ Days Critical Overdue</span>
                          <span className="bracket-count">{aging.overdue31plus?.count || 0} invoice{aging.overdue31plus?.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="bracket-amount text-danger">
                          ₹{Number(aging.overdue31plus?.amount || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    <div className="card-footer-action">
                      <button
                        className="r-btn secondary small w-100"
                        onClick={() => navigate("/admin/pending-invoices")}
                      >
                        Open Pending Invoices & Send Payment Reminders
                      </button>
                    </div>
                  </div>

                  {/* Right: Payment Mode Summaries Breakdown */}
                  <div className="overview-card">
                    <div className="card-header-row">
                      <div>
                        <h3>Payment Collections by Mode</h3>
                        <p className="card-sub">Distribution of actual cash & bank receipts</p>
                      </div>
                      <span className="total-aging-pill success">
                        Collected: ₹{Number(s.totalPaid || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {reportsData.paymentModeBreakdown?.length === 0 ? (
                      <div className="empty-sub-card">
                        <CreditCard size={32} color="#94a3b8" />
                        <p>No payment collections recorded in this period.</p>
                      </div>
                    ) : (
                      <div className="payment-modes-list">
                        {reportsData.paymentModeBreakdown.map((pm, i) => (
                          <div key={i} className="payment-mode-item">
                            <div className="mode-left">
                              <span className="mode-badge">{pm.mode}</span>
                              <div className="mode-bar-track">
                                <div
                                  className="mode-bar-fill"
                                  style={{ width: `${Math.min(100, Math.max(4, pm.percentage))}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="mode-right">
                              <strong>₹{Number(pm.amount || 0).toLocaleString("en-IN")}</strong>
                              <span className="mode-pct">{pm.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="card-footer-action">
                      <button
                        className="r-btn secondary small w-100"
                        onClick={() => setActiveTab("transactions")}
                      >
                        View Full Transactions Audit Ledger
                      </button>
                    </div>
                  </div>
                </div>

                {/* Date-wise Quick Preview Strip */}
                <div className="overview-card mt-24">
                  <div className="card-header-row">
                    <div>
                      <h3>Recent Daily Billing Activity</h3>
                      <p className="card-sub">Sales billed vs. cash collected day-by-day</p>
                    </div>
                    <button
                      className="r-btn secondary small"
                      onClick={() => setActiveTab("datewise")}
                    >
                      View All Dates ({reportsData.dateWiseReports?.length || 0})
                    </button>
                  </div>

                  <div className="daily-bars-container">
                    {(reportsData.dateWiseReports || []).slice(0, 10).map((d, i) => {
                      const maxSales = Math.max(
                        ...reportsData.dateWiseReports.map((r) => r.totalSales || 0),
                        1000
                      );
                      const salesHeight = Math.max(12, Math.round(((d.totalSales || 0) / maxSales) * 100));
                      const paidHeight = Math.max(8, Math.round(((d.amountPaid || 0) / maxSales) * 100));

                      return (
                        <div
                          key={i}
                          className="daily-bar-column"
                          onClick={() => setSelectedDayReport(d)}
                          title={`${d.displayDate}: Sales ₹${Number(d.totalSales).toLocaleString("en-IN")}, Paid ₹${Number(d.amountPaid).toLocaleString("en-IN")}`}
                        >
                          <div className="bar-pair">
                            <div
                              className="bar-item sales"
                              style={{ height: `${salesHeight}%` }}
                            ></div>
                            <div
                              className="bar-item paid"
                              style={{ height: `${paidHeight}%` }}
                            ></div>
                          </div>
                          <span className="column-date-label">
                            {d.displayDate.split(" ")[0]} {d.displayDate.split(" ")[1]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-legend">
                    <span className="legend-item"><span className="legend-dot sales"></span> Daily Sales Billed</span>
                    <span className="legend-item"><span className="legend-dot paid"></span> Cash / Amount Paid</span>
                    <span className="legend-hint">Click any day column to view its invoice list</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB: AUDITOR GST SALES REGISTER (BUG-016)
               ======================================================== */}
            {activeTab === "auditor" && (
              <div className="auditor-tab-content">
                <div className="tab-actions-header">
                  <div>
                    <h3>Auditor-Ready Invoice & GST Sales Register (BUG-016)</h3>
                    <p className="section-desc">
                      Statutory date-wise invoice register with source order IDs, credit note linkage, CGST/SGST/IGST breakdown, and net adjusted sales.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button className="r-btn primary small" onClick={handleExportAuditorGSTReport}>
                      <FileSpreadsheet size={15} />
                      <span>Export Auditor GST CSV</span>
                    </button>
                    <button className="r-btn secondary small" onClick={handleExportCreditNotesRegisterCSV}>
                      <FileSpreadsheet size={15} />
                      <span>Export Credit Notes Register CSV</span>
                    </button>
                  </div>
                </div>

                {reportsData.auditorSalesRegister?.length === 0 ? (
                  <div className="empty-tab-state">
                    <FileText size={42} color="#cbd5e1" />
                    <h4>No Invoices Found</h4>
                    <p>No invoices were issued in the selected reporting period.</p>
                  </div>
                ) : (
                  <div className="table-responsive-card">
                    <table className="report-data-table">
                      <thead>
                        <tr>
                          <th>INVOICE # & DATE</th>
                          <th>ORDER # / CHANNEL</th>
                          <th>CUSTOMER & GSTIN</th>
                          <th>PLACE OF SUPPLY</th>
                          <th style={{ textAlign: "right" }}>TAXABLE</th>
                          <th style={{ textAlign: "right" }}>TAX SPLIT</th>
                          <th style={{ textAlign: "right" }}>GROSS</th>
                          <th style={{ textAlign: "right" }}>CREDITED (CN)</th>
                          <th style={{ textAlign: "right" }}>NET SALES</th>
                          <th style={{ textAlign: "center" }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.auditorSalesRegister.map((inv, idx) => (
                          <tr key={inv._id || idx}>
                            <td>
                              <strong>{inv.invoiceNumber}</strong>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "—"}
                              </div>
                            </td>
                            <td>
                              <div>{inv.sourceOrderNumber || "Direct"}</div>
                              <small style={{ color: "#64748b" }}>{inv.salesChannel || "Storefront"}</small>
                            </td>
                            <td>
                              <strong>{inv.customerName}</strong>
                              {inv.customerGstin && (
                                <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#0369a1" }}>
                                  {inv.customerGstin}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: "12px" }}>{inv.placeOfSupply || "33 - Tamil Nadu"}</span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              ₹{Number(inv.taxableSubtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: "right", fontSize: "11px", color: "#475569" }}>
                              {inv.isInterState ? (
                                <div>IGST: ₹{Number(inv.igstTotal || inv.totalTax || 0).toLocaleString("en-IN")}</div>
                              ) : (
                                <div>
                                  CGST: ₹{Number(inv.cgstTotal || 0).toLocaleString("en-IN")}<br />
                                  SGST: ₹{Number(inv.sgstTotal || 0).toLocaleString("en-IN")}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700" }}>
                              ₹{Number(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: "right", color: inv.totalCreditedGross > 0 ? "#dc2626" : "#64748b" }}>
                              {inv.totalCreditedGross > 0 ? (
                                <div>
                                  -₹{Number(inv.totalCreditedGross).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  <div style={{ fontSize: "10px", color: "#b91c1c" }}>
                                    {(inv.linkedCreditNoteNumbers || []).join(", ")}
                                  </div>
                                </div>
                              ) : "—"}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "800", color: "#0f172a" }}>
                              ₹{Number(inv.netGross !== undefined ? inv.netGross : inv.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`status-pill ${String(inv.documentStatus || "").toLowerCase().replace(/\s+/g, "-")}`}>
                                {inv.documentStatus || "Issued"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                TAB: SKU SALES QUANTITY REPORT (BUG-017)
               ======================================================== */}
            {activeTab === "skusales" && (
              <div className="skusales-tab-content">
                <div className="tab-actions-header">
                  <div>
                    <h3>SKU-Wise Sales Quantity Report (BUG-017)</h3>
                    <p className="section-desc">
                      Aggregated sales quantities by SKU with units credited via return credit notes and net turnover.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div className="sku-search-box" style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Filter by SKU or title..."
                        value={skuSearchTerm}
                        onChange={(e) => setSkuSearchTerm(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                      />
                    </div>
                    <button className="r-btn primary small" onClick={handleExportSkuSalesCSV}>
                      <FileSpreadsheet size={15} />
                      <span>Export SKU Sales CSV</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const rawList = reportsData.skuSalesReport || [];
                  const filtered = rawList.filter((item) => {
                    if (!skuSearchTerm.trim()) return true;
                    const q = skuSearchTerm.toLowerCase();
                    return (item.sku || "").toLowerCase().includes(q) || (item.name || "").toLowerCase().includes(q);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="empty-tab-state">
                        <Package size={42} color="#cbd5e1" />
                        <h4>No SKU Sales Records Found</h4>
                        <p>{rawList.length === 0 ? "No product line items sold in the selected period." : "No SKU matched your filter query."}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="table-responsive-card">
                      <table className="report-data-table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>PRODUCT TITLE</th>
                            <th style={{ textAlign: "center" }}>INVOICED UNITS</th>
                            <th style={{ textAlign: "center" }}>CREDITED / RETURNED</th>
                            <th style={{ textAlign: "center" }}>NET UNITS SOLD</th>
                            <th style={{ textAlign: "right" }}>INVOICED TAXABLE (₹)</th>
                            <th style={{ textAlign: "right" }}>CREDITED VALUE (₹)</th>
                            <th style={{ textAlign: "right" }}>NET SALES REVENUE (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item, idx) => (
                            <tr key={item.sku || idx}>
                              <td>
                                <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#0f172a", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                  {item.sku || "N/A"}
                                </span>
                              </td>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td style={{ textAlign: "center", color: "#475569" }}>
                                {item.invoicedQuantity || 0}
                              </td>
                              <td style={{ textAlign: "center", color: item.creditedQuantity > 0 ? "#dc2626" : "#64748b" }}>
                                {item.creditedQuantity > 0 ? `-${item.creditedQuantity}` : "0"}
                              </td>
                              <td style={{ textAlign: "center", fontWeight: "800", color: "#059669" }}>
                                {item.netQuantity || 0}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                ₹{Number(item.taxableSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: "right", color: item.creditedValue > 0 ? "#dc2626" : "#64748b" }}>
                                {item.creditedValue > 0 ? `-₹${Number(item.creditedValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹0.00"}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: "800", color: "#0f172a" }}>
                                ₹{Number(item.netSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========================================================
                TAB: BEST-SELLING PRODUCTS (BUG-018)
               ======================================================== */}
            {activeTab === "bestsellers" && (
              <div className="bestsellers-tab-content">
                <div className="tab-actions-header">
                  <div>
                    <h3>Best-Selling Products & Ranking (BUG-018)</h3>
                    <p className="section-desc">
                      Ranked performance net of returned units and credit notes. Toggle between Net Units Sold and Net Sales Revenue.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
                      <button
                        type="button"
                        className={`r-btn small ${bestsellerMetric === "qty" ? "primary" : ""}`}
                        style={{ border: "none", boxShadow: "none" }}
                        onClick={() => setBestsellerMetric("qty")}
                      >
                        Rank by Net Units
                      </button>
                      <button
                        type="button"
                        className={`r-btn small ${bestsellerMetric === "revenue" ? "primary" : ""}`}
                        style={{ border: "none", boxShadow: "none" }}
                        onClick={() => setBestsellerMetric("revenue")}
                      >
                        Rank by Net Revenue
                      </button>
                    </div>

                    <select
                      value={bestsellerLimit}
                      onChange={(e) => setBestsellerLimit(e.target.value === "all" ? "all" : Number(e.target.value))}
                      style={{ padding: "6px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                    >
                      <option value="10">Top 10 Products</option>
                      <option value="20">Top 20 Products</option>
                      <option value="all">All Products</option>
                    </select>

                    <button className="r-btn primary small" onClick={handleExportBestSellersCSV}>
                      <FileSpreadsheet size={15} />
                      <span>Export Best-Sellers CSV</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const rawList = bestsellerMetric === "qty"
                    ? (reportsData.topSellingProducts?.byQuantity || [])
                    : (reportsData.topSellingProducts?.byRevenue || []);
                  const list = bestsellerLimit === "all" ? rawList : rawList.slice(0, Number(bestsellerLimit) || 10);

                  if (list.length === 0) {
                    return (
                      <div className="empty-tab-state">
                        <Award size={42} color="#cbd5e1" />
                        <h4>No Best-Seller Data Found</h4>
                        <p>No sales activity recorded for this period to generate rankings.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="table-responsive-card">
                      <table className="report-data-table">
                        <thead>
                          <tr>
                            <th style={{ width: "80px", textAlign: "center" }}>RANK</th>
                            <th>SKU</th>
                            <th>PRODUCT TITLE</th>
                            <th style={{ textAlign: "center" }}>NET UNITS SOLD</th>
                            <th style={{ textAlign: "right" }}>NET REVENUE GENERATED (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((item, idx) => (
                            <tr key={item.sku || idx}>
                              <td style={{ textAlign: "center" }}>
                                <span style={{
                                  display: "inline-block",
                                  width: "24px",
                                  height: "24px",
                                  lineHeight: "24px",
                                  borderRadius: "50%",
                                  background: idx === 0 ? "#fef08a" : idx === 1 ? "#e2e8f0" : idx === 2 ? "#fed7aa" : "#f1f5f9",
                                  fontWeight: "800",
                                  color: "#0f172a",
                                  fontSize: "12px"
                                }}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#0f172a", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                  {item.sku || "N/A"}
                                </span>
                              </td>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td style={{ textAlign: "center", fontWeight: "700", color: bestsellerMetric === "qty" ? "#059669" : "#334155" }}>
                                {item.netQuantity || 0} units
                              </td>
                              <td style={{ textAlign: "right", fontWeight: "800", color: bestsellerMetric === "revenue" ? "#059669" : "#0f172a" }}>
                                ₹{Number(item.netSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========================================================
                TAB 2: DATE-WISE INVOICE REPORTS
               ======================================================== */}
            {activeTab === "datewise" && (
              <div className="datewise-tab-content">
                <div className="tab-actions-header">
                  <div>
                    <h3>Date-Wise Invoice & Sales Breakdown</h3>
                    <p className="section-desc">
                      Detailed calendar breakdown of invoices issued, revenue generated, payments received, and pending balances by day.
                    </p>
                  </div>
                  <button className="r-btn secondary small" onClick={handleExportDateWiseCSV}>
                    <Download size={14} />
                    <span>Export Date Table (CSV)</span>
                  </button>
                </div>

                {reportsData.dateWiseReports?.length === 0 ? (
                  <div className="reports-empty-box">
                    <Calendar size={44} color="#94a3b8" />
                    <h4>No Invoices in Selected Period</h4>
                    <p>Try broadening your date filter or clearing search filters to see daily reports.</p>
                  </div>
                ) : (
                  <div className="reports-table-wrapper">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>DATE</th>
                          <th style={{ textAlign: "center" }}>INVOICES</th>
                          <th style={{ textAlign: "right" }}>GROSS SALES</th>
                          <th style={{ textAlign: "right" }}>AMOUNT PAID</th>
                          <th style={{ textAlign: "right" }}>BALANCE DUE</th>
                          <th style={{ textAlign: "right" }}>TOTAL GST</th>
                          <th style={{ textAlign: "center" }}>STATUS</th>
                          <th style={{ textAlign: "center" }}>DETAILS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.dateWiseReports.map((d, i) => {
                          const balance = Number(d.balanceAmount || 0);
                          const isFullyCollected = balance <= 0;

                          return (
                            <tr key={i} className="datewise-row">
                              <td>
                                <strong className="date-strong">{d.displayDate}</strong>
                                <span className="date-sub">{d.date}</span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className="inv-count-pill">{d.invoiceCount || 0}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <strong className="sales-text">₹{Number(d.totalSales || 0).toLocaleString("en-IN")}</strong>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span className="paid-text">₹{Number(d.amountPaid || 0).toLocaleString("en-IN")}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {balance > 0 ? (
                                  <span className="balance-text danger">₹{balance.toLocaleString("en-IN")}</span>
                                ) : (
                                  <span className="balance-text zero">Cleared (₹0)</span>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span className="tax-text">₹{Number(d.taxAmount || 0).toLocaleString("en-IN")}</span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className={`status-pill ${isFullyCollected ? "paid" : "pending"}`}>
                                  {isFullyCollected ? "Collected" : "Pending AR"}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  className="view-day-btn"
                                  onClick={() => setSelectedDayReport(d)}
                                  title="View Invoices for this date"
                                >
                                  <Eye size={14} />
                                  <span>View ({d.invoiceCount})</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                TAB 3: BILLING TRANSACTIONS & AUDIT LEDGER
               ======================================================== */}
            {activeTab === "transactions" && (
              <div className="transactions-tab-content">
                <div className="tab-actions-header">
                  <div>
                    <h3>Billing Transactions & Audit Ledger</h3>
                    <p className="section-desc">
                      Chronological ledger of every payment transaction, payment mode, reference ID, and balance reconciliation.
                    </p>
                  </div>
                  <div className="trans-header-actions">
                    <div className="search-pill">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search reference, customer, invoice #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <button className="r-btn secondary small" onClick={handleExportTransactionsCSV}>
                      <Download size={14} />
                      <span>Export Ledger (CSV)</span>
                    </button>
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="reports-empty-box">
                    <CreditCard size={44} color="#94a3b8" />
                    <h4>No Transactions Found</h4>
                    <p>No billing transactions match your search and filter criteria.</p>
                  </div>
                ) : (
                  <div className="reports-table-wrapper">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>PAYMENT DATE</th>
                          <th>INVOICE NUMBER</th>
                          <th>CUSTOMER / ENTITY</th>
                          <th>PAYMENT MODE</th>
                          <th>REFERENCE / NOTES</th>
                          <th style={{ textAlign: "right" }}>AMOUNT PAID</th>
                          <th style={{ textAlign: "right" }}>BALANCE ON INVOICE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((t, i) => (
                          <tr key={i}>
                            <td>
                              <div className="cell-date">
                                <strong>
                                  {t.paymentDate ? new Date(t.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                                </strong>
                                <span className="cell-time">
                                  {t.paymentDate ? new Date(t.paymentDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="inv-badge">{t.invoiceNumber}</span>
                            </td>
                            <td>
                              <div className="cust-block">
                                <strong>{t.customerName}</strong>
                                {t.customerCompany && (
                                  <span className="company-sub">{t.customerCompany}</span>
                                )}
                                {t.customerPhone && (
                                  <span className="phone-sub">{t.customerPhone}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`mode-tag ${t.paymentMode ? t.paymentMode.toLowerCase().replace(/[^a-z]/g, "") : ""}`}>
                                {t.paymentMode || "Bank Transfer"}
                              </span>
                            </td>
                            <td>
                              <div className="ref-block">
                                <span className="ref-text">{t.reference || "Standard Payment"}</span>
                                {t.notes && <span className="notes-text">{t.notes}</span>}
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <strong className="paid-amount-large">
                                +₹{Number(t.amount || 0).toLocaleString("en-IN")}
                              </strong>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {Number(t.balanceRemaining || 0) > 0 ? (
                                <span className="balance-remaining danger">
                                  ₹{Number(t.balanceRemaining).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="balance-remaining success">₹0 (Paid)</span>
                              )}
                            </td>
                            <td>
                              <span className={`status-pill ${t.invoiceStatus === "Paid" ? "paid" : "pending"}`}>
                                {t.invoiceStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                TAB 4: TOP CUSTOMER ACCOUNTS
               ======================================================== */}
            {activeTab === "customers" && (
              <div className="customers-tab-content">
                <div className="tab-actions-header">
                  <div>
                    <h3>Top Accounts by Invoiced Volume</h3>
                    <p className="section-desc">
                      Client-level sales volume, total payments collected, and outstanding balances for the reporting period.
                    </p>
                  </div>
                  <button
                    className="r-btn secondary small"
                    onClick={() => navigate("/admin/customers")}
                  >
                    <span>Manage All Customers</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {reportsData.topCustomers?.length === 0 ? (
                  <div className="reports-empty-box">
                    <Building size={44} color="#94a3b8" />
                    <h4>No Customer Records</h4>
                    <p>No customer transactions in the selected period.</p>
                  </div>
                ) : (
                  <div className="reports-table-wrapper">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>CUSTOMER / COMPANY</th>
                          <th>CONTACT</th>
                          <th style={{ textAlign: "center" }}>INVOICES</th>
                          <th style={{ textAlign: "right" }}>TOTAL SALES</th>
                          <th style={{ textAlign: "right" }}>AMOUNT PAID</th>
                          <th style={{ textAlign: "right" }}>PENDING AR</th>
                          <th style={{ textAlign: "center" }}>RECOVERY %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.topCustomers.map((c, i) => {
                          const recovery =
                            c.totalSales > 0 ? Math.round((c.totalPaid / c.totalSales) * 100) : 100;

                          return (
                            <tr key={i}>
                              <td>
                                <div className="cust-block">
                                  <strong>{c.name}</strong>
                                  {c.company && <span className="company-sub">{c.company}</span>}
                                </div>
                              </td>
                              <td>{c.phone || "N/A"}</td>
                              <td style={{ textAlign: "center" }}>
                                <span className="inv-count-pill">{c.invoiceCount}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <strong>₹{Number(c.totalSales || 0).toLocaleString("en-IN")}</strong>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span className="paid-text">₹{Number(c.totalPaid || 0).toLocaleString("en-IN")}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {c.pendingBalance > 0 ? (
                                  <span className="balance-text danger">
                                    ₹{Number(c.pendingBalance).toLocaleString("en-IN")}
                                  </span>
                                ) : (
                                  <span className="balance-text zero">Cleared (₹0)</span>
                                )}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className={`recovery-badge ${recovery >= 80 ? "high" : recovery >= 50 ? "mid" : "low"}`}>
                                  {recovery}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* MODAL: DAY-SPECIFIC INVOICE DRILLDOWN */}
        {selectedDayReport && (
          <div className="modal-backdrop" onClick={() => setSelectedDayReport(null)}>
            <div className="day-drilldown-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">DATE REPORT DRILLDOWN</span>
                  <h2>Invoices on {selectedDayReport.displayDate}</h2>
                  <p className="modal-subtitle">
                    Sales: ₹{Number(selectedDayReport.totalSales || 0).toLocaleString("en-IN")} |
                    Paid: ₹{Number(selectedDayReport.amountPaid || 0).toLocaleString("en-IN")} |
                    Balance: ₹{Number(selectedDayReport.balanceAmount || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <button className="modal-close" onClick={() => setSelectedDayReport(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body p-0">
                <table className="drilldown-table">
                  <thead>
                    <tr>
                      <th>INVOICE #</th>
                      <th>CUSTOMER</th>
                      <th>PAYMENT MODE</th>
                      <th style={{ textAlign: "right" }}>TOTAL</th>
                      <th style={{ textAlign: "right" }}>PAID</th>
                      <th style={{ textAlign: "right" }}>BALANCE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDayReport.invoices?.map((inv, idx) => (
                      <tr key={idx}>
                        <td><strong>{inv.invoiceNumber}</strong></td>
                        <td>
                          <div>{inv.customerName}</div>
                          {inv.customerCompany && <small className="company-sub">{inv.customerCompany}</small>}
                        </td>
                        <td><span className="mode-tag">{inv.paymentMode}</span></td>
                        <td style={{ textAlign: "right" }}>₹{Number(inv.grandTotal || 0).toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right" }} className="paid-text">₹{Number(inv.amountPaid || 0).toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right" }} className={inv.balanceAmount > 0 ? "balance-text danger" : "balance-text zero"}>
                          ₹{Number(inv.balanceAmount || 0).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <span className={`status-pill ${inv.paymentStatus === "Paid" ? "paid" : "pending"}`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <button className="r-btn secondary small" onClick={() => setSelectedDayReport(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: MONTHLY BULK INVOICES PDF DOWNLOAD (BUG-015) */}
        {bulkPdfModalOpen && (
          <div className="modal-backdrop" onClick={() => setBulkPdfModalOpen(false)}>
            <div className="day-drilldown-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">DOCUMENT EXPORT (BUG-015)</span>
                  <h2 style={{ fontSize: "18px" }}>Monthly Bulk Invoices PDF</h2>
                  <p className="modal-subtitle">
                    Generate a merged sequential PDF bundle of all issued invoices for the selected month, complete with an auditor register summary sheet.
                  </p>
                </div>
                <button className="modal-close" onClick={() => setBulkPdfModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body" style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Select Month:
                    </label>
                    <select
                      value={bulkMonth}
                      onChange={(e) => setBulkMonth(Number(e.target.value))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    >
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Select Year:
                    </label>
                    <select
                      value={bulkYear}
                      onChange={(e) => setBulkYear(Number(e.target.value))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    >
                      {[2024, 2025, 2026, 2027].map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", fontSize: "12px", color: "#475569" }}>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                    Bundle Inclusions:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.6" }}>
                    <li>Page 1: Auditor-Ready Monthly Summary Sheet with totals breakdown</li>
                    <li>Subsequent Pages: All non-cancelled Tax Invoices with official vector styling</li>
                    <li>Single consolidated PDF download for accounting & GST filings</li>
                  </ul>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: "14px 20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="r-btn secondary small"
                  onClick={() => setBulkPdfModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="r-btn primary small"
                  onClick={handleDownloadMonthlyBulkPdf}
                  disabled={generatingBulkPdf}
                >
                  <Download size={14} />
                  <span>{generatingBulkPdf ? "Generating Multi-Page PDF..." : "Generate & Download PDF Bundle"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BillingReportsPage;
