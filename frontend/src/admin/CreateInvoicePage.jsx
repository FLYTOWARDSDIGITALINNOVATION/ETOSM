import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Tag,
  Ban,
  Edit3,
  FileX
} from "lucide-react";
import { generateEtosmInvoicePdf, printEtosmInvoicePdf } from "../utils/invoicePdfGenerator";
import { GST_STATES, detectPlaceOfSupply, isInterStateSupply } from "../utils/gstStates";
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

export const PAYMENT_TERMS_OPTIONS = [
  { id: "Immediate", label: "Due on Receipt (Immediate)", days: 0 },
  { id: "Net 7", label: "Net 7 Days", days: 7 },
  { id: "Net 15", label: "Net 15 Days", days: 15 },
  { id: "Net 30", label: "Net 30 Days", days: 30 },
  { id: "Net 45", label: "Net 45 Days", days: 45 },
  { id: "Net 60", label: "Net 60 Days", days: 60 },
  { id: "Net 90", label: "Net 90 Days", days: 90 },
  { id: "Custom", label: "Custom Due Date", days: null }
];

export function calculateDueDateFromTerms(baseDateStr, termId) {
  const term = PAYMENT_TERMS_OPTIONS.find((t) => t.id === termId);
  if (!term || term.days === null) return null;
  const d = baseDateStr ? new Date(baseDateStr) : new Date();
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + term.days);
  return d.toISOString().split("T")[0];
}

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [pickerPublicationFilter, setPickerPublicationFilter] = useState("all"); // "all" | "published" | "unpublished"

  // Customer dropdown search
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef(null);

  // Invoice Meta State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [sourceOrderNumber, setSourceOrderNumber] = useState("");
  const [allowDuplicateOrder, setAllowDuplicateOrder] = useState(false);
  const [duplicateOrderWarning, setDuplicateOrderWarning] = useState(null);
  const [quotationReference, setQuotationReference] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [availableQuotations, setAvailableQuotations] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [paymentTerms, setPaymentTerms] = useState("Net 15");
  const [taxPreference, setTaxPreference] = useState("exclusive"); // "exclusive" | "inclusive"
  const [placeOfSupply, setPlaceOfSupply] = useState("33 - Tamil Nadu");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [deductStock, setDeductStock] = useState(true);

  // Invoice Revision Modal State (BUG-021)
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [revisionForm, setRevisionForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerCompany: "",
    customerAddress: "",
    customerGstin: "",
    notes: "",
    sourceOrderNumber: "",
    quotationReference: "",
    paymentMode: "Bank Transfer",
    paymentStatus: "Paid",
    revisionReason: ""
  });
  const [savingRevision, setSavingRevision] = useState(false);

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

  // Consignee / Shipping Details State (Separate from Billing)
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shippingDetails, setShippingDetails] = useState({
    name: "",
    phone: "",
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
      isTaxInclusive: taxPreference === "inclusive",
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
    bankName: "INDIAN BANK",
    accountNumber: "7776386819",
    ifscCode: "IDIB000T038",
    branch: "Tiruchengodu Branch",
    upiId: "etosm@indianbk"
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

  // BUG-019: Real-time duplicate order check
  useEffect(() => {
    const clean = (sourceOrderNumber || "").trim();
    if (!clean) {
      setDuplicateOrderWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/invoices/check-duplicate?sourceOrderNumber=${encodeURIComponent(clean)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.duplicateOrder && data.orderExistingInvoice) {
            setDuplicateOrderWarning(data.orderExistingInvoice);
          } else {
            setDuplicateOrderWarning(null);
          }
        }
      } catch (e) {
        // quiet catch
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [sourceOrderNumber, token]);

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
      const [prodRes, custRes, settingsRes, quoteRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/products-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/settings`),
        fetch(`${API_BASE_URL}/admin/quotations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (prodRes && prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      } else {
        const fallbackRes = await fetch(`${API_BASE_URL}/products/all`).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          const fb = await fallbackRes.json();
          setProducts(Array.isArray(fb) ? fb : Array.isArray(fb.products) ? fb.products : []);
        }
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        const custList = Array.isArray(custData)
          ? custData
          : Array.isArray(custData.customers)
          ? custData.customers
          : [];
        setCustomers(custList);
      }
      if (quoteRes && quoteRes.ok) {
        const qData = await quoteRes.json();
        const qList = Array.isArray(qData)
          ? qData
          : Array.isArray(qData.quotations)
          ? qData.quotations
          : [];
        setAvailableQuotations(qList);
      }
      if (settingsRes && settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData) {
          setBankDetails((prev) => ({
            ...prev,
            bankName: sData.bankName || prev.bankName,
            accountNumber: sData.accountNumber || prev.accountNumber,
            ifscCode: sData.ifscCode || prev.ifscCode,
            upiId: sData.upiId || prev.upiId
          }));
        }
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
    if (!customerSearch.trim()) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && String(c.phone).includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [customers, customerSearch]);

  // Dynamic Payment Terms & Due Date Synchronization
  const handleInvoiceDateChange = (newDate) => {
    setInvoiceDate(newDate);
    if (paymentTerms && paymentTerms !== "Custom") {
      const computed = calculateDueDateFromTerms(newDate, paymentTerms);
      if (computed) setDueDate(computed);
    }
  };

  const handlePaymentTermsChange = (newTerm) => {
    setPaymentTerms(newTerm);
    if (newTerm !== "Custom") {
      const computed = calculateDueDateFromTerms(invoiceDate, newTerm);
      if (computed) setDueDate(computed);
    }
  };

  const handleDueDateChange = (newDueDate) => {
    setDueDate(newDueDate);
    if (invoiceDate && newDueDate) {
      const d1 = new Date(invoiceDate);
      const d2 = new Date(newDueDate);
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      const match = PAYMENT_TERMS_OPTIONS.find((t) => t.days === diffDays);
      setPaymentTerms(match ? match.id : "Custom");
    }
  };

  // Tax Preference (Exclusive vs Inclusive) Handlers
  const handleTaxPreferenceChange = (newPref) => {
    setTaxPreference(newPref);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isTaxInclusive: newPref === "inclusive"
      }))
    );
  };

  const handleToggleItemTaxInclusive = (index) => {
    setItems((prev) => {
      const next = [...prev];
      const currentVal = next[index].isTaxInclusive !== undefined
        ? next[index].isTaxInclusive
        : (taxPreference === "inclusive");
      next[index] = { ...next[index], isTaxInclusive: !currentVal };
      return next;
    });
  };

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

    const detected = detectPlaceOfSupply({
      gstin: c.gstin,
      state: c.state,
      pincode: c.pincode,
      address: fullAddr
    });
    setPlaceOfSupply(detected.placeOfSupply);

    setCustomerSearch(c.name || "");
    setCustomerDropdownOpen(false);
    showToast(`Customer "${c.name}" selected (${detected.isInterState ? "Inter-State: IGST" : "Intra-State: CGST+SGST"})`);
  };

  // Select Linked Quotation
  const handleSelectQuotation = (qId) => {
    if (!qId) {
      setQuotationId("");
      setQuotationReference("");
      return;
    }
    const q = availableQuotations.find((item) => item._id === qId);
    if (!q) return;

    setQuotationId(q._id);
    const qRef = q.quotationNumber || q.docNumber || "";
    setQuotationReference(qRef);
    if (q.sourceOrderNumber) {
      setSourceOrderNumber(q.sourceOrderNumber);
    }
    if (q.placeOfSupply) {
      setPlaceOfSupply(q.placeOfSupply);
    }

    // Populate customer details
    setCustomer({
      _id: q.customerId || "",
      name: q.customerName || "",
      phone: q.customerPhone || "",
      email: q.customerEmail || "",
      company: q.customerCompany || "",
      address: q.customerAddress || "",
      gstin: q.customerGstin || ""
    });
    setCustomerSearch(q.customerName || "");

    // Populate line items
    if (Array.isArray(q.items) && q.items.length > 0) {
      setItems(
        q.items.map((i, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          productId: i.productId || "",
          productRef: i.productRef || "",
          name: i.name || "",
          description: i.description || "",
          availableStock: null,
          quantity: Math.max(1, Number(i.quantity) || 1),
          unitPrice: Math.max(0, Number(i.unitPrice) || 0),
          discountType: "percent",
          discountValue: Number(i.discountPercent) || 0,
          gstPercent: Number(i.gstPercent) >= 0 ? Number(i.gstPercent) : 18
        }))
      );
    }

    if (q.notes) {
      setNotes(`Quotation Ref #${qRef}.\n${q.notes}`);
    }

    showToast(`Loaded details from Quotation #${qRef}`);
  };

  // Auto-fill customer, quotation, or storefront order if navigated with state
  useEffect(() => {
    if (location.state?.customer) {
      handleSelectCustomer(location.state.customer);
    }
    if (location.state?.quotation) {
      const q = location.state.quotation;
      setQuotationId(q._id || "");
      const qRef = q.quotationNumber || q.docNumber || "";
      setQuotationReference(qRef);
      if (q.sourceOrderNumber) setSourceOrderNumber(q.sourceOrderNumber);
      if (q.placeOfSupply) setPlaceOfSupply(q.placeOfSupply);
      setCustomer({
        _id: q.customerId || "",
        name: q.customerName || "",
        phone: q.customerPhone || "",
        email: q.customerEmail || "",
        company: q.customerCompany || "",
        address: q.customerAddress || "",
        gstin: q.customerGstin || ""
      });
      if (q.shippingSameAsBilling === false && q.shippingAddress) {
        setShippingSameAsBilling(false);
        setShippingDetails({
          name: q.shippingName || q.customerName || "",
          phone: q.shippingPhone || q.customerPhone || "",
          company: q.shippingCompany || "",
          address: q.shippingAddress || "",
          gstin: q.shippingGstin || ""
        });
      } else {
        setShippingSameAsBilling(true);
        setShippingDetails({
          name: q.customerName || "",
          phone: q.customerPhone || "",
          company: q.customerCompany || "",
          address: q.customerAddress || "",
          gstin: q.customerGstin || ""
        });
      }
      setCustomerSearch(q.customerName || "");
      if (q.taxPreference) {
        setTaxPreference(q.taxPreference);
      }
      if (Array.isArray(q.items) && q.items.length > 0) {
        setItems(
          q.items.map((i, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            productId: i.productId || "",
            productRef: i.productRef || "",
            name: i.name || "",
            description: i.description || "",
            availableStock: null,
            quantity: Math.max(1, Number(i.quantity) || 1),
            unitPrice: Math.max(0, Number(i.unitPrice || i.enteredPrice) || 0),
            isTaxInclusive: i.isTaxInclusive !== undefined ? i.isTaxInclusive : (q.taxPreference === "inclusive"),
            discountType: "percent",
            discountValue: Number(i.discountPercent) || 0,
            gstPercent: Number(i.gstPercent) >= 0 ? Number(i.gstPercent) : 18
          }))
        );
      }
      if (q.paymentTerms) {
        setPaymentTerms(q.paymentTerms);
        const computed = calculateDueDateFromTerms(new Date().toISOString().split("T")[0], q.paymentTerms);
        if (computed) setDueDate(computed);
      }
      showToast(`Prefilled from Quotation #${qRef}`);
    }
    if (location.state?.order) {
      const ord = location.state.order;
      const orderRef = ord.invoiceNumber || (ord._id ? `ORD-${String(ord._id).slice(-8).toUpperCase()}` : "");
      setSourceOrderNumber(orderRef);
      let shipName = ord.userName || "";
      let shipPhone = ord.phone || "";
      let shipEmail = ord.userEmail || "";
      let shipAddr = "";
      if (ord.shippingAddress && typeof ord.shippingAddress === "object") {
        shipName = `${ord.shippingAddress.firstName || ""} ${ord.shippingAddress.lastName || ""}`.trim() || shipName;
        shipPhone = ord.shippingAddress.phone || shipPhone;
        shipEmail = ord.shippingAddress.email || shipEmail;
        shipAddr = [ord.shippingAddress.address, ord.shippingAddress.locality, ord.shippingAddress.city, ord.shippingAddress.state, ord.shippingAddress.postalCode || ord.shippingAddress.zipCode].filter(Boolean).join(", ");
      }

      let billName = shipName;
      let billPhone = shipPhone;
      let billEmail = shipEmail;
      let billAddr = shipAddr;
      const hasDistinctBilling = Boolean(ord.billingAddress && typeof ord.billingAddress === "object" && ord.billingSameAsShipping === false);

      if (hasDistinctBilling) {
        billName = `${ord.billingAddress.firstName || ""} ${ord.billingAddress.lastName || ""}`.trim() || billName;
        billPhone = ord.billingAddress.phone || billPhone;
        billEmail = ord.billingAddress.email || billEmail;
        billAddr = [ord.billingAddress.address, ord.billingAddress.locality, ord.billingAddress.city, ord.billingAddress.state, ord.billingAddress.postalCode || ord.billingAddress.zipCode].filter(Boolean).join(", ");
        setShippingSameAsBilling(false);
      } else {
        setShippingSameAsBilling(true);
      }

      const detected = detectPlaceOfSupply({
        gstin: ord.billingAddress?.gstin || ord.gstin || "",
        state: ord.placeOfSupply && ord.placeOfSupply !== "33 - Tamil Nadu" ? ord.placeOfSupply : (ord.billingAddress?.state || ord.shippingAddress?.state || ""),
        pincode: ord.billingAddress?.postalCode || ord.shippingAddress?.postalCode || ord.shippingAddress?.zipCode || "",
        address: `${billAddr} ${shipAddr}`
      });
      setPlaceOfSupply(detected.placeOfSupply);

      setCustomer({
        _id: "",
        name: billName,
        phone: billPhone,
        email: billEmail,
        company: "",
        address: billAddr,
        gstin: ""
      });
      setShippingDetails({
        name: shipName,
        phone: shipPhone,
        company: "",
        address: shipAddr,
        gstin: ""
      });
      setCustomerSearch(billName);
      if (ord.productName) {
        setItems([
          {
            id: `item-order-1`,
            productId: ord.sku ? `SKU-${ord.sku}` : (ord.productId || ""),
            productRef: ord.productId || "",
            name: ord.productName,
            description: ord.variation ? `Variation: ${ord.variation}` : "",
            availableStock: null,
            quantity: Math.max(1, Number(ord.quantity) || 1),
            unitPrice: Math.max(0, Number(ord.price || ord.totalAmount) / Math.max(1, Number(ord.quantity) || 1)),
            discountType: "percent",
            discountValue: 0,
            gstPercent: 18
          }
        ]);
      }
      if (ord.paymentMethod) {
        setPaymentMode(ord.paymentMethod.toUpperCase());
        setPaymentStatus("Paid");
        setPaymentTerms("Immediate");
        setDueDate(new Date().toISOString().split("T")[0]);
      }
      showToast(`Prefilled from Order #${orderRef}`);
    }
  }, [location.state]);

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
    const prodId = prod.sku ? `SKU-${prod.sku}` : (prod.productId ? prod.productId.replace(/^PRD-?/i, "SKU-") : `SKU-${prod._id.toString().slice(-5).toUpperCase()}`);

    const isUnpublished = prod.isVisible === false || prod.isPublished === false || prod.status === "unpublished" || prod.status === "draft";
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prodId,
      productRef: prod._id,
      name: prod.name || "",
      description: prod.description || "",
      hsnCode: prod.hsnCode || prod.hsn || "",
      availableStock: Number(prod.stock) || 0,
      quantity: 1,
      unitPrice: unitPrice,
      isTaxInclusive: taxPreference === "inclusive",
      isUnpublished: isUnpublished,
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
    showToast(`Added "${prod.name}"${isUnpublished ? " (Unpublished Item)" : ""} to invoice`);
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
      isTaxInclusive: taxPreference === "inclusive",
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
    return isInterStateSupply(placeOfSupply);
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
      const isInclusive = item.isTaxInclusive !== undefined
        ? Boolean(item.isTaxInclusive)
        : (taxPreference === "inclusive");
      const gstRate = Math.max(0, Number(item.gstPercent) || 0);
      const discVal = Math.max(0, Number(item.discountValue) || 0);

      let lineGross = 0;
      let discAmount = 0;
      let lineTaxable = 0;
      let lineGst = 0;
      let lineTotal = 0;
      let baseUnitPrice = unitPrice;

      if (isInclusive) {
        // Price entered is INCLUSIVE of GST (e.g. MRP)
        const totalInclusiveGross = qty * unitPrice;
        if (item.discountType === "percent") {
          discAmount = (totalInclusiveGross * Math.min(100, discVal)) / 100;
        } else {
          discAmount = Math.min(totalInclusiveGross, discVal);
        }
        const discountedInclusive = Math.max(0, totalInclusiveGross - discAmount);
        lineTaxable = gstRate > 0 ? (discountedInclusive / (1 + gstRate / 100)) : discountedInclusive;
        lineGst = discountedInclusive - lineTaxable;
        lineTotal = discountedInclusive;
        baseUnitPrice = gstRate > 0 ? (unitPrice / (1 + gstRate / 100)) : unitPrice;
        lineGross = gstRate > 0 ? (totalInclusiveGross / (1 + gstRate / 100)) : totalInclusiveGross;
      } else {
        // Price entered is EXCLUSIVE of GST (Base Price + GST)
        lineGross = qty * unitPrice;
        if (item.discountType === "percent") {
          discAmount = (lineGross * Math.min(100, discVal)) / 100;
        } else {
          discAmount = Math.min(lineGross, discVal);
        }
        lineTaxable = Math.max(0, lineGross - discAmount);
        lineGst = (lineTaxable * gstRate) / 100;
        lineTotal = lineTaxable + lineGst;
        baseUnitPrice = unitPrice;
      }

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (isInterState) {
        lineIgst = lineGst;
      } else {
        lineCgst = lineGst / 2;
        lineSgst = lineGst / 2;
      }

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
        baseUnitPrice: Number(baseUnitPrice.toFixed(2)),
        isTaxInclusive: isInclusive,
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
  }, [items, isInterState, overallDiscountType, overallDiscountValue, shippingCharges, taxPreference]);

  // Save Invoice to Database
  const handleSaveInvoice = async (quiet = false) => {
    if (!customer.name.trim()) {
      showToast("Please enter or select a customer name", "error");
      return null;
    }

    // Filter out blank/unentered draft items so they never save to database
    const validItems = (invoiceCalculations.items || []).filter(
      (i) => i && (i.name || "").trim() !== "" && (i.name || "").trim().toLowerCase() !== "product item"
    );

    if (validItems.length === 0) {
      showToast("Please add at least one product with a valid name", "error");
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
        shippingSameAsBilling: shippingSameAsBilling,
        shippingName: shippingSameAsBilling ? customer.name : (shippingDetails.name || customer.name),
        shippingPhone: shippingSameAsBilling ? customer.phone : (shippingDetails.phone || customer.phone),
        shippingCompany: shippingSameAsBilling ? customer.company : (shippingDetails.company || customer.company),
        shippingAddress: shippingSameAsBilling ? customer.address : (shippingDetails.address || customer.address),
        shippingGstin: shippingSameAsBilling ? customer.gstin : (shippingDetails.gstin || customer.gstin),
        sourceOrderNumber: (sourceOrderNumber || "").trim(),
        allowDuplicateOrder: allowDuplicateOrder,
        quotationReference: (quotationReference || "").trim(),
        quotationId: quotationId || "",
        paymentMode: paymentMode,
        paymentStatus: paymentStatus,
        paymentTerms: paymentTerms || "Net 15",
        taxPreference: taxPreference,
        amountPaid: paymentStatus === "Partially Paid" ? (Number(amountPaidInput) || 0) : (paymentStatus === "Paid" ? invoiceCalculations.grandTotal : 0),
        balanceAmount: paymentStatus === "Partially Paid" ? Math.max(0, invoiceCalculations.grandTotal - (Number(amountPaidInput) || 0)) : (paymentStatus === "Paid" ? 0 : invoiceCalculations.grandTotal),
        deductStock: deductStock,
        items: validItems.map((i) => ({
          productId: i.productId,
          productRef: i.productRef,
          name: i.name.trim(),
          description: i.description || "",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          enteredPrice: i.unitPrice,
          baseUnitPrice: i.baseUnitPrice,
          isTaxInclusive: i.isTaxInclusive,
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
        showToast(`Invoice ${data.invoice?.invoiceNumber || data.invoiceNumber || invoiceNumber} saved successfully!`);
      }
      fetchInvoicesHistory();
      generateInvoiceNumber();
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
    const rawItems = customInvoiceData ? customInvoiceData.items : invoiceCalculations.items;
    const validItems = (rawItems || []).filter(
      (i) => i && (i.name || "").trim() !== "" && (i.name || "").trim().toLowerCase() !== "product item"
    );

    if (validItems.length === 0 && !customInvoiceData) {
      showToast("Please enter at least one product name before generating PDF", "error");
      return;
    }

    const data = customInvoiceData
      ? { ...customInvoiceData, items: validItems.length > 0 ? validItems : customInvoiceData.items }
      : {
          invoiceNumber,
          sourceOrderNumber: (sourceOrderNumber || "").trim(),
          quotationReference: (quotationReference || "").trim(),
          source: (sourceOrderNumber || "").trim(),
          reference: (quotationReference || "").trim(),
          invoiceDate,
          dueDate,
          placeOfSupply,
          paymentMode,
          paymentStatus,
          paymentTerms: paymentTerms || "Net 15",
          taxPreference: taxPreference,
          customer,
          customerName: customer.name,
          customerAddress: customer.address,
          customerGstin: customer.gstin,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          customerCompany: customer.company,
          shippingSameAsBilling: shippingSameAsBilling,
          shippingName: shippingSameAsBilling ? customer.name : (shippingDetails.name || customer.name),
          shippingPhone: shippingSameAsBilling ? customer.phone : (shippingDetails.phone || customer.phone),
          shippingCompany: shippingSameAsBilling ? customer.company : (shippingDetails.company || customer.company),
          shippingAddress: shippingSameAsBilling ? customer.address : (shippingDetails.address || customer.address),
          shippingGstin: shippingSameAsBilling ? customer.gstin : (shippingDetails.gstin || customer.gstin),
          items: validItems,
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
      const doc = await generateEtosmInvoicePdf(data);
      const cleanInvNum = (data.invoiceNumber || "Invoice").replace(/[/\\?%*:|"<>]/g, "-");
      doc.save(`Tax_Invoice_${cleanInvNum}.pdf`);
      showToast("Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF document", "error");
    }
  };

  // Print Official Tax Invoice PDF (Direct 2-Page Vector Invoice)
  const handlePrintInvoice = async (customInvoiceData = null) => {
    const rawItems = customInvoiceData ? customInvoiceData.items : invoiceCalculations.items;
    const validItems = (rawItems || []).filter(
      (i) => i && (i.name || "").trim() !== "" && (i.name || "").trim().toLowerCase() !== "product item"
    );

    if (validItems.length === 0 && !customInvoiceData) {
      showToast("Please enter at least one product name before printing", "error");
      return;
    }

    const data = customInvoiceData
      ? { ...customInvoiceData, items: validItems.length > 0 ? validItems : customInvoiceData.items }
      : {
          invoiceNumber,
          sourceOrderNumber: (sourceOrderNumber || "").trim(),
          quotationReference: (quotationReference || "").trim(),
          source: (sourceOrderNumber || "").trim(),
          reference: (quotationReference || "").trim(),
          invoiceDate,
          dueDate,
          placeOfSupply,
          paymentMode,
          paymentStatus,
          paymentTerms: paymentTerms || "Net 15",
          taxPreference: taxPreference,
          customer,
          customerName: customer.name,
          customerAddress: customer.address,
          customerGstin: customer.gstin,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          customerCompany: customer.company,
          shippingSameAsBilling: shippingSameAsBilling,
          shippingName: shippingSameAsBilling ? customer.name : (shippingDetails.name || customer.name),
          shippingPhone: shippingSameAsBilling ? customer.phone : (shippingDetails.phone || customer.phone),
          shippingCompany: shippingSameAsBilling ? customer.company : (shippingDetails.company || customer.company),
          shippingAddress: shippingSameAsBilling ? customer.address : (shippingDetails.address || customer.address),
          shippingGstin: shippingSameAsBilling ? customer.gstin : (shippingDetails.gstin || customer.gstin),
          items: validItems,
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
      showToast("Please enter customer name before printing", "error");
      return;
    }

    try {
      showToast("Opening Tax Invoice for print...", "info");
      await printEtosmInvoicePdf(data);
    } catch (err) {
      console.error("PDF Print failed:", err);
      showToast("Failed to prepare PDF for printing", "error");
    }
  };

  // Intercept Ctrl+P to print the official Tax Invoice rather than browser webpage DOM
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrintInvoice();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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

  // Delete saved draft invoice from history (Issued invoices cannot be deleted)
  const handleDeleteInvoice = async (inv) => {
    const isDraft = String(inv?.documentStatus || "").toLowerCase() === "draft";
    if (!isDraft) {
      showToast("Statutory Compliance: Issued tax invoices cannot be deleted. Use Cancel instead.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete draft invoice "${inv.invoiceNumber}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/${inv._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSavedInvoices((prev) => prev.filter((item) => item._id !== inv._id));
        showToast("Draft invoice deleted successfully");
      } else {
        showToast(data.message || "Failed to delete draft invoice", "error");
      }
    } catch (err) {
      console.error("Delete invoice error:", err);
      showToast("Failed to delete draft invoice", "error");
    }
  };

  // Safely Cancel an issued invoice without deleting the record (GST audit compliance)
  const handleCancelInvoice = async (inv) => {
    const reason = window.prompt(
      `Are you sure you want to cancel invoice "${inv.invoiceNumber}"?\n\nStatutory Note: Issued invoices cannot be deleted to avoid serial number gaps. This will mark the invoice as CANCELLED while preserving the audit record.\n\nEnter cancellation reason:`,
      "Cancelled due to order revision / error"
    );
    if (reason === null) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/${inv._id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason.trim() || "Cancelled by Admin" })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Invoice ${inv.invoiceNumber} has been safely cancelled.`);
        fetchInvoicesHistory();
      } else {
        showToast(data.message || "Failed to cancel invoice", "error");
      }
    } catch (err) {
      console.error("Cancel invoice error:", err);
      showToast("Failed to cancel invoice", "error");
    }
  };

  // BUG-021: Handle In-place Revision of an Issued Invoice
  const handleOpenRevisionModal = (inv) => {
    setRevisionTarget(inv);
    setRevisionForm({
      customerName: inv.customerName || "",
      customerPhone: inv.customerPhone || "",
      customerEmail: inv.customerEmail || "",
      customerCompany: inv.customerCompany || "",
      customerAddress: inv.customerAddress || "",
      customerGstin: inv.customerGstin || "",
      notes: inv.notes || "",
      sourceOrderNumber: inv.sourceOrderNumber || "",
      quotationReference: inv.quotationReference || "",
      paymentMode: inv.paymentMode || "Bank Transfer",
      paymentStatus: inv.paymentStatus || "Paid",
      revisionReason: ""
    });
    setRevisionModalOpen(true);
  };

  const handleSaveRevision = async () => {
    if (!revisionTarget) return;
    if (!revisionForm.revisionReason.trim()) {
      showToast("Mandatory: Please provide a reason for statutory invoice revision", "error");
      return;
    }

    setSavingRevision(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/invoices/${revisionTarget._id}/revise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(revisionForm)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save invoice revision");
      }

      showToast(`Invoice #${revisionTarget.invoiceNumber} revised successfully! (Rev ${data.invoice?.revisionCount || 1})`);
      setRevisionModalOpen(false);
      setRevisionTarget(null);
      fetchInvoicesHistory();
    } catch (err) {
      console.error("Revision error:", err);
      showToast(err.message || "Failed to revise invoice", "error");
    } finally {
      setSavingRevision(false);
    }
  };

  // Filtered History Invoices
  const filteredHistoryInvoices = useMemo(() => {
    return savedInvoices.filter((inv) => {
      const docStat = inv.documentStatus || (inv.paymentStatus === "Paid" ? "Settled" : "Issued");
      const matchesStatus =
        historyStatusFilter === "all" ||
        inv.paymentStatus === historyStatusFilter ||
        docStat.toLowerCase() === historyStatusFilter.toLowerCase();
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
              {availableQuotations.length > 0 && (
                <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>⚡ Quick Link to Approved Quotation:</span>
                  <select
                    value={quotationId}
                    onChange={(e) => handleSelectQuotation(e.target.value)}
                    style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: "1 1 200px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}
                  >
                    <option value="">-- Choose an existing Quotation to auto-fill invoice (Optional) --</option>
                    {availableQuotations.map((q) => (
                      <option key={q._id} value={q._id}>
                        #{q.quotationNumber || q.docNumber} - {q.customerName} (₹{Number(q.grandTotal).toLocaleString("en-IN")}) [{q.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="inv-meta-grid">
                {/* Row 1: Primary Invoice & Order Reference */}
                <div className="inv-meta-field">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    readOnly
                    placeholder="Auto-generated (Locked)"
                    className="inv-mono-input"
                    style={{ backgroundColor: "#f8fafc", cursor: "not-allowed", color: "#334155" }}
                    title="Invoice Number is auto-generated and locked to protect sequence integrity"
                  />
                </div>

                <div className="inv-meta-field">
                  <label>Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => handleInvoiceDateChange(e.target.value)}
                  />
                </div>

                <div className="inv-meta-field">
                  <label>Source Order # (Optional)</label>
                  <input
                    type="text"
                    value={sourceOrderNumber}
                    onChange={(e) => {
                      setSourceOrderNumber(e.target.value);
                      if (allowDuplicateOrder) setAllowDuplicateOrder(false);
                    }}
                    placeholder="e.g. ORD-439823 or #104928"
                    title="Source online storefront order number or purchase order reference"
                  />
                  {duplicateOrderWarning && (
                    <div className="inv-duplicate-warning-box">
                      <div className="inv-dup-text">
                        <AlertCircle size={14} color="#b45309" />
                        <span>Order #{sourceOrderNumber} already invoiced under #{duplicateOrderWarning.invoiceNumber}</span>
                      </div>
                      <label className="inv-dup-checkbox">
                        <input
                          type="checkbox"
                          checked={allowDuplicateOrder}
                          onChange={(e) => setAllowDuplicateOrder(e.target.checked)}
                        />
                        Allow split shipment / partial dispatch
                      </label>
                    </div>
                  )}
                </div>

                {/* Row 2: Commercial Terms & Quotation */}
                <div className="inv-meta-field">
                  <label>Quotation Reference (Optional)</label>
                  <input
                    type="text"
                    value={quotationReference}
                    onChange={(e) => setQuotationReference(e.target.value)}
                    placeholder="e.g. QT-2026-0001"
                    title="Commercial quotation or proposal number"
                  />
                </div>

                <div className="inv-meta-field">
                  <label>Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => handlePaymentTermsChange(e.target.value)}
                  >
                    {PAYMENT_TERMS_OPTIONS.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="inv-meta-field">
                  <div className="inv-meta-field-header">
                    <label>Payment Due Date</label>
                    <span style={{ fontSize: "11px", color: paymentTerms === "Immediate" ? "#16a34a" : "#e3000f", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {paymentTerms === "Immediate" ? "Due Immediately" : paymentTerms === "Custom" ? "Manual Date" : `Auto (${paymentTerms})`}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                  />
                </div>

                {/* Row 3: Statutory Tax & Financial Settlement */}
                <div className="inv-meta-field">
                  <div className="inv-meta-field-header">
                    <label>Place of Supply</label>
                    <span
                      style={{
                        fontSize: "10.5px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        background: isInterState ? "#eff6ff" : "#f0fdf4",
                        color: isInterState ? "#1d4ed8" : "#15803d",
                        border: `1px solid ${isInterState ? "#bfdbfe" : "#bbf7d0"}`
                      }}
                      title={isInterState ? "Inter-State Supply: IGST applies" : "Intra-State Supply: CGST (9%) + SGST (9%) applies"}
                    >
                      {isInterState ? "⚡ Inter-State" : "⚡ Intra-State"}
                    </span>
                  </div>
                  <select
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                  >
                    {GST_STATES.map((st) => (
                      <option key={st.code} value={`${st.code} - ${st.name}`}>
                        {st.code} - {st.name} ({st.type})
                      </option>
                    ))}
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
                  <div className="inv-meta-field" style={{ gridColumn: "1 / -1" }}>
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

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", width: "100%", maxWidth: "100%" }}>
                  {customers.length > 0 && (
                    <div className="customer-select-quick" style={{ minWidth: 0, width: "100%", maxWidth: "100%" }}>
                      <select
                        value={customer._id || ""}
                        onChange={(e) => {
                          const found = customers.find((c) => c._id === e.target.value);
                          if (found) handleSelectCustomer(found);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.85rem",
                          background: "#fff",
                          cursor: "pointer",
                          color: "#1e293b",
                          fontWeight: "500",
                          width: "100%",
                          maxWidth: "100%",
                          boxSizing: "border-box"
                        }}
                      >
                        <option value="">⚡ Quick Select Customer ({customers.length})...</option>
                        {customers.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} {c.company ? `(${c.company})` : ""} - {c.phone || c.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                <div className="inv-field inv-field-col-2">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    placeholder="Full name or Business contact"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    required
                  />
                </div>

                <div className="inv-field inv-field-col-2">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </div>

                <div className="inv-field inv-field-col-2">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </div>

                <div className="inv-field inv-field-col-3">
                  <label>Company / Firm Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Green Energy Systems Pvt Ltd"
                    value={customer.company}
                    onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                  />
                </div>

                <div className="inv-field inv-field-col-3">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                    <label style={{ margin: 0 }}>GSTIN (Optional)</label>
                    {customer.gstin && customer.gstin.length >= 2 && (
                      <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>
                        Auto-state: {detectPlaceOfSupply({ gstin: customer.gstin }).code}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAE1234A1Z5"
                    value={customer.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCustomer({ ...customer, gstin: val });
                      if (val.length >= 2) {
                        const detected = detectPlaceOfSupply({ gstin: val });
                        if (detected.source === "gstin") {
                          setPlaceOfSupply(detected.placeOfSupply);
                        }
                      }
                    }}
                    className="inv-mono-input"
                  />
                </div>

                <div className="inv-field inv-field-full" style={{ minWidth: 0, width: "100%" }}>
                  <label>Billing Address (Buyer Principal Place of Business)</label>
                  <input
                    type="text"
                    placeholder="Door No, Street name, City, Pincode"
                    value={customer.address}
                    onChange={(e) => {
                      const newAddr = e.target.value;
                      setCustomer({ ...customer, address: newAddr });
                      if (shippingSameAsBilling) {
                        setShippingDetails((prev) => ({ ...prev, address: newAddr }));
                      }
                      if (!customer.gstin || customer.gstin.length < 2) {
                        const detected = detectPlaceOfSupply({ address: newAddr });
                        if (detected.source !== "default") {
                          setPlaceOfSupply(detected.placeOfSupply);
                        }
                      }
                    }}
                  />
                </div>

                <div className="inv-field inv-field-full" style={{ marginTop: "4px", minWidth: 0, width: "100%" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", fontWeight: 600, color: "#1e293b", fontSize: "13px", whiteSpace: "normal", lineHeight: 1.4 }}>
                    <input
                      type="checkbox"
                      checked={shippingSameAsBilling}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShippingSameAsBilling(checked);
                        if (checked) {
                          setShippingDetails({
                            name: customer.name,
                            phone: customer.phone,
                            company: customer.company,
                            address: customer.address,
                            gstin: customer.gstin
                          });
                        }
                      }}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#e3000f", marginTop: "2px", flexShrink: 0 }}
                    />
                    <span style={{ wordBreak: "break-word", flex: 1, minWidth: 0 }}>Shipping / Consignee Address is the same as Billing Address</span>
                  </label>
                </div>

                {!shippingSameAsBilling && (
                  <div className="inv-field-full" style={{ background: "#f8fafc", padding: "14px 12px", borderRadius: "8px", border: "1px dashed #cbd5e1", marginTop: "10px", boxSizing: "border-box", width: "100%", maxWidth: "100%", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "6px" }}>
                      <h4 style={{ margin: 0, fontSize: "13px", color: "#e3000f", display: "flex", alignItems: "center", gap: "6px" }}>
                        <MapPin size={15} /> Consignee / Delivery Address Details
                      </h4>
                      <span style={{ fontSize: "11px", color: "#64748b", wordBreak: "break-word" }}>Separate delivery site or consignee location</span>
                    </div>
                    <div className="inv-customer-fields-grid" style={{ gap: "12px" }}>
                      <div className="inv-field inv-field-col-3">
                        <label>Consignee Name</label>
                        <input
                          type="text"
                          placeholder="Recipient / Site Contact Person"
                          value={shippingDetails.name}
                          onChange={(e) => setShippingDetails({ ...shippingDetails, name: e.target.value })}
                        />
                      </div>
                      <div className="inv-field inv-field-col-3">
                        <label>Consignee Phone</label>
                        <input
                          type="text"
                          placeholder="Site Contact Phone"
                          value={shippingDetails.phone}
                          onChange={(e) => setShippingDetails({ ...shippingDetails, phone: e.target.value })}
                        />
                      </div>
                      <div className="inv-field inv-field-full">
                        <label>Shipping / Site Delivery Address</label>
                        <input
                          type="text"
                          placeholder="Delivery site door no, industrial park, street, city, pincode"
                          value={shippingDetails.address}
                          onChange={(e) => setShippingDetails({ ...shippingDetails, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  <div className="tax-preference-toggle-group">
                    <span className="tax-pref-label">Tax Mode:</span>
                    <button
                      type="button"
                      className={`tax-pref-btn ${taxPreference === "exclusive" ? "active" : ""}`}
                      onClick={() => handleTaxPreferenceChange("exclusive")}
                      title="Prices entered are base rates exclusive of GST. Tax will be added on top."
                    >
                      Exclusive
                    </button>
                    <button
                      type="button"
                      className={`tax-pref-btn ${taxPreference === "inclusive" ? "active" : ""}`}
                      onClick={() => handleTaxPreferenceChange("inclusive")}
                      title="Prices entered are inclusive of GST (MRP). Tax will be reverse-calculated."
                    >
                      Inclusive (MRP)
                    </button>
                  </div>

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
                      <th style={{ width: "32px", textAlign: "center" }}>#</th>
                      <th style={{ minWidth: "160px" }}>Product Item & Details</th>
                      <th style={{ width: "84px" }}>Quantity</th>
                      <th style={{ width: "115px" }}>
                        Unit Price (₹)
                        <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: taxPreference === "inclusive" ? "#e3000f" : "#64748b" }}>
                          {taxPreference === "inclusive" ? "Incl. GST" : "Excl. GST"}
                        </span>
                      </th>
                      <th style={{ width: "90px" }}>Discount</th>
                      <th style={{ width: "88px", textAlign: "right" }}>Taxable (₹)</th>
                      <th style={{ width: "80px" }}>GST Rate</th>
                      <th style={{ width: "95px", textAlign: "right" }}>Line Total (₹)</th>
                      <th style={{ width: "36px", textAlign: "center" }}></th>
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
                              {item.isUnpublished && (
                                <span className="inv-item-unpublished-pill" title="Unpublished / Internal product catalog item">
                                  Unpublished
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
                            <button
                              type="button"
                              className={`tax-mode-pill-btn ${item.isTaxInclusive ? "inclusive" : "exclusive"}`}
                              onClick={() => handleToggleItemTaxInclusive(index)}
                              title={item.isTaxInclusive ? "Price is GST Inclusive (MRP). Click to switch to Exclusive." : "Price is GST Exclusive (Base). Click to switch to Inclusive."}
                            >
                              {item.isTaxInclusive ? "Incl" : "Excl"}
                            </button>
                          </div>
                          {item.isTaxInclusive && Number(item.unitPrice) > 0 && (
                            <span className="inv-derived-base-hint" title="Derived base taxable rate before GST">
                              Base: ₹{item.baseUnitPrice?.toFixed(2)} + {item.gstPercent}%
                            </span>
                          )}
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
                        <td style={{ textAlign: "right" }}>
                          <span className="inv-taxable-val">
                            ₹{item.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* GST Rate (Manual Input) */}
                        <td>
                          <div className="inv-gst-control">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              className="gst-input"
                              placeholder="0"
                              value={item.gstPercent === 0 ? "0" : (item.gstPercent ?? "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateItem(index, "gstPercent", val === "" ? "" : Number(val));
                              }}
                            />
                            <span className="gst-suffix">%</span>
                          </div>
                          <span className="inv-gst-sub">
                            + ₹{item.gstAmount.toFixed(2)}
                          </span>
                        </td>

                        {/* Line Total */}
                        <td style={{ textAlign: "right" }}>
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
              {/* Left Column: Terms & Notes */}
              <div className="inv-card inv-terms-card">
                <div className="inv-card-title" style={{ marginBottom: "12px" }}>
                  <FileText size={18} color="#e3000f" />
                  <h3>Terms & Conditions / Customer Notes</h3>
                </div>

                <div className="inv-field">
                  <textarea
                    rows="5"
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
                      onClick={() => handlePrintInvoice()}
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
                  placeholder="Search invoice #, customer name, phone, order #..."
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
                  <option value="Paid">Payment: Paid</option>
                  <option value="Pending">Payment: Pending</option>
                  <option value="Partially Paid">Payment: Partially Paid</option>
                  <option value="Issued">Doc: Issued</option>
                  <option value="Settled">Doc: Settled</option>
                  <option value="Credited">Doc: Credited</option>
                  <option value="Partially Credited">Doc: Partially Credited</option>
                  <option value="Cancelled">Doc: Cancelled</option>
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
                        <th style={{ width: "170px", minWidth: "170px", whiteSpace: "nowrap" }}>Invoice #</th>
                        <th style={{ width: "105px", minWidth: "105px", whiteSpace: "nowrap" }}>Date</th>
                        <th style={{ minWidth: "180px" }}>Customer</th>
                        <th style={{ textAlign: "center", width: "90px", minWidth: "90px", whiteSpace: "nowrap" }}>Items</th>
                        <th style={{ textAlign: "right", width: "130px", minWidth: "130px", whiteSpace: "nowrap" }}>Taxable Value</th>
                        <th style={{ textAlign: "right", width: "130px", minWidth: "130px", whiteSpace: "nowrap" }}>Grand Total</th>
                        <th style={{ textAlign: "center", width: "135px", minWidth: "135px", whiteSpace: "nowrap" }}>Document Status</th>
                        <th style={{ textAlign: "center", width: "125px", minWidth: "125px", whiteSpace: "nowrap" }}>Payment Status</th>
                        <th style={{ textAlign: "center", width: "170px", minWidth: "170px", whiteSpace: "nowrap" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistoryInvoices.map((inv) => (
                        <tr key={inv._id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <span className="inv-mono-badge">
                              {inv.invoiceNumber}
                              {Number(inv.revisionCount) > 0 && (
                                <span className="inv-rev-indicator" title={`${inv.revisionCount} revisions recorded`}>
                                  R{inv.revisionCount}
                                </span>
                              )}
                            </span>
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
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <span className="inv-items-badge">
                              {inv.items ? `${inv.items.length} ${inv.items.length === 1 ? "item" : "items"}` : "1 item"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: "600", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                            ₹{Number(inv.taxableSubtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap", fontWeight: "800", color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                            ₹{Number(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <span className={`doc-status-pill ${(inv.documentStatus || (inv.paymentStatus === "Paid" ? "settled" : "issued")).toLowerCase().replace(/\s+/g, "-")}`}>
                              {inv.documentStatus || (inv.paymentStatus === "Paid" ? "Settled" : "Issued")}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <span className={`inv-status-pill ${(inv.paymentStatus || "paid").toLowerCase()}`}>
                              ● {inv.paymentStatus || "Paid"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                              <button
                                className="inv-action-pill"
                                onClick={() => handleDownloadPdf(inv)}
                                title="Download PDF Invoice"
                              >
                                <Download size={13} /> PDF
                              </button>
                              {inv.documentStatus !== "Cancelled" && inv.paymentStatus !== "Cancelled" && (
                                <button
                                  className="inv-action-pill revise"
                                  onClick={() => handleOpenRevisionModal(inv)}
                                  title="Revise issued invoice (Statutory Audit Safe)"
                                >
                                  <Edit3 size={13} /> Revise{inv.revisionCount > 0 ? ` (R${inv.revisionCount})` : ""}
                                </button>
                              )}
                              {String(inv.documentStatus || "").toLowerCase() === "draft" ? (
                                <button
                                  className="inv-action-pill delete"
                                  onClick={() => handleDeleteInvoice(inv)}
                                  title="Delete Draft Invoice"
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : inv.documentStatus === "Cancelled" || inv.paymentStatus === "Cancelled" ? (
                                <span className="inv-action-pill cancelled-tag" title="Invoice is void/cancelled">
                                  Cancelled
                                </span>
                              ) : (
                                <button
                                  className="inv-action-pill cancel-inv"
                                  onClick={() => handleCancelInvoice(inv)}
                                  title="Issue official Cancellation / Credit Note"
                                >
                                  <FileX size={13} /> Cancel
                                </button>
                              )}
                            </div>
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

                <select
                  className="inv-select"
                  value={pickerPublicationFilter}
                  onChange={(e) => setPickerPublicationFilter(e.target.value)}
                  title="Filter products by publication status"
                  style={{ minWidth: "175px" }}
                >
                  <option value="all">All Statuses (Published & Unpublished)</option>
                  <option value="published">🟢 Published Only (Storefront)</option>
                  <option value="unpublished">🔴 Unpublished / Internal Only</option>
                </select>
              </div>

              {/* Picker Products Grid */}
              <div className="inv-picker-list">
                {products
                  .filter((p) => {
                    const matchesCat = pickerCategory === "all" || p.category === pickerCategory;
                    const isUnpub = p.isVisible === false || p.isPublished === false || p.status === "unpublished" || p.status === "draft";
                    const matchesPub =
                      pickerPublicationFilter === "all" ||
                      (pickerPublicationFilter === "published" && !isUnpub) ||
                      (pickerPublicationFilter === "unpublished" && isUnpub);

                    if (!pickerSearch.trim()) return matchesCat && matchesPub;
                    const q = pickerSearch.toLowerCase();
                    const matchesSearch =
                      (p.name && p.name.toLowerCase().includes(q)) ||
                      (p.productId && p.productId.toLowerCase().includes(q)) ||
                      (p.sku && String(p.sku).includes(q)) ||
                      (p.category && p.category.toLowerCase().includes(q));
                    return matchesCat && matchesPub && matchesSearch;
                  })
                  .map((p) => {
                    const price = Number(p.price) || 0;
                    const stock = Number(p.stock) || 0;
                    const isUnpub = p.isVisible === false || p.isPublished === false || p.status === "unpublished" || p.status === "draft";
                    const prodId =
                      p.sku ? `SKU-${p.sku}` : (p.productId ? p.productId.replace(/^PRD-?/i, "SKU-") : `SKU-${p._id.toString().slice(-5).toUpperCase()}`);

                    return (
                      <div
                        key={p._id}
                        className={`inv-picker-item ${isUnpub ? "is-unpublished" : ""}`}
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
                            {isUnpub ? (
                              <span className="inv-pub-pill unpublished" title="Unpublished / Hidden from public storefront - Available for Invoicing">
                                🔴 Unpublished
                              </span>
                            ) : (
                              <span className="inv-pub-pill published" title="Published in online store">
                                🟢 Published
                              </span>
                            )}
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

        {/* =========================================================================
            MODAL: INVOICE REVISION (BUG-021)
            ========================================================================= */}
        {revisionModalOpen && revisionTarget && (
          <div className="inv-modal-overlay" onClick={() => setRevisionModalOpen(false)}>
            <div className="inv-modal-card inv-revision-modal" onClick={(e) => e.stopPropagation()}>
              <div className="inv-modal-header">
                <div className="inv-modal-title">
                  <Edit3 size={18} color="#e3000f" />
                  <h3>Revise Invoice: <span style={{ fontFamily: "monospace", color: "#e3000f" }}>{revisionTarget.invoiceNumber}</span></h3>
                </div>
                <button
                  className="inv-modal-close"
                  onClick={() => setRevisionModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="inv-revision-body">
                <div className="inv-revision-banner">
                  <ShieldCheck size={18} color="#059669" />
                  <span>
                    Statutory Rule: The invoice number <strong>{revisionTarget.invoiceNumber}</strong> is preserved to prevent sequence gaps. Current Revision: <strong>Rev {revisionTarget.revisionCount || 0}</strong>.
                  </span>
                </div>

                <div className="inv-revision-grid">
                  <div className="inv-field">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      value={revisionForm.customerName}
                      onChange={(e) => setRevisionForm({ ...revisionForm, customerName: e.target.value })}
                    />
                  </div>
                  <div className="inv-field">
                    <label>Customer Phone</label>
                    <input
                      type="text"
                      value={revisionForm.customerPhone}
                      onChange={(e) => setRevisionForm({ ...revisionForm, customerPhone: e.target.value })}
                    />
                  </div>
                  <div className="inv-field">
                    <label>Customer Email</label>
                    <input
                      type="email"
                      value={revisionForm.customerEmail}
                      onChange={(e) => setRevisionForm({ ...revisionForm, customerEmail: e.target.value })}
                    />
                  </div>
                  <div className="inv-field">
                    <label>Company / Firm Name</label>
                    <input
                      type="text"
                      value={revisionForm.customerCompany}
                      onChange={(e) => setRevisionForm({ ...revisionForm, customerCompany: e.target.value })}
                    />
                  </div>
                  <div className="inv-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Customer Address</label>
                    <textarea
                      rows={2}
                      value={revisionForm.customerAddress}
                      onChange={(e) => setRevisionForm({ ...revisionForm, customerAddress: e.target.value })}
                    />
                  </div>
                  <div className="inv-field">
                    <label>Customer GSTIN</label>
                    <input
                      type="text"
                      value={revisionForm.customerGstin}
                      onChange={(e) => setRevisionForm({ ...revisionForm, customerGstin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="inv-field">
                    <label>Source Order #</label>
                    <input
                      type="text"
                      value={revisionForm.sourceOrderNumber}
                      onChange={(e) => setRevisionForm({ ...revisionForm, sourceOrderNumber: e.target.value })}
                    />
                  </div>
                  <div className="inv-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Notes / Declarations</label>
                    <textarea
                      rows={2}
                      value={revisionForm.notes}
                      onChange={(e) => setRevisionForm({ ...revisionForm, notes: e.target.value })}
                    />
                  </div>
                  <div className="inv-field inv-revision-reason-field" style={{ gridColumn: "1 / -1" }}>
                    <label style={{ color: "#b45309", fontWeight: "700" }}>Mandatory Revision Reason (Auditor Trail) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Buyer legal business name / address corrected as per GST portal"
                      value={revisionForm.revisionReason}
                      onChange={(e) => setRevisionForm({ ...revisionForm, revisionReason: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="inv-modal-footer">
                <button
                  type="button"
                  className="inv-btn inv-btn-secondary"
                  onClick={() => setRevisionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inv-btn inv-btn-primary"
                  onClick={handleSaveRevision}
                  disabled={savingRevision || !revisionForm.revisionReason.trim()}
                >
                  {savingRevision ? "Saving Revision..." : "Save Revision & Update History"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CreateInvoicePage;
