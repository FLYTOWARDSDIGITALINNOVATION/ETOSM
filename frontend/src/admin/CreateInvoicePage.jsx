import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Download,
  Printer,
  Save,
  Check,
  Copy,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  Calendar,
  Percent,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  Package,
  RefreshCw,
  History,
  Eye,
  Filter,
  ShieldCheck,
  Tag
} from "lucide-react";
import { jsPDF } from "jspdf";
import AdminLayout from "./AdminLayout";
import "./CreateInvoicePage.css";

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

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // View tabs: "create" or "history"
  const [activeTab, setActiveTab] = useState("create");

  // Catalog products and customers from backend
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Invoices list (History tab)
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  // Product Picker Modal
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState("all");

  // Customer dropdown search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef(null);

  // Invoice Meta State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [placeOfSupply, setPlaceOfSupply] = useState("33 - Tamil Nadu");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [deductStock, setDeductStock] = useState(true);

  // Customer Details State
  const [customer, setCustomer] = useState({
    _id: "",
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    gstin: ""
  });

  // Invoice Line Items State
  const [items, setItems] = useState([
    {
      id: "item-1",
      productId: "",
      productRef: "",
      name: "",
      description: "",
      availableStock: null,
      quantity: 1,
      unitPrice: 0,
      discountType: "percent", // "percent" or "flat"
      discountValue: 0,
      gstPercent: 18
    }
  ]);

  // Overall Invoice Adjustments
  const [shippingCharges, setShippingCharges] = useState(0);
  const [overallDiscountType, setOverallDiscountType] = useState("percent");
  const [overallDiscountValue, setOverallDiscountValue] = useState(0);
  const [notes, setNotes] = useState(
    "1. Goods once sold will not be taken back or exchanged.\n2. Standard manufacturer warranty applies.\n3. Subject to Coimbatore, Tamil Nadu jurisdiction."
  );

  // Bank & Settlement Details
  const [bankDetails, setBankDetails] = useState({
    bankName: "State Bank of India",
    accountNumber: "38920192837",
    ifscCode: "SBIN0001234",
    branch: "Coimbatore Main Branch",
    upiId: "etosm@sbi"
  });

  // Toast / feedback message
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth & Initial Data Fetching
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
      return;
    }
    loadInitialData();
    generateInvoiceNumber();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingInitial(true);
      const [prodRes, custRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/products-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : []);
      }
    } catch (err) {
      console.error("Failed to load catalog/customers data:", err);
      showToast("Error loading catalog data", "error");
    } finally {
      setLoadingInitial(false);
    }
  };

  // Generate unique next invoice number
  const generateInvoiceNumber = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/next-number`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nextNumber) {
          setInvoiceNumber(data.nextNumber);
          return;
        }
      }
    } catch (e) {
      // Fallback local generator
    }
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`INV-${year}-${rand}`);
  };

  // Fetch Invoices History
  const fetchInvoicesHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_BASE_URL}/admin/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedInvoices(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch invoices history:", err);
      showToast("Could not load invoices history", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchInvoicesHistory();
    }
  }, [activeTab]);

  // Categories list for product picker
  const pickerCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered customers for search dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customers, customerSearch]);

  // Select customer from dropdown
  const handleSelectCustomer = (c) => {
    let fullAddr = c.address || (c.shippingAddress && c.shippingAddress !== "N/A" ? c.shippingAddress : "");
    if (c.city && !fullAddr.includes(c.city)) fullAddr += (fullAddr ? ", " : "") + c.city;
    if (c.pincode && !fullAddr.includes(c.pincode)) fullAddr += (fullAddr ? " - " : "") + c.pincode;

    setCustomer({
      _id: c._id || "",
      name: c.name || "",
      phone: c.phone && c.phone !== "N/A" ? c.phone : "",
      email: c.email || "",
      company: c.company || "",
      address: fullAddr,
      gstin: c.gstin || ""
    });
    setCustomerSearch(c.name || "");
    setCustomerDropdownOpen(false);
    showToast(`Customer "${c.name}" selected`);
  };

  const handleClearCustomer = () => {
    setCustomer({
      _id: "",
      name: "",
      phone: "",
      email: "",
      company: "",
      address: "",
      gstin: ""
    });
    setCustomerSearch("");
  };

  // Add line item from product picker
  const handleAddProductFromCatalog = (prod) => {
    const unitPrice = Number(prod.price) || 0;
    const gst = Number(prod.gstPercent) || 18;
    const prodId = prod.productId || (prod.sku ? `PRD-${prod.sku}` : `PRD-${prod._id.toString().slice(-5).toUpperCase()}`);

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prodId,
      productRef: prod._id,
      name: prod.name || "",
      description: prod.description || "",
      availableStock: Number(prod.stock) || 0,
      quantity: 1,
      unitPrice: unitPrice,
      discountType: "percent",
      discountValue: 0,
      gstPercent: gst
    };

    // Replace first empty item or append
    if (items.length === 1 && !items[0].name && items[0].unitPrice === 0) {
      setItems([newItem]);
    } else {
      setItems((prev) => [...prev, newItem]);
    }

    setProductPickerOpen(false);
    showToast(`Added "${prod.name}" to invoice`);
  };

  // Add blank / custom line item
  const handleAddBlankItem = () => {
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: "",
      productRef: "",
      name: "",
      description: "",
      availableStock: null,
      quantity: 1,
      unitPrice: 0,
      discountType: "percent",
      discountValue: 0,
      gstPercent: 18
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update line item
  const handleUpdateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Remove line item
  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      // Keep at least one blank row
      setItems([
        {
          id: `item-${Date.now()}`,
          productId: "",
          productRef: "",
          name: "",
          description: "",
          availableStock: null,
          quantity: 1,
          unitPrice: 0,
          discountType: "percent",
          discountValue: 0,
          gstPercent: 18
        }
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Inter-State detection (State code: 33 is Tamil Nadu)
  const isInterState = useMemo(() => {
    return !placeOfSupply.includes("33");
  }, [placeOfSupply]);

  // Compute Calculations for line items and totals
  const invoiceCalculations = useMemo(() => {
    let grossSubtotal = 0;
    let totalLineDiscount = 0;
    let taxableSubtotal = 0;
    let totalTax = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const computedItems = items.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const lineGross = qty * unitPrice;

      // Discount calculation
      let discAmount = 0;
      const discVal = Math.max(0, Number(item.discountValue) || 0);
      if (item.discountType === "percent") {
        discAmount = (lineGross * Math.min(100, discVal)) / 100;
      } else {
        discAmount = Math.min(lineGross, discVal);
      }

      const lineTaxable = Math.max(0, lineGross - discAmount);
      const gstRate = Math.max(0, Number(item.gstPercent) || 0);
      const lineGst = (lineTaxable * gstRate) / 100;

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (isInterState) {
        lineIgst = lineGst;
      } else {
        lineCgst = lineGst / 2;
        lineSgst = lineGst / 2;
      }

      const lineTotal = lineTaxable + lineGst;

      grossSubtotal += lineGross;
      totalLineDiscount += discAmount;
      taxableSubtotal += lineTaxable;
      totalTax += lineGst;
      cgstTotal += lineCgst;
      sgstTotal += lineSgst;
      igstTotal += lineIgst;

      return {
        ...item,
        quantity: qty,
        unitPrice: unitPrice,
        lineGross: Number(lineGross.toFixed(2)),
        discountAmount: Number(discAmount.toFixed(2)),
        taxableAmount: Number(lineTaxable.toFixed(2)),
        gstAmount: Number(lineGst.toFixed(2)),
        cgstAmount: Number(lineCgst.toFixed(2)),
        sgstAmount: Number(lineSgst.toFixed(2)),
        igstAmount: Number(lineIgst.toFixed(2)),
        totalAmount: Number(lineTotal.toFixed(2))
      };
    });

    // Overall extra discount
    let extraDiscountAmt = 0;
    const overVal = Math.max(0, Number(overallDiscountValue) || 0);
    if (overallDiscountType === "percent") {
      extraDiscountAmt = (taxableSubtotal * Math.min(100, overVal)) / 100;
    } else {
      extraDiscountAmt = Math.min(taxableSubtotal, overVal);
    }

    const netTaxable = Math.max(0, taxableSubtotal - extraDiscountAmt);
    const shipping = Math.max(0, Number(shippingCharges) || 0);
    const unroundedTotal = netTaxable + totalTax + shipping;
    const roundedGrandTotal = Math.round(unroundedTotal);
    const roundOff = Number((roundedGrandTotal - unroundedTotal).toFixed(2));

    return {
      items: computedItems,
      grossSubtotal: Number(grossSubtotal.toFixed(2)),
      totalLineDiscount: Number(totalLineDiscount.toFixed(2)),
      extraDiscountAmt: Number(extraDiscountAmt.toFixed(2)),
      totalDiscount: Number((totalLineDiscount + extraDiscountAmt).toFixed(2)),
      taxableSubtotal: Number(netTaxable.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      shippingCharges: shipping,
      roundOff: roundOff,
      grandTotal: roundedGrandTotal,
      amountInWords: numberToWordsINR(roundedGrandTotal)
    };
  }, [items, isInterState, overallDiscountType, overallDiscountValue, shippingCharges]);

  // Save Invoice to Database
  const handleSaveInvoice = async (quiet = false) => {
    if (!customer.name.trim()) {
      showToast("Please enter or select a customer name", "error");
      return null;
    }
    if (items.length === 0 || !items.some((i) => i.name.trim() !== "")) {
      showToast("Please add at least one product line item", "error");
      return null;
    }

    setSavingInvoice(true);
    try {
      const payload = {
        invoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        customerId: customer._id || "",
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerCompany: customer.company,
        customerAddress: customer.address,
        customerGstin: customer.gstin,
        placeOfSupply: placeOfSupply,
        paymentMode: paymentMode,
        paymentStatus: paymentStatus,
        amountPaid: paymentStatus === "Partially Paid" ? (Number(amountPaidInput) || 0) : (paymentStatus === "Paid" ? invoiceCalculations.grandTotal : 0),
        balanceAmount: paymentStatus === "Partially Paid" ? Math.max(0, invoiceCalculations.grandTotal - (Number(amountPaidInput) || 0)) : (paymentStatus === "Paid" ? 0 : invoiceCalculations.grandTotal),
        deductStock: deductStock,
        items: invoiceCalculations.items.map((i) => ({
          productId: i.productId,
          productRef: i.productRef,
          name: i.name || "Product Item",
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountType === "percent" ? i.discountValue : 0,
          discountAmount: i.discountAmount,
          taxableAmount: i.taxableAmount,
          gstPercent: i.gstPercent,
          cgstAmount: i.cgstAmount,
          sgstAmount: i.sgstAmount,
          igstAmount: i.igstAmount,
          totalAmount: i.totalAmount
        })),
        grossSubtotal: invoiceCalculations.grossSubtotal,
        totalDiscount: invoiceCalculations.totalDiscount,
        invoiceDiscountPercent: overallDiscountType === "percent" ? overallDiscountValue : 0,
        invoiceDiscountAmount: invoiceCalculations.extraDiscountAmt,
        taxableSubtotal: invoiceCalculations.taxableSubtotal,
        totalTax: invoiceCalculations.totalTax,
        isInterState: isInterState,
        cgstTotal: invoiceCalculations.cgstTotal,
        sgstTotal: invoiceCalculations.sgstTotal,
        igstTotal: invoiceCalculations.igstTotal,
        shippingCharges: invoiceCalculations.shippingCharges,
        roundOff: invoiceCalculations.roundOff,
        grandTotal: invoiceCalculations.grandTotal,
        notes: notes,
        bankDetails: bankDetails
      };

      const res = await fetch(`${API_BASE_URL}/admin/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save invoice");
      }

      if (!quiet) {
        showToast(`Invoice ${data.invoiceNumber} saved successfully!`);
      }
      return data;
    } catch (err) {
      console.error("Save invoice error:", err);
      showToast(err.message || "Failed to save invoice", "error");
      return null;
    } finally {
      setSavingInvoice(false);
    }
  };

  // Generate and Download PDF File
  const handleDownloadPdf = async (customInvoiceData = null) => {
    const data = customInvoiceData || {
      invoiceNumber,
      invoiceDate,
      dueDate,
      placeOfSupply,
      paymentMode,
      paymentStatus,
      customer,
      items: invoiceCalculations.items,
      grossSubtotal: invoiceCalculations.grossSubtotal,
      totalDiscount: invoiceCalculations.totalDiscount,
      taxableSubtotal: invoiceCalculations.taxableSubtotal,
      totalTax: invoiceCalculations.totalTax,
      isInterState,
      cgstTotal: invoiceCalculations.cgstTotal,
      sgstTotal: invoiceCalculations.sgstTotal,
      igstTotal: invoiceCalculations.igstTotal,
      shippingCharges: invoiceCalculations.shippingCharges,
      roundOff: invoiceCalculations.roundOff,
      grandTotal: invoiceCalculations.grandTotal,
      amountInWords: invoiceCalculations.amountInWords,
      notes,
      bankDetails
    };

    if (!data.customer?.name?.trim() && !customInvoiceData) {
      showToast("Please enter customer name before generating PDF", "error");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const primaryRed = [227, 0, 15]; // ETOSM Red
      const slateDark = [15, 23, 42]; // Slate 900
      const slateMuted = [100, 116, 139]; // Slate 500
      const borderGray = [226, 232, 240];

      let y = 14;

      // 1. Top Header Banner
      doc.setFillColor(...slateDark);
      doc.rect(14, y, 182, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(15);
      doc.text("ETOSM BATTERY & ELECTRONICS", 20, y + 9);

      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "normal");
      doc.text("Lithium Battery Packs • BMS Boards • EV Electronics • Industrial Solutions", 20, y + 15);
      doc.text("GSTIN: 33AAAAE1234A1Z5 | Phone: +91 98765 43210 | Email: billing@etosm.com", 20, y + 20);

      // Title Ribbon: TAX INVOICE
      doc.setFillColor(...primaryRed);
      doc.rect(136, y + 4, 54, 16, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TAX INVOICE", 145, y + 14);

      y += 30;

      // 2. Invoice Meta & Customer Details Grid
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);

      // Customer Details Box (Left)
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 92, 36, "FD");

      doc.setTextColor(...slateDark);
      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.text("BILLED TO / CUSTOMER DETAILS:", 18, y + 6);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Name: ${data.customer?.name || "N/A"}`, 18, y + 12);
      doc.text(`Phone: ${data.customer?.phone || "N/A"}`, 18, y + 17);
      doc.text(`Email: ${data.customer?.email || "N/A"}`, 18, y + 22);
      if (data.customer?.company) {
        doc.text(`Company: ${data.customer.company}`, 18, y + 27);
      }
      if (data.customer?.gstin) {
        doc.text(`GSTIN: ${data.customer.gstin}`, 18, y + 32);
      } else if (data.customer?.address) {
        const addrSnippet = data.customer.address.length > 45 ? data.customer.address.substring(0, 42) + "..." : data.customer.address;
        doc.text(`Address: ${addrSnippet}`, 18, y + 32);
      }

      // Invoice Details Box (Right)
      doc.rect(110, y, 86, 36, "FD");
      doc.setTextColor(...slateDark);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("INVOICE DETAILS:", 114, y + 6);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Invoice No: ${data.invoiceNumber || "N/A"}`, 114, y + 12);
      doc.text(`Invoice Date: ${data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString("en-IN") : "N/A"}`, 114, y + 17);
      doc.text(`Due Date: ${data.dueDate ? new Date(data.dueDate).toLocaleDateString("en-IN") : "N/A"}`, 114, y + 22);
      doc.text(`Place of Supply: ${data.placeOfSupply || "Tamil Nadu (33)"}`, 114, y + 27);
      doc.text(`Payment: ${data.paymentMode || "Bank"} (${data.paymentStatus || "Paid"})`, 114, y + 32);

      y += 42;

      // 3. Itemized Table
      // Table Header
      doc.setFillColor(...slateDark);
      doc.rect(14, y, 182, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);

      doc.text("#", 17, y + 5.5);
      doc.text("ITEM DESCRIPTION & CODE", 26, y + 5.5);
      doc.text("QTY", 102, y + 5.5);
      doc.text("RATE (₹)", 116, y + 5.5);
      doc.text("DISC", 134, y + 5.5);
      doc.text("TAXABLE", 148, y + 5.5);
      doc.text("GST", 168, y + 5.5);
      doc.text("TOTAL (₹)", 180, y + 5.5);

      y += 8;

      // Table Rows
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      const printableItems = data.items || [];
      printableItems.forEach((item, index) => {
        if (y > 240) {
          doc.addPage();
          y = 16;
        }

        // Alternating row background
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 9, "F");
        }

        doc.setDrawColor(...borderGray);
        doc.line(14, y + 9, 196, y + 9);

        doc.text(String(index + 1), 17, y + 6);

        // Product Name & Product ID snippet
        const nameText = item.name ? (item.name.length > 36 ? item.name.substring(0, 33) + "..." : item.name) : "Item";
        const idBadge = item.productId ? ` [${item.productId}]` : "";
        doc.text(`${nameText}${idBadge}`, 26, y + 6);

        doc.text(String(item.quantity || 1), 104, y + 6);
        doc.text(Number(item.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 116, y + 6);
        doc.text(Number(item.discountAmount || 0) > 0 ? `₹${Number(item.discountAmount).toFixed(0)}` : "-", 134, y + 6);
        doc.text(Number(item.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 148, y + 6);
        doc.text(`${item.gstPercent || 18}%`, 168, y + 6);
        doc.text(Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 180, y + 6);

        y += 9;
      });

      y += 4;

      // 4. Totals Summary & Bank Information
      if (y > 215) {
        doc.addPage();
        y = 16;
      }

      // Bank Details Card (Left)
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 96, 38, "FD");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...slateDark);
      doc.text("BANK & PAYMENT SETTLEMENT DETAILS:", 18, y + 6);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Bank Name: ${data.bankDetails?.bankName || "State Bank of India"}`, 18, y + 12);
      doc.text(`A/C Number: ${data.bankDetails?.accountNumber || "38920192837"}`, 18, y + 17);
      doc.text(`IFSC Code: ${data.bankDetails?.ifscCode || "SBIN0001234"}`, 18, y + 22);
      doc.text(`Branch: ${data.bankDetails?.branch || "Coimbatore Branch"}`, 18, y + 27);
      doc.text(`UPI VPA: ${data.bankDetails?.upiId || "etosm@sbi"}`, 18, y + 32);

      // Calculations Breakdown Box (Right)
      doc.rect(114, y, 82, 38, "FD");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const rX = 118;
      const valX = 192;

      doc.text("Gross Subtotal:", rX, y + 6);
      doc.text(`₹${Number(data.grossSubtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, y + 6, { align: "right" });

      if (Number(data.totalDiscount || 0) > 0) {
        doc.text("Total Discount:", rX, y + 11);
        doc.text(`- ₹${Number(data.totalDiscount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, y + 11, { align: "right" });
      }

      doc.text("Taxable Value:", rX, y + 16);
      doc.text(`₹${Number(data.taxableSubtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, y + 16, { align: "right" });

      if (data.isInterState) {
        doc.text("IGST (18%):", rX, y + 21);
        doc.text(`₹${Number(data.igstTotal || data.totalTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, y + 21, { align: "right" });
      } else {
        doc.text("CGST (9%) + SGST (9%):", rX, y + 21);
        doc.text(`₹${Number(data.totalTax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, y + 21, { align: "right" });
      }

      if (Number(data.shippingCharges || 0) > 0) {
        doc.text("Shipping & Freight:", rX, y + 26);
        doc.text(`₹${Number(data.shippingCharges).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, y + 26, { align: "right" });
      }

      // Grand Total Highlight
      doc.setFillColor(...slateDark);
      doc.rect(114, y + 29, 82, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("GRAND TOTAL:", rX, y + 35);
      doc.text(`₹${Number(data.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, valX, y + 35, { align: "right" });

      y += 44;

      // 5. Amount in Words Box
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 8, "F");
      doc.setTextColor(...slateDark);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      const words = data.amountInWords || numberToWordsINR(data.grandTotal || 0);
      doc.text(`Amount in Words: ${words}`, 18, y + 5.5);

      y += 14;

      // 6. Terms & Signature
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont("Helvetica", "bold");
      doc.text("TERMS & CONDITIONS:", 14, y);
      doc.setFont("Helvetica", "normal");
      doc.text("1. Goods once sold will not be taken back or exchanged.", 14, y + 4);
      doc.text("2. Warranty valid only on production of this original invoice and serial numbers.", 14, y + 8);
      doc.text("3. Subject to Coimbatore, Tamil Nadu jurisdiction.", 14, y + 12);

      // Signatory
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(...slateDark);
      doc.text("For ETOSM BATTERY & ELECTRONICS", 136, y);
      doc.setFont("Helvetica", "normal");
      doc.text("Authorized Signatory", 146, y + 14);

      // Save PDF file to browser
      const cleanInvNum = (data.invoiceNumber || "Invoice").replace(/[/\\?%*:|"<>]/g, "-");
      doc.save(`Invoice_${cleanInvNum}.pdf`);
      showToast(`Invoice PDF downloaded successfully!`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF document", "error");
    }
  };

  // Reset to New Blank Invoice
  const handleResetInvoice = () => {
    if (window.confirm("Start a new invoice? Unsaved changes will be cleared.")) {
      handleClearCustomer();
      setItems([
        {
          id: `item-${Date.now()}`,
          productId: "",
          productRef: "",
          name: "",
          description: "",
          availableStock: null,
          quantity: 1,
          unitPrice: 0,
          discountType: "percent",
          discountValue: 0,
          gstPercent: 18
        }
      ]);
      setShippingCharges(0);
      setOverallDiscountValue(0);
      generateInvoiceNumber();
      showToast("New invoice initialized");
    }
  };

  // Delete saved invoice from history
  const handleDeleteInvoice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedInvoices((prev) => prev.filter((inv) => inv._id !== id));
        showToast("Invoice deleted from archive");
      }
    } catch (err) {
      console.error("Delete invoice error:", err);
      showToast("Failed to delete invoice", "error");
    }
  };

  // Filtered History Invoices
  const filteredHistoryInvoices = useMemo(() => {
    return savedInvoices.filter((inv) => {
      const matchesStatus = historyStatusFilter === "all" || inv.paymentStatus === historyStatusFilter;
      if (!historySearch.trim()) return matchesStatus;
      const q = historySearch.toLowerCase();
      const matchesSearch =
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerEmail && inv.customerEmail.toLowerCase().includes(q)) ||
        (inv.customerPhone && inv.customerPhone.includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [savedInvoices, historyStatusFilter, historySearch]);

  return (
    <AdminLayout>
      <div className="inv-container">
        {/* Toast Feedback */}
        {toast && (
          <div className={`inv-toast ${toast.type}`}>
            {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="inv-header">
          <div className="inv-header-left">
            <span className="inv-module-tag">
              <ShieldCheck size={12} /> Admin Module 2 • Invoicing
            </span>
            <h1>2. Create Invoice</h1>
            <p>
              Select customers, add catalog products, adjust quantities, prices, discounts, and
              automatically generate official tax-compliant invoices and downloadable vector PDFs.
            </p>
          </div>

          <div className="inv-header-actions">
            {activeTab === "create" ? (
              <>
                <button
                  className="inv-btn inv-btn-secondary"
                  onClick={() => setActiveTab("history")}
                  title="View saved invoices history"
                >
                  <History size={15} /> All Invoices
                </button>
                <button
                  className="inv-btn inv-btn-secondary"
                  onClick={handleResetInvoice}
                  title="Clear form and create new"
                >
                  <RefreshCw size={15} /> New
                </button>
                <button
                  className="inv-btn inv-btn-secondary"
                  onClick={() => handleSaveInvoice()}
                  disabled={savingInvoice}
                >
                  <Save size={15} /> {savingInvoice ? "Saving..." : "Save Invoice"}
                </button>
                <button
                  className="inv-btn inv-btn-primary"
                  onClick={() => handleDownloadPdf()}
                >
                  <Download size={15} /> Download PDF
                </button>
              </>
            ) : (
              <button
                className="inv-btn inv-btn-primary"
                onClick={() => setActiveTab("create")}
              >
                <Plus size={15} /> Create New Invoice
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            TAB 1: CREATE INVOICE FORM
            ========================================================================= */}
        {activeTab === "create" && (
          <div className="inv-form-layout">
            {/* Top Bar: Invoice Meta Information */}
            <div className="inv-card inv-meta-card">
              <div className="inv-meta-grid">
                <div className="inv-meta-field">
                  <label>Invoice Number</label>
                  <div className="inv-input-with-action">
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-2026-0001"
                      className="inv-mono-input"
                    />
                    <button
                      type="button"
                      className="inv-icon-action"
                      onClick={generateInvoiceNumber}
                      title="Auto-generate next invoice number"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                <div className="inv-meta-field">
                  <label>Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>

                <div className="inv-meta-field">
                  <label>Payment Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="inv-meta-field">
                  <label>Place of Supply (State)</label>
                  <select
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                  >
                    <option value="33 - Tamil Nadu">33 - Tamil Nadu (CGST + SGST)</option>
                    <option value="29 - Karnataka">29 - Karnataka (IGST)</option>
                    <option value="32 - Kerala">32 - Kerala (IGST)</option>
                    <option value="37 - Andhra Pradesh">37 - Andhra Pradesh (IGST)</option>
                    <option value="36 - Telangana">36 - Telangana (IGST)</option>
                    <option value="27 - Maharashtra">27 - Maharashtra (IGST)</option>
                    <option value="07 - Delhi">07 - Delhi (IGST)</option>
                    <option value="99 - Other State">Other Inter-State (IGST)</option>
                  </select>
                </div>

                <div className="inv-meta-field">
                  <label>Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI / QR">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash On Delivery / Counter</option>
                    <option value="Razorpay">Razorpay Online Gateway</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>

                <div className="inv-meta-field">
                  <label>Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className={`status-select ${paymentStatus.toLowerCase()}`}
                  >
                    <option value="Paid">🟢 Paid in Full</option>
                    <option value="Pending">🟡 Pending Settlement</option>
                    <option value="Partially Paid">🟠 Partially Paid</option>
                    <option value="Cancelled">🔴 Cancelled</option>
                  </select>
                </div>

                {paymentStatus === "Partially Paid" && (
                  <div className="inv-meta-field">
                    <label>Amount Paid So Far (₹)</label>
                    <input
                      type="number"
                      min="0"
                      max={invoiceCalculations.grandTotal}
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      placeholder="e.g. 5000"
                    />
                    {amountPaidInput && (
                      <span style={{ fontSize: "0.78rem", color: "#e3000f", marginTop: 4, display: "block" }}>
                        Outstanding Balance: ₹{(Math.max(0, invoiceCalculations.grandTotal - Number(amountPaidInput))).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Selection Section */}
            <div className="inv-card inv-customer-card">
              <div className="inv-card-header">
                <div className="inv-card-title">
                  <User size={18} color="#e3000f" />
                  <h3>Customer Information</h3>
                  <span className="inv-tag">Step 1: Select or enter customer</span>
                </div>

                {customer.name && (
                  <button
                    className="inv-btn-text"
                    onClick={handleClearCustomer}
                    title="Clear customer details"
                  >
                    <X size={14} /> Clear Selection
                  </button>
                )}
              </div>

              {/* Customer Searchable Picker Dropdown */}
              <div className="inv-customer-search-wrap" ref={customerDropdownRef}>
                <div className="inv-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search existing customer by Name, Phone, or Email to auto-fill..."
                    value={customerSearch}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerDropdownOpen(true);
                      setCustomer((prev) => ({ ...prev, name: e.target.value }));
                    }}
                  />
                  {customerSearch && (
                    <button
                      className="inv-search-clear"
                      onClick={() => {
                        setCustomerSearch("");
                        setCustomerDropdownOpen(false);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {customerDropdownOpen && (
                  <div className="inv-customer-dropdown">
                    <div className="inv-customer-dropdown-header">
                      <span>Registered & Past Order Customers ({filteredCustomers.length})</span>
                      <button
                        className="inv-close-drop"
                        onClick={() => setCustomerDropdownOpen(false)}
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {filteredCustomers.length === 0 ? (
                      <div className="inv-dropdown-empty">
                        No customer found matching "{customerSearch}". You can type manual details below.
                      </div>
                    ) : (
                      <div className="inv-dropdown-list">
                        {filteredCustomers.map((c, i) => (
                          <div
                            key={c._id || i}
                            className="inv-dropdown-item"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <div className="inv-cust-avatar">
                              {(c.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div className="inv-cust-info">
                              <div className="inv-cust-name-row">
                                <strong>{c.name || "Customer"}</strong>
                                {c.orderCount > 0 && (
                                  <span className="order-pill">{c.orderCount} orders</span>
                                )}
                              </div>
                              <div className="inv-cust-sub">
                                {c.phone && c.phone !== "N/A" && <span>📞 {c.phone}</span>}
                                {c.email && <span>✉️ {c.email}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Inputs Form Grid */}
              <div className="inv-customer-fields-grid">
                <div className="inv-field">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    placeholder="Full name or Business contact"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    required
                  />
                </div>

                <div className="inv-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </div>

                <div className="inv-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </div>

                <div className="inv-field">
                  <label>Company / Firm Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Green Energy Systems Pvt Ltd"
                    value={customer.company}
                    onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                  />
                </div>

                <div className="inv-field">
                  <label>GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAE1234A1Z5"
                    value={customer.gstin}
                    onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })}
                    className="inv-mono-input"
                  />
                </div>

                <div className="inv-field inv-field-full">
                  <label>Billing & Shipping Address</label>
                  <input
                    type="text"
                    placeholder="Door No, Street name, City, Pincode"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="inv-card inv-items-card">
              <div className="inv-card-header">
                <div className="inv-card-title">
                  <Package size={18} color="#e3000f" />
                  <h3>Invoice Line Items</h3>
                  <span className="inv-tag">Step 2: Add products, edit qty, price & discounts</span>
                </div>

                <div className="inv-card-header-actions">
                  <button
                    className="inv-btn inv-btn-secondary"
                    onClick={() => setProductPickerOpen(true)}
                  >
                    <Plus size={14} /> Add from Catalog ({products.length})
                  </button>
                  <button
                    className="inv-btn inv-btn-secondary"
                    onClick={handleAddBlankItem}
                  >
                    <Plus size={14} /> Add Custom Item
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="inv-table-responsive">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th style={{ width: "38px" }}>#</th>
                      <th style={{ minWidth: "220px" }}>Product Item & Details</th>
                      <th style={{ width: "105px" }}>Quantity</th>
                      <th style={{ width: "120px" }}>Unit Price (₹)</th>
                      <th style={{ width: "140px" }}>Discount</th>
                      <th style={{ width: "115px" }}>Taxable (₹)</th>
                      <th style={{ width: "110px" }}>GST Rate</th>
                      <th style={{ width: "125px" }}>Line Total (₹)</th>
                      <th style={{ width: "45px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceCalculations.items.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="inv-row-idx">{index + 1}</td>

                        {/* Product Name & Details */}
                        <td>
                          <div className="inv-item-name-cell">
                            <input
                              type="text"
                              className="inv-item-input name"
                              placeholder="Product name or description..."
                              value={item.name}
                              onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                            />

                            <div className="inv-item-meta-row">
                              {item.productId && (
                                <span className="inv-prod-id-pill">
                                  {item.productId}
                                </span>
                              )}
                              {item.availableStock !== null && (
                                <span
                                  className={`inv-stock-pill ${
                                    item.quantity > item.availableStock ? "exceeded" : ""
                                  }`}
                                  title={
                                    item.quantity > item.availableStock
                                      ? "Quantity exceeds available in-stock count!"
                                      : "Available catalog stock"
                                  }
                                >
                                  Stock: {item.availableStock}
                                </span>
                              )}
                              <input
                                type="text"
                                className="inv-item-desc-input"
                                placeholder="Specs / remarks..."
                                value={item.description || ""}
                                onChange={(e) =>
                                  handleUpdateItem(index, "description", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td>
                          <div className="inv-qty-control">
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() =>
                                handleUpdateItem(
                                  index,
                                  "quantity",
                                  Math.max(1, (Number(item.quantity) || 1) - 1)
                                )
                              }
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              className="qty-input"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(
                                  index,
                                  "quantity",
                                  Math.max(1, Number(e.target.value) || 1)
                                )
                              }
                            />
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() =>
                                handleUpdateItem(
                                  index,
                                  "quantity",
                                  (Number(item.quantity) || 1) + 1
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td>
                          <div className="inv-price-input-wrap">
                            <span className="currency-prefix">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="inv-item-input price"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItem(index, "unitPrice", e.target.value)
                              }
                            />
                          </div>
                        </td>

                        {/* Discount */}
                        <td>
                          <div className="inv-disc-control">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="disc-input"
                              placeholder="0"
                              value={item.discountValue || ""}
                              onChange={(e) =>
                                handleUpdateItem(index, "discountValue", e.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="disc-toggle-btn"
                              onClick={() =>
                                handleUpdateItem(
                                  index,
                                  "discountType",
                                  item.discountType === "percent" ? "flat" : "percent"
                                )
                              }
                              title="Toggle between Percentage (%) and Flat Amount (₹)"
                            >
                              {item.discountType === "percent" ? "%" : "₹"}
                            </button>
                          </div>
                          {item.discountAmount > 0 && (
                            <span className="inv-disc-sub">
                              - ₹{item.discountAmount.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Taxable Amount */}
                        <td>
                          <span className="inv-taxable-val">
                            ₹{item.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* GST Rate */}
                        <td>
                          <select
                            className="inv-item-select gst"
                            value={item.gstPercent}
                            onChange={(e) =>
                              handleUpdateItem(index, "gstPercent", Number(e.target.value))
                            }
                          >
                            <option value="0">0% GST</option>
                            <option value="5">5% GST</option>
                            <option value="12">12% GST</option>
                            <option value="18">18% Standard</option>
                            <option value="28">28% High</option>
                          </select>
                          <span className="inv-gst-sub">
                            + ₹{item.gstAmount.toFixed(2)}
                          </span>
                        </td>

                        {/* Line Total */}
                        <td>
                          <span className="inv-line-total">
                            ₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Delete Row */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="inv-row-delete"
                            onClick={() => handleRemoveItem(index)}
                            title="Remove this line item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add row footer */}
              <div className="inv-table-footer">
                <button
                  type="button"
                  className="inv-add-row-btn"
                  onClick={handleAddBlankItem}
                >
                  <Plus size={14} /> Add Another Line Item
                </button>
              </div>
            </div>

            {/* Bottom Calculations & Settings Grid */}
            <div className="inv-bottom-grid">
              {/* Left Column: Settlement & Terms */}
              <div className="inv-card inv-terms-card">
                <div className="inv-card-title" style={{ marginBottom: "12px" }}>
                  <CreditCard size={18} color="#e3000f" />
                  <h3>Payment Settlement & Bank Info</h3>
                </div>

                <div className="inv-bank-grid">
                  <div className="inv-field">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    />
                  </div>

                  <div className="inv-field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      className="inv-mono-input"
                    />
                  </div>

                  <div className="inv-field">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      value={bankDetails.ifscCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                      className="inv-mono-input"
                    />
                  </div>

                  <div className="inv-field">
                    <label>UPI ID (VPA)</label>
                    <input
                      type="text"
                      value={bankDetails.upiId}
                      onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                      className="inv-mono-input"
                    />
                  </div>
                </div>

                <div className="inv-field" style={{ marginTop: "12px" }}>
                  <label>Terms & Conditions / Customer Notes</label>
                  <textarea
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter warranty and payment terms..."
                  ></textarea>
                </div>

                {/* Stock Deduction Checkbox */}
                <div className="inv-stock-deduct-option">
                  <label className="inv-checkbox-label">
                    <input
                      type="checkbox"
                      checked={deductStock}
                      onChange={(e) => setDeductStock(e.target.checked)}
                    />
                    <span>
                      <strong>Synchronize Inventory:</strong> Automatically deduct product stock
                      upon saving this invoice.
                    </span>
                  </label>
                </div>
              </div>

              {/* Right Column: Calculations Summary */}
              <div className="inv-card inv-summary-card">
                <div className="inv-card-title" style={{ marginBottom: "16px" }}>
                  <IndianRupee size={18} color="#e3000f" />
                  <h3>Automatic Calculations</h3>
                </div>

                <div className="inv-calc-table">
                  <div className="inv-calc-row">
                    <span>Gross Item Subtotal:</span>
                    <strong>₹{invoiceCalculations.grossSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                  </div>

                  {invoiceCalculations.totalLineDiscount > 0 && (
                    <div className="inv-calc-row discount">
                      <span>Item-Level Discounts:</span>
                      <span>- ₹{invoiceCalculations.totalLineDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {/* Extra Invoice Discount */}
                  <div className="inv-calc-row extra-disc">
                    <div className="extra-disc-label">
                      <span>Invoice Discount:</span>
                      <div className="extra-disc-inputs">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={overallDiscountValue || ""}
                          onChange={(e) => setOverallDiscountValue(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setOverallDiscountType(
                              overallDiscountType === "percent" ? "flat" : "percent"
                            )
                          }
                        >
                          {overallDiscountType === "percent" ? "%" : "₹"}
                        </button>
                      </div>
                    </div>
                    {invoiceCalculations.extraDiscountAmt > 0 && (
                      <span className="disc-val">
                        - ₹{invoiceCalculations.extraDiscountAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <div className="inv-calc-divider"></div>

                  <div className="inv-calc-row">
                    <span>Taxable Subtotal:</span>
                    <strong>₹{invoiceCalculations.taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                  </div>

                  {/* Taxes Breakdown */}
                  {isInterState ? (
                    <div className="inv-calc-row tax">
                      <span>Integrated GST (IGST 18%):</span>
                      <span>+ ₹{invoiceCalculations.igstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <>
                      <div className="inv-calc-row tax">
                        <span>Central GST (CGST 9%):</span>
                        <span>+ ₹{invoiceCalculations.cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="inv-calc-row tax">
                        <span>State GST (SGST 9%):</span>
                        <span>+ ₹{invoiceCalculations.sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  {/* Shipping Charges */}
                  <div className="inv-calc-row">
                    <div className="shipping-label-group">
                      <span>Shipping & Freight:</span>
                      <input
                        type="number"
                        min="0"
                        className="shipping-input"
                        placeholder="0"
                        value={shippingCharges || ""}
                        onChange={(e) => setShippingCharges(e.target.value)}
                      />
                    </div>
                    <span>
                      ₹{invoiceCalculations.shippingCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Round Off */}
                  {invoiceCalculations.roundOff !== 0 && (
                    <div className="inv-calc-row roundoff">
                      <span>Round-off Adjustment:</span>
                      <span>
                        {invoiceCalculations.roundOff > 0 ? "+" : ""}
                        ₹{invoiceCalculations.roundOff.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="inv-calc-divider bold"></div>

                  {/* Grand Total */}
                  <div className="inv-grand-total-row">
                    <div className="total-label-wrap">
                      <span>Total Invoice Amount</span>
                      <span className="total-sub">Includes all taxes and delivery</span>
                    </div>
                    <div className="total-amount-val">
                      ₹{invoiceCalculations.grandTotal.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {/* Amount in Words */}
                  <div className="inv-amount-words">
                    <strong>In Words:</strong> {invoiceCalculations.amountInWords}
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="inv-summary-actions">
                  <button
                    className="inv-btn inv-btn-primary full"
                    onClick={() => handleDownloadPdf()}
                  >
                    <Download size={16} /> Generate & Download PDF
                  </button>

                  <div className="inv-summary-sub-actions">
                    <button
                      className="inv-btn inv-btn-secondary"
                      onClick={() => handleSaveInvoice()}
                      disabled={savingInvoice}
                    >
                      <Save size={15} /> {savingInvoice ? "Saving..." : "Save Invoice"}
                    </button>
                    <button
                      className="inv-btn inv-btn-secondary"
                      onClick={() => window.print()}
                    >
                      <Printer size={15} /> Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: SAVED INVOICES ARCHIVE & HISTORY
            ========================================================================= */}
        {activeTab === "history" && (
          <div className="inv-history-container">
            <div className="inv-card inv-history-controls">
              <div className="inv-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search invoice number, customer name, email, or phone..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <div className="inv-history-filters">
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="inv-select"
                >
                  <option value="all">Status: All Invoices</option>
                  <option value="Paid">Status: Paid</option>
                  <option value="Pending">Status: Pending</option>
                  <option value="Partially Paid">Status: Partially Paid</option>
                </select>
              </div>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
                <div className="inv-spinner" style={{ margin: "0 auto 12px" }}></div>
                <p>Loading invoices history...</p>
              </div>
            ) : filteredHistoryInvoices.length === 0 ? (
              <div className="inv-empty-card">
                <FileText size={48} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                <h3>No Invoices Found</h3>
                <p>
                  {savedInvoices.length === 0
                    ? "You haven't generated and saved any invoices yet. Click 'Create New Invoice' above to start."
                    : "No invoices matched your search filter criteria."}
                </p>
                <button
                  className="inv-btn inv-btn-primary"
                  onClick={() => setActiveTab("create")}
                  style={{ marginTop: "14px" }}
                >
                  <Plus size={14} /> Create Your First Invoice
                </button>
              </div>
            ) : (
              <div className="inv-card inv-history-table-card">
                <div className="inv-table-responsive">
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Taxable Value</th>
                        <th>Grand Total</th>
                        <th>Payment Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistoryInvoices.map((inv) => (
                        <tr key={inv._id}>
                          <td>
                            <span className="inv-mono-badge">{inv.invoiceNumber}</span>
                          </td>
                          <td style={{ whiteSpace: "nowrap", color: "#64748b", fontSize: "12px" }}>
                            {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN")}
                          </td>
                          <td>
                            <div className="inv-hist-cust">
                              <strong>{inv.customerName || "Customer"}</strong>
                              {inv.customerPhone && (
                                <span className="sub">{inv.customerPhone}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ color: "#64748b" }}>
                            {inv.items ? `${inv.items.length} items` : "1 item"}
                          </td>
                          <td style={{ fontWeight: "600", color: "#475569" }}>
                            ₹{Number(inv.taxableSubtotal || 0).toLocaleString("en-IN")}
                          </td>
                          <td style={{ fontWeight: "800", color: "#0f172a" }}>
                            ₹{Number(inv.grandTotal || 0).toLocaleString("en-IN")}
                          </td>
                          <td>
                            <span className={`inv-status-pill ${(inv.paymentStatus || "paid").toLowerCase()}`}>
                              ● {inv.paymentStatus || "Paid"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              className="inv-action-pill"
                              onClick={() => handleDownloadPdf(inv)}
                              title="Download PDF Invoice"
                            >
                              <Download size={13} /> PDF
                            </button>
                            <button
                              className="inv-action-pill delete"
                              onClick={() => handleDeleteInvoice(inv._id)}
                              title="Delete Invoice"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODAL: PRODUCT PICKER DRAWER / MODAL
            ========================================================================= */}
        {productPickerOpen && (
          <div className="inv-modal-overlay" onClick={() => setProductPickerOpen(false)}>
            <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="inv-modal-header">
                <div className="inv-modal-title">
                  <Package size={18} color="#e3000f" />
                  <h3>Select Product from Catalog ({products.length})</h3>
                </div>
                <button
                  className="inv-modal-close"
                  onClick={() => setProductPickerOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Picker Search & Category Filters */}
              <div className="inv-picker-controls">
                <div className="inv-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by product name, Product ID, SKU, or specs..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                  />
                  {pickerSearch && (
                    <button
                      className="inv-search-clear"
                      onClick={() => setPickerSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <select
                  className="inv-select"
                  value={pickerCategory}
                  onChange={(e) => setPickerCategory(e.target.value)}
                >
                  <option value="all">All Categories ({pickerCategories.length})</option>
                  {pickerCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Picker Products Grid */}
              <div className="inv-picker-list">
                {products
                  .filter((p) => {
                    const matchesCat = pickerCategory === "all" || p.category === pickerCategory;
                    if (!pickerSearch.trim()) return matchesCat;
                    const q = pickerSearch.toLowerCase();
                    const matchesSearch =
                      (p.name && p.name.toLowerCase().includes(q)) ||
                      (p.productId && p.productId.toLowerCase().includes(q)) ||
                      (p.sku && String(p.sku).includes(q)) ||
                      (p.category && p.category.toLowerCase().includes(q));
                    return matchesCat && matchesSearch;
                  })
                  .map((p) => {
                    const price = Number(p.price) || 0;
                    const stock = Number(p.stock) || 0;
                    const prodId =
                      p.productId ||
                      (p.sku ? `PRD-${p.sku}` : `PRD-${p._id.toString().slice(-5).toUpperCase()}`);

                    return (
                      <div
                        key={p._id}
                        className="inv-picker-item"
                        onClick={() => handleAddProductFromCatalog(p)}
                      >
                        <div className="inv-picker-thumb">
                          <img
                            src={p.image ? `${API_BASE_URL}${p.image}` : "https://via.placeholder.com/60"}
                            alt={p.name}
                            onError={(e) => (e.target.src = "https://via.placeholder.com/60")}
                          />
                        </div>

                        <div className="inv-picker-info">
                          <div className="inv-picker-top">
                            <span className="inv-prod-id-pill">{prodId}</span>
                            <span className="inv-cat-pill">{p.category || "General"}</span>
                          </div>
                          <h4>{p.name}</h4>
                          <div className="inv-picker-bottom">
                            <span className="inv-picker-price">
                              ₹{price.toLocaleString("en-IN")}
                            </span>
                            <span className={`inv-picker-stock ${stock > 0 ? "in" : "out"}`}>
                              ● {stock > 0 ? `${stock} in stock` : "Out of stock"}
                            </span>
                          </div>
                        </div>

                        <button className="inv-picker-add-btn">
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CreateInvoicePage;
