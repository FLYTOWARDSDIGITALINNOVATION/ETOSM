import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  Send,
  Building,
  Phone,
  Mail,
  MapPin,
  Check,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  Percent,
  FileCheck,
  Printer,
  Copy,
  Receipt,
  AlertCircle
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { generateEtosmQuotationPdf, printEtosmQuotationPdf } from "../utils/invoicePdfGenerator";
import { cacheGet, cacheSet } from "../utils/dataCache";
import { GST_STATES, detectPlaceOfSupply, isInterStateSupply } from "../utils/gstStates";
import "./QuotationManagementPage.css";

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

const QuotationManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  // Mode: "list" or "create" / "edit"
  const [viewMode, setViewMode] = useState("list"); // "list" | "builder"
  const [editingQuotationId, setEditingQuotationId] = useState(null);

  // Data Lists
  const [quotations, setQuotations] = useState(() => cacheGet("admin_quotations") || []);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalValue: 0,
    approvedCount: 0,
    approvedValue: 0,
    pendingCount: 0,
    convertedCount: 0,
    draftCount: 0
  });
  const [loading, setLoading] = useState(() => !(cacheGet("admin_quotations") && cacheGet("admin_quotations").length > 0));

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Preview Modal
  const [previewQuotation, setPreviewQuotation] = useState(null);

  // Convert to Invoice Modal
  const [convertModalQuotation, setConvertModalQuotation] = useState(null);
  const [convertPaymentStatus, setConvertPaymentStatus] = useState("Pending");
  const [convertAmountPaid, setConvertAmountPaid] = useState("");
  const [convertPaymentTerms, setConvertPaymentTerms] = useState("Net 15");
  const [converting, setConverting] = useState(false);

  const handleOpenConvertModal = (q) => {
    setConvertModalQuotation(q);
    setConvertPaymentStatus("Pending");
    setConvertAmountPaid("");
    setConvertPaymentTerms(q?.paymentTerms || "Net 15");
  };

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ==========================================
  // BUILDER / FORM STATE
  // ==========================================
  const [formData, setFormData] = useState({
    quotationNumber: "",
    quotationDate: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    customerAddress: "",
    customerGstin: "",
    placeOfSupply: "33 - Tamil Nadu",
    paymentTerms: "Net 15",
    taxPreference: "exclusive",
    sourceOrderNumber: "",
    shippingSameAsBilling: true,
    shippingName: "",
    shippingPhone: "",
    shippingAddress: "",
    status: "Pending",
    notes: "1. Quotation prices are valid for 30 days from date of issue.\n2. Taxes as applicable at the time of invoicing.\n3. Delivery timeline: 3-5 business days upon PO confirmation.",
    overallDiscountType: "percent", // "percent" | "amount"
    overallDiscountValue: 0,
    shippingCharges: 0
  });

  const [items, setItems] = useState([
    {
      productId: "",
      name: "",
      description: "",
      sku: "",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      gstPercent: 18
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState("all"); // "all" | "published" | "unpublished"
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  // Verify Auth
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
      return;
    }
    fetchQuotations();
    fetchProductsAndCustomers();
  }, [statusFilter, sortBy]);

  // Fetch Quotations
  const fetchQuotations = async () => {
    try {
      if (!cacheGet("admin_quotations")) setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sortBy) params.append("sort", sortBy);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`${API_BASE_URL}/admin/quotations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to load quotations");
      const data = await res.json();
      setQuotations(Array.isArray(data.quotations) ? data.quotations : []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Error fetching quotations:", err);
      showToast("Failed to load quotations", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Products & Customers for Autocomplete
  const fetchProductsAndCustomers = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/products-stats`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => fetch(`${API_BASE_URL}/products/all`)),
        fetch(`${API_BASE_URL}/admin/customers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (prodRes && prodRes.ok) {
        const pData = await prodRes.json();
        const pList = Array.isArray(pData) ? pData : Array.isArray(pData.products) ? pData.products : [];
        setProductsCatalog(pList);
      } else {
        // Fallback to /products/all
        const fbRes = await fetch(`${API_BASE_URL}/products/all`);
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          setProductsCatalog(Array.isArray(fbData) ? fbData : Array.isArray(fbData.products) ? fbData.products : []);
        }
      }
      if (custRes.ok) {
        const cData = await custRes.json();
        setCustomersList(Array.isArray(cData) ? cData : Array.isArray(cData.customers) ? cData.customers : []);
      }
    } catch (err) {
      console.error("Error fetching products/customers catalog:", err);
    }
  };

  // Fetch Next Quotation Number
  const fetchNextQuotationNumber = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quotations/next-number`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.nextNumber;
      }
    } catch (err) {
      console.error("Failed to generate quotation number:", err);
    }
    const year = new Date().getFullYear();
    return `QT-${year}-${String(quotations.length + 1).padStart(4, "0")}`;
  };

  // Open Builder to Create New
  const handleOpenCreateBuilder = async () => {
    const nextNum = await fetchNextQuotationNumber();
    setEditingQuotationId(null);
    setFormData({
      quotationNumber: nextNum,
      quotationDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      customerId: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerCompany: "",
      customerAddress: "",
      customerGstin: "",
      placeOfSupply: "33 - Tamil Nadu",
      paymentTerms: "Net 15",
      taxPreference: "exclusive",
      sourceOrderNumber: "",
      shippingSameAsBilling: true,
      shippingName: "",
      shippingPhone: "",
      shippingAddress: "",
      status: "Pending",
      notes: "1. Quotation prices are valid for 30 days from date of issue.\n2. Taxes as applicable at the time of invoicing.\n3. Delivery timeline: 3-5 business days upon PO confirmation.",
      overallDiscountType: "percent",
      overallDiscountValue: 0,
      shippingCharges: 0
    });
    setItems([
      {
        productId: "",
        name: "",
        description: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        gstPercent: 18
      }
    ]);
    setViewMode("builder");
  };

  // Open Builder to Edit Existing
  const handleOpenEditBuilder = (quotation) => {
    setEditingQuotationId(quotation._id);
    setFormData({
      quotationNumber: quotation.quotationNumber || quotation.docNumber,
      quotationDate: (() => {
        try {
          const d = quotation.quotationDate ? new Date(quotation.quotationDate) : new Date();
          return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
        } catch (e) {
          return new Date().toISOString().split("T")[0];
        }
      })(),
      validUntil: (() => {
        try {
          const d = quotation.validUntil ? new Date(quotation.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          return isNaN(d.getTime()) ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : d.toISOString().split("T")[0];
        } catch (e) {
          return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        }
      })(),
      customerId: quotation.customerId || "",
      customerName: quotation.customerName || "",
      customerEmail: quotation.customerEmail || "",
      customerPhone: quotation.customerPhone || "",
      customerCompany: quotation.customerCompany || "",
      customerAddress: quotation.customerAddress || "",
      customerGstin: quotation.customerGstin || "",
      placeOfSupply: quotation.placeOfSupply || "33 - Tamil Nadu",
      paymentTerms: quotation.paymentTerms || "Net 15",
      taxPreference: quotation.taxPreference || "exclusive",
      sourceOrderNumber: quotation.sourceOrderNumber || "",
      shippingSameAsBilling: quotation.shippingSameAsBilling !== undefined ? quotation.shippingSameAsBilling : true,
      shippingName: quotation.shippingName || "",
      shippingPhone: quotation.shippingPhone || "",
      shippingAddress: quotation.shippingAddress || "",
      status: quotation.status || "Pending",
      notes: quotation.notes || "",
      overallDiscountType: quotation.quotationDiscountPercent > 0 ? "percent" : "amount",
      overallDiscountValue: quotation.quotationDiscountPercent || quotation.quotationDiscountAmount || 0,
      shippingCharges: quotation.shippingCharges || 0
    });

    if (Array.isArray(quotation.items) && quotation.items.length > 0) {
      setItems(
        quotation.items.map((i) => ({
          productId: i.productId || "",
          productRef: i.productRef || "",
          name: i.name || "",
          description: i.description || "",
          sku: i.sku || "",
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          isTaxInclusive: i.isTaxInclusive !== undefined ? i.isTaxInclusive : (quotation.taxPreference === "inclusive"),
          discountPercent: Number(i.discountPercent) || 0,
          discountAmount: Number(i.discountAmount) || 0,
          gstPercent: Number(i.gstPercent) !== undefined ? Number(i.gstPercent) : 18
        }))
      );
    }
    setViewMode("builder");
  };

  // Select Customer from Saved List
  const handleSelectCustomer = (cust) => {
    let fullAddr = cust.address || (cust.shippingAddress && cust.shippingAddress !== "N/A" ? cust.shippingAddress : "");
    if (cust.city && !fullAddr.includes(cust.city)) fullAddr += (fullAddr ? ", " : "") + cust.city;
    if (cust.pincode && !fullAddr.includes(cust.pincode)) fullAddr += (fullAddr ? " - " : "") + cust.pincode;

    const detected = detectPlaceOfSupply({
      gstin: cust.gstin,
      state: cust.state,
      pincode: cust.pincode,
      address: fullAddr
    });

    setFormData((prev) => ({
      ...prev,
      customerId: cust._id || "",
      customerName: cust.name || "",
      customerEmail: cust.email || "",
      customerPhone: cust.phone && cust.phone !== "N/A" ? cust.phone : "",
      customerCompany: cust.company || "",
      customerAddress: fullAddr,
      customerGstin: cust.gstin || "",
      placeOfSupply: detected.placeOfSupply
    }));
    showToast(`Loaded customer "${cust.name}" (${detected.isInterState ? "Inter-State: IGST" : "Intra-State: CGST+SGST"})`);
  };

  // Auto-open builder and select customer if navigated from Customer Management
  useEffect(() => {
    if (location.state?.customer) {
      setViewMode("builder");
      handleSelectCustomer(location.state.customer);
    }
  }, [location.state]);

  // Add Item to Line Items
  const handleAddItem = (product = null) => {
    if (product) {
      const isUnpub = product.isVisible === false || product.isPublished === false || product.status === "unpublished" || product.status === "draft";
      const newItem = {
        productId: product.productId || product._id || "",
        productRef: product._id || "",
        name: product.name || "Product Item",
        description: product.description ? String(product.description).trim() : "",
        sku: product.sku ? String(product.sku) : "",
        quantity: 1,
        unitPrice: Number(product.price) || 0,
        isTaxInclusive: formData.taxPreference === "inclusive",
        isUnpublished: isUnpub,
        discountPercent: 0,
        discountAmount: 0,
        gstPercent: Number(product.gstPercent) || 18
      };
      setItems((prev) => {
        if (prev.length === 1 && (!prev[0].name || !prev[0].name.trim()) && Number(prev[0].unitPrice || 0) === 0) {
          return [newItem];
        }
        return [...prev, newItem];
      });
      setShowCatalogModal(false);
      showToast(`Added "${product.name}"${isUnpub ? " (Unpublished Item)" : ""} to quotation!`);
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: "",
          name: "",
          description: "",
          sku: "",
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          discountAmount: 0,
          gstPercent: 18
        }
      ]);
    }
  };

  // Update Line Item Field
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Remove Line Item
  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      showToast("Quotation must have at least one line item", "error");
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Financial Calculations (Gross, Discount, Taxable, Tax, Grand Total)
  const calculations = useMemo(() => {
    let grossSubtotal = 0;
    let itemDiscountsTotal = 0;

    const calculatedItems = items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.unitPrice) || 0;
      const isInclusive = item.isTaxInclusive !== undefined
        ? Boolean(item.isTaxInclusive)
        : (formData.taxPreference === "inclusive");
      const gst = Number(item.gstPercent) !== undefined ? Number(item.gstPercent) : 18;

      let baseGross = 0;
      let discAmt = 0;
      let taxable = 0;
      let taxAmt = 0;
      let totalAmt = 0;
      let baseUnitPrice = rate;

      if (isInclusive) {
        const totalInclusiveGross = qty * rate;
        if (item.discountPercent && Number(item.discountPercent) > 0) {
          discAmt = (totalInclusiveGross * Number(item.discountPercent)) / 100;
        } else if (item.discountAmount) {
          discAmt = Number(item.discountAmount);
        }
        discAmt = Math.min(discAmt, totalInclusiveGross);
        const discountedInclusive = Math.max(0, totalInclusiveGross - discAmt);
        taxable = gst > 0 ? (discountedInclusive / (1 + gst / 100)) : discountedInclusive;
        taxAmt = discountedInclusive - taxable;
        totalAmt = discountedInclusive;
        baseUnitPrice = gst > 0 ? (rate / (1 + gst / 100)) : rate;
        baseGross = gst > 0 ? (totalInclusiveGross / (1 + gst / 100)) : totalInclusiveGross;
      } else {
        baseGross = qty * rate;
        if (item.discountPercent && Number(item.discountPercent) > 0) {
          discAmt = (baseGross * Number(item.discountPercent)) / 100;
        } else if (item.discountAmount) {
          discAmt = Number(item.discountAmount);
        }
        discAmt = Math.min(discAmt, baseGross);
        taxable = Math.max(0, baseGross - discAmt);
        taxAmt = (taxable * gst) / 100;
        totalAmt = taxable + taxAmt;
        baseUnitPrice = rate;
      }

      grossSubtotal += baseGross;
      itemDiscountsTotal += discAmt;

      return {
        ...item,
        unitPrice: rate,
        baseUnitPrice: Number(baseUnitPrice.toFixed(2)),
        isTaxInclusive: isInclusive,
        taxableAmount: Number(taxable.toFixed(2)),
        gstAmount: Number(taxAmt.toFixed(2)),
        totalAmount: Number(totalAmt.toFixed(2))
      };
    });

    // Overall Discount
    let extraDiscount = 0;
    const ovVal = Number(formData.overallDiscountValue) || 0;
    if (formData.overallDiscountType === "percent" && ovVal > 0) {
      extraDiscount = (grossSubtotal * ovVal) / 100;
    } else if (ovVal > 0) {
      extraDiscount = ovVal;
    }

    const totalDiscount = itemDiscountsTotal + extraDiscount;
    const taxableSubtotal = Math.max(0, grossSubtotal - totalDiscount);

    // Is Inter-State GST (Check place of supply vs TN)
    const isInterState = isInterStateSupply(formData.placeOfSupply);

    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    calculatedItems.forEach((it) => {
      const taxable = it.taxableAmount;
      const gst = Number(it.gstPercent) || 18;
      const taxAmt = (taxable * gst) / 100;

      if (isInterState) {
        igstTotal += taxAmt;
      } else {
        cgstTotal += taxAmt / 2;
        sgstTotal += taxAmt / 2;
      }
    });

    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const shipping = Number(formData.shippingCharges) || 0;
    const rawGrandTotal = taxableSubtotal + totalTax + shipping;
    const roundOff = Number((Math.round(rawGrandTotal) - rawGrandTotal).toFixed(2));
    const grandTotal = Math.round(rawGrandTotal);

    return {
      items: calculatedItems,
      grossSubtotal: Math.round(grossSubtotal),
      totalDiscount: Math.round(totalDiscount),
      extraDiscount: Math.round(extraDiscount),
      taxableSubtotal: Math.round(taxableSubtotal),
      isInterState,
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      totalTax: Math.round(totalTax),
      shippingCharges: shipping,
      roundOff,
      grandTotal
    };
  }, [items, formData.overallDiscountType, formData.overallDiscountValue, formData.shippingCharges, formData.placeOfSupply, formData.taxPreference]);

  // Save Quotation (Create or Update)
  const handleSaveQuotation = async (forcedStatus = null) => {
    if (!formData.customerName.trim()) {
      showToast("Please enter customer name", "error");
      return;
    }

    const validLineItems = calculations.items.filter(
      (i) => i && (i.name || "").trim() !== "" && (i.name || "").trim().toLowerCase() !== "product item"
    );
    if (validLineItems.length === 0) {
      showToast("Please enter or select at least one product name in line items", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const statusToSave = forcedStatus || formData.status || "Pending";
      const payload = {
        quotationNumber: formData.quotationNumber,
        docNumber: formData.quotationNumber,
        quotationDate: formData.quotationDate,
        validUntil: formData.validUntil,
        customerId: formData.customerId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerCompany: formData.customerCompany,
        customerAddress: formData.customerAddress,
        customerGstin: formData.customerGstin,
        placeOfSupply: formData.placeOfSupply,
        paymentTerms: formData.paymentTerms || "Net 15",
        taxPreference: formData.taxPreference || "exclusive",
        sourceOrderNumber: (formData.sourceOrderNumber || "").trim(),
        shippingSameAsBilling: formData.shippingSameAsBilling !== false,
        shippingName: formData.shippingSameAsBilling !== false ? formData.customerName : (formData.shippingName || formData.customerName),
        shippingPhone: formData.shippingSameAsBilling !== false ? formData.customerPhone : (formData.shippingPhone || formData.customerPhone),
        shippingAddress: formData.shippingSameAsBilling !== false ? formData.customerAddress : (formData.shippingAddress || formData.customerAddress),
        status: statusToSave,
        items: calculations.items
          .filter((i) => i && (i.name || "").trim() !== "" && (i.name || "").trim().toLowerCase() !== "product item")
          .map((i) => ({
          productId: i.productId,
          productRef: i.productRef,
          name: (i.name || "").trim() || "Item",
          description: i.description,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          enteredPrice: i.unitPrice,
          baseUnitPrice: i.baseUnitPrice,
          isTaxInclusive: i.isTaxInclusive,
          discountPercent: i.discountPercent,
          discountAmount: i.discountAmount,
          taxableAmount: i.taxableAmount,
          gstPercent: i.gstPercent,
          cgstAmount: Number((i.gstAmount / 2).toFixed(2)),
          sgstAmount: Number((i.gstAmount / 2).toFixed(2)),
          igstAmount: i.gstAmount,
          totalAmount: i.totalAmount
        })),
        grossSubtotal: calculations.grossSubtotal,
        totalDiscount: calculations.totalDiscount,
        quotationDiscountPercent: formData.overallDiscountType === "percent" ? Number(formData.overallDiscountValue) : 0,
        quotationDiscountAmount: calculations.extraDiscount,
        taxableSubtotal: calculations.taxableSubtotal,
        totalTax: calculations.totalTax,
        isInterState: calculations.isInterState,
        cgstTotal: calculations.cgstTotal,
        sgstTotal: calculations.sgstTotal,
        igstTotal: calculations.igstTotal,
        shippingCharges: calculations.shippingCharges,
        roundOff: calculations.roundOff,
        grandTotal: calculations.grandTotal,
        notes: formData.notes
      };

      let res;
      if (editingQuotationId) {
        res = await fetch(`${API_BASE_URL}/admin/quotations/${editingQuotationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE_URL}/admin/quotations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save quotation");

      showToast(`Quotation ${payload.quotationNumber} saved successfully!`);
      setViewMode("list");
      fetchQuotations();
    } catch (err) {
      console.error("Save error:", err);
      showToast(err.message || "Failed to save quotation", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Updater
  const handleUpdateStatus = async (quotation, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quotations/${quotation._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        showToast(`Quotation ${quotation.quotationNumber} status updated to "${newStatus}"!`);
        fetchQuotations();
        if (previewQuotation && previewQuotation._id === quotation._id) {
          setPreviewQuotation((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  // Convert Quotation into Invoice
  const handleConvertToInvoice = async () => {
    if (!convertModalQuotation) return;
    setConverting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/quotations/${convertModalQuotation._id}/convert-to-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: convertPaymentStatus,
          paymentTerms: convertPaymentTerms || "Net 15",
          amountPaid: convertPaymentStatus === "Partially Paid" ? Number(convertAmountPaid) : 0,
          sourceOrderNumber: convertModalQuotation.sourceOrderNumber || "",
          taxPreference: convertModalQuotation.taxPreference || "exclusive",
          shippingSameAsBilling: convertModalQuotation.shippingSameAsBilling !== false,
          shippingName: convertModalQuotation.shippingName || convertModalQuotation.customerName || "",
          shippingPhone: convertModalQuotation.shippingPhone || convertModalQuotation.customerPhone || "",
          shippingAddress: convertModalQuotation.shippingAddress || convertModalQuotation.customerAddress || ""
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to convert quotation to invoice");

      showToast(`Quotation successfully converted to Invoice #${data.invoice.invoiceNumber}!`, "success");
      setConvertModalQuotation(null);
      fetchQuotations();
    } catch (err) {
      console.error("Conversion error:", err);
      showToast(err.message || "Failed to convert quotation to invoice", "error");
    } finally {
      setConverting(false);
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async (quotation) => {
    if (!window.confirm(`Are you sure you want to delete quotation "${quotation.quotationNumber || quotation.docNumber}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/quotations/${quotation._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showToast("Quotation deleted successfully");
        fetchQuotations();
        if (previewQuotation && previewQuotation._id === quotation._id) {
          setPreviewQuotation(null);
        }
      } else {
        throw new Error("Failed to delete quotation");
      }
    } catch (err) {
      showToast(err.message || "Failed to delete quotation", "error");
    }
  };

  // BUG-014: Match quotation design to invoice layout
  const handleDownloadPdf = async (q) => {
    try {
      showToast("Generating official Quotation PDF...", "info");
      const doc = await generateEtosmQuotationPdf(q);
      const cleanNum = (q.quotationNumber || q.docNumber || "QT-0001").replace(/[/\\?%*:|"<>]/g, "-");
      doc.save(`ETOSM_Quotation_${cleanNum}.pdf`);
      showToast(`Quotation ${cleanNum} downloaded as A4 PDF!`);
      return;
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Failed to generate PDF", "error");
      return;
    }
  };






  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    if (!searchTerm.trim()) return quotations;
    const q = searchTerm.toLowerCase();
    return quotations.filter((doc) => {
      const qNum = doc.quotationNumber || doc.docNumber || "";
      return (
        qNum.toLowerCase().includes(q) ||
        (doc.customerName && doc.customerName.toLowerCase().includes(q)) ||
        (doc.customerEmail && doc.customerEmail.toLowerCase().includes(q)) ||
        (doc.customerPhone && doc.customerPhone.includes(q)) ||
        (doc.customerCompany && doc.customerCompany.toLowerCase().includes(q)) ||
        (doc.items && doc.items.some((i) => i.name && i.name.toLowerCase().includes(q)))
      );
    });
  }, [quotations, searchTerm]);

  // Catalog filtered for modal picker
  const filteredCatalog = useMemo(() => {
    return productsCatalog.filter((p) => {
      const isUnpub = p.isVisible === false || p.isPublished === false || p.status === "unpublished" || p.status === "draft";
      const matchesStatus =
        catalogStatusFilter === "all" ||
        (catalogStatusFilter === "published" && !isUnpub) ||
        (catalogStatusFilter === "unpublished" && isUnpub);

      if (!catalogSearch.trim()) return matchesStatus;
      const q = catalogSearch.toLowerCase().trim();
      const matchesSearch =
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.productId && p.productId.toLowerCase().includes(q)) ||
        (p.sku && String(p.sku).includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [productsCatalog, catalogSearch, catalogStatusFilter]);

  return (
    <AdminLayout>
      <div className="quotation-page">
        {/* Toast */}
        {toast && (
          <div className={`quotation-toast ${toast.type}`}>
            {toast.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* VIEW MODE: BUILDER (CREATE / EDIT QUOTATION) */}
        {viewMode === "builder" ? (
          <div className="quotation-builder-view">
            {/* Header */}
            <div className="builder-top-bar">
              <div className="builder-title">
                <button className="back-btn" onClick={() => setViewMode("list")}>
                  <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} />
                  <span>Back to Quotations</span>
                </button>
                <h2>{editingQuotationId ? "Edit Quotation" : "Create New Quotation"}</h2>
                <span className="builder-subtitle">
                  {editingQuotationId
                    ? `Updating Quotation #${formData.quotationNumber}`
                    : "Create commercial price estimate for prospective client"}
                </span>
              </div>

              <div className="builder-actions">
                <button
                  className="q-btn secondary"
                  disabled={isSubmitting}
                  onClick={() => handleSaveQuotation("Draft")}
                >
                  Save as Draft
                </button>
                <button
                  className="q-btn primary"
                  disabled={isSubmitting}
                  onClick={() => handleSaveQuotation("Pending")}
                >
                  {isSubmitting ? "Saving..." : "Save & Finalize Quotation"}
                </button>
              </div>
            </div>

            {/* Builder Grid */}
            <div className="builder-grid">
              {/* 1. Meta Details Card */}
                <div className="q-card">
                  <div className="q-card-header">
                    <h3>1. Quotation Metadata</h3>
                  </div>
                  <div className="q-card-body grid-3">
                    <div className="q-form-group">
                      <label>Quotation Number *</label>
                      <input
                        type="text"
                        value={formData.quotationNumber}
                        onChange={(e) => setFormData({ ...formData, quotationNumber: e.target.value })}
                        required
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Quotation Date *</label>
                      <input
                        type="date"
                        value={formData.quotationDate}
                        onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Valid Until Date *</label>
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                        required
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending Approval</option>
                        <option value="Approved">Approved by Client</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="q-form-group">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label style={{ margin: 0 }}>Place of Supply</label>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            background: calculations.isInterState ? "#eff6ff" : "#f0fdf4",
                            color: calculations.isInterState ? "#1d4ed8" : "#15803d",
                            border: `1px solid ${calculations.isInterState ? "#bfdbfe" : "#bbf7d0"}`
                          }}
                          title={calculations.isInterState ? "Inter-State Supply: IGST applies" : "Intra-State Supply: CGST + SGST applies"}
                        >
                          {calculations.isInterState ? "⚡ Inter-State" : "⚡ Intra-State"}
                        </span>
                      </div>
                      <select
                        value={formData.placeOfSupply}
                        onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                      >
                        {GST_STATES.map((st) => (
                          <option key={st.code} value={`${st.code} - ${st.name}`}>
                            {st.code} - {st.name} ({st.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="q-form-group">
                      <label>Source Order # (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. ORD-439823 or Inquiry Ref"
                        value={formData.sourceOrderNumber || ""}
                        onChange={(e) => setFormData({ ...formData, sourceOrderNumber: e.target.value })}
                        title="Associated customer purchase order, inquiry, or store order reference"
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Commercial Payment Terms</label>
                      <select
                        value={formData.paymentTerms || "Net 15"}
                        onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      >
                        <option value="Immediate">Due on Receipt (Immediate)</option>
                        <option value="Net 7">Net 7 Days</option>
                        <option value="Net 15">Net 15 Days (Standard)</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 45">Net 45 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                        <option value="Net 90">Net 90 Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Customer Information Card */}
                <div className="q-card">
                  <div className="q-card-header">
                    <h3>2. Customer Details</h3>
                    {customersList.length > 0 && (
                      <div className="customer-select-quick">
                        <select
                          onChange={(e) => {
                            const found = customersList.find((c) => c._id === e.target.value);
                            if (found) handleSelectCustomer(found);
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            ⚡ Quick Select Saved Customer...
                          </option>
                          {customersList.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name} {c.company ? `(${c.company})` : ""} - {c.phone || c.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="q-card-body grid-3">
                    <div className="q-form-group">
                      <label>Customer / Contact Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Company / Organization</label>
                      <input
                        type="text"
                        placeholder="e.g. GreenTech EV Solutions"
                        value={formData.customerCompany}
                        onChange={(e) => setFormData({ ...formData, customerCompany: e.target.value })}
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        placeholder="client@greentech.in"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      />
                    </div>
                    <div className="q-form-group">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ margin: 0 }}>Customer GSTIN</label>
                        {formData.customerGstin && formData.customerGstin.length >= 2 && (
                          <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>
                            Auto-state: {detectPlaceOfSupply({ gstin: formData.customerGstin }).code}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="33AAAAA0000A1Z5"
                        value={formData.customerGstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          const detected = val.length >= 2 ? detectPlaceOfSupply({ gstin: val }) : null;
                          setFormData((prev) => ({
                            ...prev,
                            customerGstin: val,
                            placeOfSupply: detected && detected.source === "gstin" ? detected.placeOfSupply : prev.placeOfSupply
                          }));
                        }}
                      />
                    </div>
                    <div className="q-form-group">
                      <label>Billing Address (Buyer Principal Place of Business)</label>
                      <input
                        type="text"
                        placeholder="Office / Billing address, City, Pincode"
                        value={formData.customerAddress}
                        onChange={(e) => {
                          const newAddr = e.target.value;
                          const detected = (!formData.customerGstin || formData.customerGstin.length < 2)
                            ? detectPlaceOfSupply({ address: newAddr })
                            : null;
                          setFormData((prev) => ({
                            ...prev,
                            customerAddress: newAddr,
                            shippingAddress: prev.shippingSameAsBilling ? newAddr : prev.shippingAddress,
                            placeOfSupply: detected && detected.source !== "default" ? detected.placeOfSupply : prev.placeOfSupply
                          }));
                        }}
                      />
                    </div>
                  </div>

                  {/* Consignee / Site Delivery Address */}
                  <div style={{ marginTop: "14px", padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                      <input
                        type="checkbox"
                        checked={formData.shippingSameAsBilling !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            shippingSameAsBilling: checked,
                            shippingName: checked ? prev.customerName : prev.shippingName,
                            shippingPhone: checked ? prev.customerPhone : prev.shippingPhone,
                            shippingAddress: checked ? prev.customerAddress : prev.shippingAddress
                          }));
                        }}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#e3000f" }}
                      />
                      <span>Delivery / Site Address is the same as Billing Address</span>
                    </label>

                    {formData.shippingSameAsBilling === false && (
                      <div className="q-form-grid" style={{ marginTop: "12px" }}>
                        <div className="q-form-group">
                          <label>Consignee / Site Contact Name</label>
                          <input
                            type="text"
                            placeholder="Site Engineer / Contact Person"
                            value={formData.shippingName}
                            onChange={(e) => setFormData({ ...formData, shippingName: e.target.value })}
                          />
                        </div>
                        <div className="q-form-group">
                          <label>Site Contact Phone</label>
                          <input
                            type="text"
                            placeholder="+91 98765 43210"
                            value={formData.shippingPhone}
                            onChange={(e) => setFormData({ ...formData, shippingPhone: e.target.value })}
                          />
                        </div>
                        <div className="q-form-group" style={{ gridColumn: "1 / -1" }}>
                          <label>Shipping / Project Site Delivery Address</label>
                          <input
                            type="text"
                            placeholder="Site plant, industrial unit, door no, city, pincode"
                            value={formData.shippingAddress}
                            onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Line Items Card (Product Prices, Quantities, Discounts) */}
                <div className="q-card">
                  <div className="q-card-header">
                    <div>
                      <h3>3. Products & Line Items</h3>
                      <p className="q-header-sub">
                        Add saved products from catalog or enter custom parts. Modify prices, quantities, and discounts.
                      </p>
                    </div>
                    <div className="line-item-actions">
                      <div className="tax-preference-toggle-group">
                        <span className="tax-pref-label">Tax Mode:</span>
                        <button
                          type="button"
                          className={`tax-pref-btn ${formData.taxPreference === "exclusive" ? "active" : ""}`}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, taxPreference: "exclusive" }));
                            setItems((prev) => prev.map((it) => ({ ...it, isTaxInclusive: false })));
                          }}
                          title="Prices entered are exclusive of GST. Tax is added on top."
                        >
                          Exclusive
                        </button>
                        <button
                          type="button"
                          className={`tax-pref-btn ${formData.taxPreference === "inclusive" ? "active" : ""}`}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, taxPreference: "inclusive" }));
                            setItems((prev) => prev.map((it) => ({ ...it, isTaxInclusive: true })));
                          }}
                          title="Prices entered are inclusive of GST (MRP). Tax is reverse-calculated."
                        >
                          Inclusive (MRP)
                        </button>
                      </div>

                      <button
                        type="button"
                        className="q-btn secondary small"
                        onClick={() => setShowCatalogModal(true)}
                      >
                        <ShoppingBag size={14} />
                        <span>Add from Catalog</span>
                      </button>
                      <button
                        type="button"
                        className="q-btn secondary small"
                        onClick={() => handleAddItem(null)}
                      >
                        <Plus size={14} />
                        <span>Add Manual Item</span>
                      </button>
                    </div>
                  </div>

                  <div className="q-card-body p-0">
                    <div className="items-table-wrap">
                      <table className="items-builder-table">
                        <thead>
                          <tr>
                            <th style={{ width: "33%" }}>ITEM DESCRIPTION</th>
                            <th style={{ width: "10%" }}>QTY</th>
                            <th style={{ width: "17%" }}>
                              UNIT PRICE (₹)
                              <span style={{ display: "block", fontSize: "10px", fontWeight: 600, color: formData.taxPreference === "inclusive" ? "#e3000f" : "#64748b" }}>
                                {formData.taxPreference === "inclusive" ? "Incl. GST" : "Excl. GST"}
                              </span>
                            </th>
                            <th style={{ width: "12%" }}>DISC %</th>
                            <th style={{ width: "12%" }}>GST RATE</th>
                            <th style={{ width: "16%", textAlign: "right" }}>AMOUNT (₹)</th>
                            <th style={{ width: "5%" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          <datalist id="quotation-products-datalist">
                            {productsCatalog.map((p) => {
                              const isUnpub = p.isVisible === false || p.isPublished === false || p.status === "unpublished" || p.status === "draft";
                              return (
                                <option key={p._id} value={p.name}>
                                  {isUnpub ? "[Unpublished] " : ""}{p.category ? `[${p.category}] ` : ""}₹{p.price} {p.sku ? `(SKU: ${p.sku})` : ""}
                                </option>
                              );
                            })}
                          </datalist>
                          {items.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <input
                                    type="text"
                                    className="item-input bold"
                                    placeholder="Product / Service Name * (type or pick from catalog)"
                                    value={item.name}
                                    list="quotation-products-datalist"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      handleItemChange(idx, "name", val);
                                      const matched = productsCatalog.find(
                                        (p) => (p.name || "").trim().toLowerCase() === val.trim().toLowerCase()
                                      );
                                      if (matched) {
                                        const isUnpub = matched.isVisible === false || matched.isPublished === false || matched.status === "unpublished" || matched.status === "draft";
                                        setItems((prev) => {
                                          const updated = [...prev];
                                          updated[idx] = {
                                            ...updated[idx],
                                            name: matched.name,
                                            productId: matched.productId || matched._id || "",
                                            productRef: matched._id || "",
                                            unitPrice: Number(matched.price) || 0,
                                            isTaxInclusive: formData.taxPreference === "inclusive",
                                            isUnpublished: isUnpub,
                                            description: matched.description ? String(matched.description).trim() : (updated[idx].description || ""),
                                            sku: matched.sku ? String(matched.sku) : (updated[idx].sku || ""),
                                            gstPercent: Number(matched.gstPercent) || 18
                                          };
                                          return updated;
                                        });
                                        showToast(`Selected "${matched.name}"${isUnpub ? " (Unpublished Item)" : ""} (₹${matched.price})`);
                                      }
                                    }}
                                    required
                                  />
                                  {item.isUnpublished && (
                                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", whiteSpace: "nowrap" }} title="Unpublished / Internal product">
                                      Unpublished
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  className="item-input sub"
                                  placeholder="Specifications / Description / SKU"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  className="item-input center"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value)))}
                                />
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="item-input right"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    className={`tax-mode-pill-btn ${item.isTaxInclusive ? "inclusive" : "exclusive"}`}
                                    onClick={() => {
                                      setItems((prev) => {
                                        const next = [...prev];
                                        const cur = next[idx].isTaxInclusive !== undefined
                                          ? next[idx].isTaxInclusive
                                          : (formData.taxPreference === "inclusive");
                                        next[idx] = { ...next[idx], isTaxInclusive: !cur };
                                        return next;
                                      });
                                    }}
                                    title={item.isTaxInclusive ? "Price includes GST (MRP). Click to switch to exclusive." : "Price excludes GST (Base). Click to switch to inclusive."}
                                  >
                                    {item.isTaxInclusive ? "Incl" : "Excl"}
                                  </button>
                                </div>
                                {item.isTaxInclusive && Number(item.unitPrice) > 0 && (
                                  <span className="q-derived-base-hint" title="Derived base taxable rate before GST">
                                    Base: ₹{calculations.items[idx]?.baseUnitPrice?.toFixed(2)} + {item.gstPercent || 18}%
                                  </span>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="0%"
                                  className="item-input center"
                                  value={item.discountPercent}
                                  onChange={(e) => handleItemChange(idx, "discountPercent", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  className="item-input center"
                                  placeholder="18"
                                  value={item.gstPercent === 0 ? "0" : (item.gstPercent ?? "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleItemChange(idx, "gstPercent", val === "" ? "" : Number(val));
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span className="item-row-total">
                                  ₹{Number(calculations.items[idx]?.totalAmount || 0).toLocaleString("en-IN")}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="row-delete-btn"
                                  onClick={() => handleRemoveItem(idx)}
                                  title="Remove Item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              {/* Bottom Calculations & Settings Grid */}
              <div className="builder-bottom-grid">
                {/* 4. Terms & Notes */}
                <div className="q-card quotation-terms-card">
                  <div className="q-card-header">
                    <h3>4. Commercial Terms & Notes</h3>
                  </div>
                  <div className="q-card-body">
                    <textarea
                      rows={4}
                      className="terms-textarea"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Specify validity, delivery terms, payment conditions..."
                    />
                  </div>
                </div>

                {/* Right Column: Financial Summary Box */}
                <div className="summary-sticky-card">
                  <h3 className="summary-title">Quotation Summary</h3>

                  <div className="summary-rows">
                    <div className="summary-row">
                      <span>Gross Subtotal:</span>
                      <span>₹{calculations.grossSubtotal.toLocaleString("en-IN")}</span>
                    </div>

                    {/* Overall Discount Control */}
                    <div className="summary-discount-control">
                      <div className="discount-label-row">
                        <span>Overall Quotation Discount:</span>
                        <div className="disc-toggle">
                          <button
                            type="button"
                            className={formData.overallDiscountType === "percent" ? "active" : ""}
                            onClick={() => setFormData({ ...formData, overallDiscountType: "percent" })}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={formData.overallDiscountType === "amount" ? "active" : ""}
                            onClick={() => setFormData({ ...formData, overallDiscountType: "amount" })}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Discount value"
                        value={formData.overallDiscountValue}
                        onChange={(e) => setFormData({ ...formData, overallDiscountValue: e.target.value })}
                      />
                    </div>

                    {calculations.totalDiscount > 0 && (
                      <div className="summary-row green-row">
                        <span>Total Discounts:</span>
                        <span>- ₹{calculations.totalDiscount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="summary-row">
                      <span>Taxable Subtotal:</span>
                      <span>₹{calculations.taxableSubtotal.toLocaleString("en-IN")}</span>
                    </div>

                    {/* Tax Breakdown */}
                    {calculations.isInterState ? (
                      <div className="summary-row">
                        <span>IGST (Inter-state):</span>
                        <span>₹{calculations.igstTotal.toLocaleString("en-IN")}</span>
                      </div>
                    ) : (
                      <>
                        <div className="summary-row">
                          <span>CGST (9% avg):</span>
                          <span>₹{calculations.cgstTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="summary-row">
                          <span>SGST (9% avg):</span>
                          <span>₹{calculations.sgstTotal.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    )}

                    {/* Shipping Charges */}
                    <div className="summary-shipping-row">
                      <span>Delivery / Shipping (₹):</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.shippingCharges}
                        onChange={(e) => setFormData({ ...formData, shippingCharges: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    {calculations.roundOff !== 0 && (
                      <div className="summary-row sub-row">
                        <span>Round Off:</span>
                        <span>{calculations.roundOff > 0 ? `+₹${calculations.roundOff}` : `-₹${Math.abs(calculations.roundOff)}`}</span>
                      </div>
                    )}

                    <div className="summary-grand-total">
                      <span>ESTIMATED TOTAL:</span>
                      <strong>₹{calculations.grandTotal.toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="summary-words">
                      <span>Amount in words:</span>
                      <p>{numberToWordsINR(calculations.grandTotal)}</p>
                    </div>
                  </div>

                  <div className="summary-action-btns">
                    <button
                      className="q-btn primary full"
                      disabled={isSubmitting}
                      onClick={() => handleSaveQuotation("Pending")}
                    >
                      <Check size={16} />
                      <span>{isSubmitting ? "Saving..." : "Save & Finalize"}</span>
                    </button>
                    <button
                      className="q-btn secondary full"
                      onClick={() => {
                        const validItems = calculations.items.filter(
                          (i) => i && ((i.name || "").trim() !== "" || Number(i.unitPrice || 0) > 0)
                        );
                        const itemsToPreview = validItems.length > 0 ? validItems : calculations.items;
                        const previewObj = {
                          ...formData,
                          items: itemsToPreview,
                          grossSubtotal: calculations.grossSubtotal,
                          totalDiscount: calculations.totalDiscount,
                          taxableSubtotal: calculations.taxableSubtotal,
                          totalTax: calculations.totalTax,
                          cgstTotal: calculations.cgstTotal,
                          sgstTotal: calculations.sgstTotal,
                          igstTotal: calculations.igstTotal,
                          grandTotal: calculations.grandTotal
                        };
                        setPreviewQuotation(previewObj);
                      }}
                    >
                      <Eye size={16} />
                      <span>Preview Quotation Sheet</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW MODE: LIST OF ALL QUOTATIONS */
          <div className="quotation-list-view">
            {/* Header */}
            <div className="q-page-header">
              <div className="q-header-title">
                <span className="q-eyebrow">COMMERCIAL ESTIMATES</span>
                <h1>5. Quotation Management</h1>
                <p>
                  Create quotations manually or using saved products, edit pricing and discounts, preview, download A4 PDFs, and convert approved quotations into invoices.
                </p>
              </div>

              <div className="q-header-actions">
                <button className="q-btn primary" onClick={handleOpenCreateBuilder}>
                  <Plus size={16} />
                  <span>Create Quotation</span>
                </button>
                <button
                  className="q-btn secondary"
                  onClick={() => navigate("/admin/create-invoice")}
                >
                  <Receipt size={16} />
                  <span>Invoices</span>
                </button>
                <button className="q-btn icon-only" onClick={fetchQuotations} title="Refresh">
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="q-kpi-grid">
              <div className="q-kpi-card">
                <div className="kpi-card-inner">
                  <div className="kpi-icon-wrap primary-wrap">
                    <FileText size={24} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-label">TOTAL QUOTATIONS</span>
                    <h2 className="kpi-value">{stats.totalCount || 0}</h2>
                    <span className="kpi-sub">₹{Number(stats.totalValue || 0).toLocaleString("en-IN")} total value</span>
                  </div>
                </div>
              </div>

              <div className="q-kpi-card highlight-card">
                <div className="kpi-card-inner">
                  <div className="kpi-icon-wrap success-wrap">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-label">APPROVED BY CLIENTS</span>
                    <h2 className="kpi-value success-text">{stats.approvedCount || 0}</h2>
                    <span className="kpi-sub">₹{Number(stats.approvedValue || 0).toLocaleString("en-IN")} ready to invoice</span>
                  </div>
                </div>
              </div>

              <div className="q-kpi-card">
                <div className="kpi-card-inner">
                  <div className="kpi-icon-wrap pending-wrap">
                    <Clock size={24} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-label">PENDING APPROVAL</span>
                    <h2 className="kpi-value pending-text">{stats.pendingCount || 0}</h2>
                    <span className="kpi-sub">Awaiting client decision</span>
                  </div>
                </div>
              </div>

              <div className="q-kpi-card">
                <div className="kpi-card-inner">
                  <div className="kpi-icon-wrap converted-wrap">
                    <FileCheck size={24} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-label">CONVERTED TO INVOICE</span>
                    <h2 className="kpi-value converted-text">{stats.convertedCount || 0}</h2>
                    <span className="kpi-sub">Orders fulfilled & billed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="q-filter-card">
              <div className="q-filter-top">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchQuotations();
                  }}
                  className="q-search-wrap"
                >
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search quotations by #, customer, company, phone, email, or item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => {
                        setSearchTerm("");
                        fetchQuotations();
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </form>

                {/* Status Tabs */}
                <div className="q-status-tabs">
                  <button
                    className={`q-tab ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({stats.totalCount})
                  </button>
                  <button
                    className={`q-tab ${statusFilter === "Pending" ? "active" : ""}`}
                    onClick={() => setStatusFilter("Pending")}
                  >
                    Pending ({stats.pendingCount})
                  </button>
                  <button
                    className={`q-tab success-tab ${statusFilter === "Approved" ? "active" : ""}`}
                    onClick={() => setStatusFilter("Approved")}
                  >
                    Approved ({stats.approvedCount})
                  </button>
                  <button
                    className={`q-tab converted-tab ${statusFilter === "Converted to Invoice" ? "active" : ""}`}
                    onClick={() => setStatusFilter("Converted to Invoice")}
                  >
                    Converted ({stats.convertedCount})
                  </button>
                  <button
                    className={`q-tab ${statusFilter === "Draft" ? "active" : ""}`}
                    onClick={() => setStatusFilter("Draft")}
                  >
                    Drafts ({stats.draftCount})
                  </button>
                </div>
              </div>

              <div className="q-filter-bottom">
                <div className="filter-group">
                  <label>Sort By:</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="newest">Newest Quotation First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount_high">Highest Amount (₹)</option>
                    <option value="amount_low">Lowest Amount (₹)</option>
                    <option value="validUntil">Validity (Expiring Soonest)</option>
                    <option value="customer_asc">Customer Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quotations Table */}
            <div className="q-table-container">
              {loading ? (
                <div className="q-loading-state">
                  <div className="q-spinner"></div>
                  <p>Loading commercial quotations...</p>
                </div>
              ) : filteredQuotations.length === 0 ? (
                <div className="q-empty-state">
                  <FileText size={52} color="#94a3b8" />
                  <h3>No Quotations Found</h3>
                  <p>
                    {searchTerm || statusFilter !== "all"
                      ? "No quotations match your search criteria."
                      : "No quotations have been created yet. Click 'Create Quotation' to get started."}
                  </p>
                  <button className="q-btn primary" onClick={handleOpenCreateBuilder}>
                    <Plus size={16} />
                    <span>Create First Quotation</span>
                  </button>
                </div>
              ) : (
                <div className="q-table-scroll">
                  <table className="q-table">
                    <thead>
                      <tr>
                        <th>QUOTATION #</th>
                        <th>CUSTOMER & COMPANY</th>
                        <th>DATE & VALIDITY</th>
                        <th>ITEMS</th>
                        <th style={{ textAlign: "right" }}>TOTAL ESTIMATE</th>
                        <th>STATUS</th>
                        <th style={{ textAlign: "center" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotations.map((q) => {
                        const isConverted = q.status === "Converted to Invoice";
                        const isApproved = q.status === "Approved";
                        const isPending = q.status === "Pending" || !q.status;

                        return (
                          <tr key={q._id} className={isConverted ? "row-converted" : isApproved ? "row-approved" : ""}>
                            {/* Quotation Number */}
                            <td>
                              <div className="table-meta-cell">
                                <span
                                  className="table-q-num"
                                  onClick={() => setPreviewQuotation(q)}
                                  title="Click to preview quotation"
                                >
                                  {q.quotationNumber || q.docNumber}
                                </span>
                                {q.convertedInvoiceNumber && (
                                  <span className="converted-link-tag">
                                    Invoice: {q.convertedInvoiceNumber}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Customer */}
                            <td>
                              <div className="table-customer-cell">
                                <strong className="cust-name">{q.customerName}</strong>
                                {q.customerCompany && (
                                  <span className="cust-company">
                                    <Building size={12} /> {q.customerCompany}
                                  </span>
                                )}
                                <div className="cust-contacts">
                                  {q.customerPhone && <span>{q.customerPhone}</span>}
                                  {q.customerEmail && <span>• {q.customerEmail}</span>}
                                </div>
                              </div>
                            </td>

                            {/* Dates */}
                            <td>
                              <div className="table-date-cell">
                                <span className="date-main">
                                  {q.quotationDate ? new Date(q.quotationDate).toLocaleDateString("en-IN") : "N/A"}
                                </span>
                                <span className="date-sub">
                                  Valid to: {q.validUntil ? new Date(q.validUntil).toLocaleDateString("en-IN") : "30 days"}
                                </span>
                              </div>
                            </td>

                            {/* Items count */}
                            <td>
                              <span className="items-count-badge">
                                {Array.isArray(q.items) ? q.items.length : 1} items
                              </span>
                            </td>

                            {/* Total Amount */}
                            <td style={{ textAlign: "right" }}>
                              <strong className="table-amount">
                                ₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}
                              </strong>
                            </td>

                            {/* Status */}
                            <td>
                              <select
                                className={`table-status-select ${(q.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}
                                value={q.status || "Pending"}
                                onChange={(e) => handleUpdateStatus(q, e.target.value)}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Converted to Invoice">Converted</option>
                              </select>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="table-action-row">
                                {/* Convert to Invoice Button */}
                                {!isConverted && (
                                  <button
                                    className="action-convert-btn"
                                    onClick={() => handleOpenConvertModal(q)}
                                    title="Convert Approved Quotation to Tax Invoice"
                                  >
                                    <FileCheck size={14} />
                                    <span>Convert to Invoice</span>
                                  </button>
                                )}

                                {/* Preview */}
                                <button
                                  className="action-icon-btn"
                                  onClick={() => setPreviewQuotation(q)}
                                  title="Preview Quotation Sheet"
                                >
                                  <Eye size={15} />
                                </button>

                                {/* Download PDF */}
                                <button
                                  className="action-icon-btn"
                                  onClick={() => handleDownloadPdf(q)}
                                  title="Download A4 PDF"
                                >
                                  <Download size={15} />
                                </button>

                                {/* Edit */}
                                {!isConverted && (
                                  <button
                                    className="action-icon-btn"
                                    onClick={() => handleOpenEditBuilder(q)}
                                    title="Edit Quotation"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                )}

                                {/* Delete */}
                                <button
                                  className="action-icon-btn delete"
                                  onClick={() => handleDeleteQuotation(q)}
                                  title="Delete Quotation"
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
          </div>
        )}

        {/* MODAL 1: CATALOG PICKER MODAL */}
        {showCatalogModal && (
          <div className="modal-backdrop" onClick={() => setShowCatalogModal(false)}>
            <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">SAVED PRODUCTS CATALOG</span>
                  <h2>Select Products to Add</h2>
                  <p className="modal-subtitle">Click on any product to insert it into the quotation line items</p>
                </div>
                <button className="modal-close-btn" onClick={() => setShowCatalogModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="catalog-search-wrap" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Filter by product name, category, or SKU..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <select
                  value={catalogStatusFilter}
                  onChange={(e) => setCatalogStatusFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "#ffffff",
                    color: "#334155"
                  }}
                  title="Filter by publication status"
                >
                  <option value="all">All Products (Published & Unpublished)</option>
                  <option value="published">🟢 Published Only (Storefront)</option>
                  <option value="unpublished">🔴 Unpublished / Internal Only</option>
                </select>
              </div>

              <div className="catalog-list-scroll">
                {filteredCatalog.length === 0 ? (
                  <div className="empty-catalog">No products found matching your search.</div>
                ) : (
                  filteredCatalog.map((p) => {
                    const isUnpub = p.isVisible === false || p.isPublished === false || p.status === "unpublished" || p.status === "draft";
                    return (
                      <div key={p._id} className={`catalog-product-row ${isUnpub ? "is-unpublished" : ""}`} onClick={() => handleAddItem(p)}>
                        <div className="prod-info">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong>{p.name}</strong>
                            {isUnpub ? (
                              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                                🔴 Unpublished
                              </span>
                            ) : (
                              <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                                🟢 Published
                              </span>
                            )}
                          </div>
                          <span className="prod-cat">
                            Category: {p.category || "General"} {p.sku ? `• SKU: ${p.sku}` : ""}
                          </span>
                        </div>
                        <div className="prod-price-add">
                          <strong className="prod-price">₹{Number(p.price || 0).toLocaleString("en-IN")}</strong>
                          <button className="prod-add-btn">
                            <Plus size={14} /> Add
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: CONVERT TO INVOICE MODAL */}
        {convertModalQuotation && (
          <div className="modal-backdrop" onClick={() => setConvertModalQuotation(null)}>
            <div className="convert-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">CONVERT APPROVED QUOTATION</span>
                  <h2>Generate Official Tax Invoice</h2>
                  <p className="modal-subtitle">
                    Converting Quotation #{convertModalQuotation.quotationNumber || convertModalQuotation.docNumber}
                  </p>
                </div>
                <button className="modal-close-btn" onClick={() => setConvertModalQuotation(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="convert-summary-box">
                <div className="c-item">
                  <span>Customer:</span>
                  <strong>{convertModalQuotation.customerName}</strong>
                </div>
                <div className="c-item">
                  <span>Items Count:</span>
                  <strong>{Array.isArray(convertModalQuotation.items) ? convertModalQuotation.items.length : 1}</strong>
                </div>
                <div className="c-item">
                  <span>Total Invoice Amount:</span>
                  <strong className="c-total">₹{Number(convertModalQuotation.grandTotal || 0).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div className="convert-form-section">
                <div className="form-group">
                  <label>Initial Invoice Payment Status *</label>
                  <select
                    value={convertPaymentStatus}
                    onChange={(e) => setConvertPaymentStatus(e.target.value)}
                  >
                    <option value="Pending">🟡 Pending Settlement (Open Balance)</option>
                    <option value="Partially Paid">🟠 Partially Paid (With Advance Deposit)</option>
                    <option value="Paid">🟢 Paid in Full</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Invoice Payment Terms *</label>
                  <select
                    value={convertPaymentTerms}
                    onChange={(e) => setConvertPaymentTerms(e.target.value)}
                  >
                    <option value="Immediate">Due on Receipt (Immediate)</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days (Standard)</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Net 90">Net 90 Days</option>
                  </select>
                </div>

                {convertPaymentStatus === "Partially Paid" && (
                  <div className="form-group">
                    <label>Advance Amount Paid So Far (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      max={convertModalQuotation.grandTotal}
                      placeholder="e.g. 10000"
                      value={convertAmountPaid}
                      onChange={(e) => setConvertAmountPaid(e.target.value)}
                    />
                    {convertAmountPaid && (
                      <span className="balance-hint">
                        Remaining balance to be tracked: ₹{(Math.max(0, convertModalQuotation.grandTotal - Number(convertAmountPaid))).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  className="q-btn secondary"
                  onClick={() => setConvertModalQuotation(null)}
                >
                  Cancel
                </button>
                <button
                  className="q-btn primary"
                  disabled={converting}
                  onClick={handleConvertToInvoice}
                >
                  {converting ? "Generating Invoice..." : "Confirm & Create Invoice"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: QUOTATION PREVIEW MODAL */}
        {previewQuotation && (
          <div className="modal-backdrop" onClick={() => setPreviewQuotation(null)}>
            <div className="preview-sheet-modal" onClick={(e) => e.stopPropagation()}>
              <div className="preview-top-actions">
                <div className="preview-meta-title">
                  <span className="p-eyebrow">ESTIMATE PREVIEW</span>
                  <h2>{previewQuotation.quotationNumber || previewQuotation.docNumber}</h2>
                  <span className={`p-status-pill ${(previewQuotation.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                    {previewQuotation.status || "Pending"}
                  </span>
                </div>
                <div className="preview-btn-group">
                  <button className="q-btn primary" onClick={() => handleDownloadPdf(previewQuotation)}>
                    <Download size={15} />
                    <span>Download A4 PDF</span>
                  </button>
                  {previewQuotation.status !== "Converted to Invoice" && previewQuotation._id && (
                    <button
                      className="q-btn secondary"
                      onClick={() => {
                        handleOpenConvertModal(previewQuotation);
                        setPreviewQuotation(null);
                      }}
                    >
                      <FileCheck size={15} />
                      <span>Convert to Invoice</span>
                    </button>
                  )}
                  <button className="preview-close-btn" onClick={() => setPreviewQuotation(null)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* A4 Format Sheet */}
              <div className="quotation-a4-sheet">
                <div className="sheet-header">
                  <div className="sheet-logo-info">
                    <img src="/logo1.png" alt="ETOSM" style={{ height: "36px", marginBottom: "8px" }} />
                    <p className="sheet-company-title">ETOSM TECHNOLOGY</p>
                    <p className="sheet-subtext">2/167, Merkukadu, Ramapuram, Tiruchengodu, Namakkal, Tamil Nadu - 637202</p>
                    <p className="sheet-subtext">Mobile: +91 88070 80216 | Email: support@etosmtechnology.in</p>
                  </div>
                  <div className="sheet-quote-meta">
                    <h3>PRICE QUOTATION</h3>
                    <div className="meta-lines">
                      <div><span>Quote No:</span><strong>{previewQuotation.quotationNumber || previewQuotation.docNumber}</strong></div>
                      <div><span>Date:</span><strong>{previewQuotation.quotationDate ? new Date(previewQuotation.quotationDate).toLocaleDateString("en-IN") : "N/A"}</strong></div>
                      <div><span>Valid Until:</span><strong style={{ color: "#e3000f" }}>{previewQuotation.validUntil ? new Date(previewQuotation.validUntil).toLocaleDateString("en-IN") : "30 days"}</strong></div>
                      <div><span>Place of Supply:</span><strong>{previewQuotation.placeOfSupply || "Tamil Nadu (33)"}</strong></div>
                      <div><span>Payment Terms:</span><strong>{previewQuotation.paymentTerms || "Net 15"}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="sheet-client-strip">
                  <div className="client-block">
                    <h4>QUOTATION FOR:</h4>
                    <strong>{previewQuotation.customerName || previewQuotation.clientName || previewQuotation.userName || "Valued Client"}</strong>
                    {previewQuotation.customerCompany && <p>{previewQuotation.customerCompany}</p>}
                    <p><strong>Billing Address:</strong> {previewQuotation.customerAddress || (previewQuotation.placeOfSupply ? `${previewQuotation.placeOfSupply}, India` : "Tamil Nadu, India")}</p>
                    {previewQuotation.shippingSameAsBilling === false && previewQuotation.shippingAddress && previewQuotation.shippingAddress !== previewQuotation.customerAddress && (
                      <p><strong>Delivery Site:</strong> {previewQuotation.shippingAddress} {previewQuotation.shippingName ? `(${previewQuotation.shippingName})` : ""}</p>
                    )}
                    {previewQuotation.customerPhone && <p>Phone: {previewQuotation.customerPhone}</p>}
                    {previewQuotation.customerEmail && <p>Email: {previewQuotation.customerEmail}</p>}
                    {previewQuotation.customerGstin && <p>GSTIN: {previewQuotation.customerGstin}</p>}
                  </div>
                </div>

                {/* Items Table */}
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>#</th>
                      <th style={{ width: "45%" }}>Item Description</th>
                      <th style={{ width: "10%", textAlign: "center" }}>Qty</th>
                      <th style={{ width: "15%", textAlign: "right" }}>Rate (₹)</th>
                      <th style={{ width: "10%", textAlign: "right" }}>GST</th>
                      <th style={{ width: "15%", textAlign: "right" }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewQuotation.items || []).map((it, idx) => {
                      const itemTitle = (it.name || it.productName || it.title || it.description || "").trim() || "Product / Electronic Component";
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{itemTitle}</strong>
                            {it.description && it.description !== itemTitle && (
                              <span className="it-desc">{it.description}</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>{it.quantity}</td>
                          <td style={{ textAlign: "right" }}>₹{Number(it.unitPrice || 0).toLocaleString("en-IN")}</td>
                          <td style={{ textAlign: "right" }}>{it.gstPercent || 18}%</td>
                          <td style={{ textAlign: "right" }}>₹{Number(it.totalAmount || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Sheet Bottom Grid */}
                <div className="sheet-bottom-row">
                  <div className="sheet-terms-box">
                    <h4>TERMS & CONDITIONS:</h4>
                    <p style={{ whiteSpace: "pre-line" }}>{previewQuotation.notes || "Standard commercial terms apply."}</p>
                  </div>
                  <div className="sheet-totals-box">
                    <div className="st-row">
                      <span>Subtotal:</span>
                      <span>₹{Number(previewQuotation.grossSubtotal || previewQuotation.grandTotal).toLocaleString("en-IN")}</span>
                    </div>
                    {Number(previewQuotation.totalDiscount) > 0 && (
                      <div className="st-row disc">
                        <span>Discount:</span>
                        <span>- ₹{Number(previewQuotation.totalDiscount).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="st-row">
                      <span>GST (Tax):</span>
                      <span>₹{Number(previewQuotation.totalTax || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="st-row grand">
                      <span>TOTAL ESTIMATE:</span>
                      <strong>₹{Number(previewQuotation.grandTotal || 0).toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="st-words">
                      <span>{numberToWordsINR(previewQuotation.grandTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="sheet-footer-sign">
                  <div>
                    <p>Thank you for your business enquiry!</p>
                  </div>
                  <div className="sign-box">
                    <strong>For ETOSM TECHNOLOGY</strong>
                    <span>Authorized Signatory</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default QuotationManagementPage;