import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Printer,
  Trash2,
  Edit,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Eye,
  X,
  Layers,
  ArrowUpDown,
  History,
  Check,
  Star
} from "lucide-react";
import { jsPDF } from "jspdf";
import AdminLayout from "./AdminLayout";
import "./ProductManagementPage.css";

// Helper: Convert number to Indian currency words
function numberToWordsINR(num) {
  if (num === 0) return "Zero Rupees Only";
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if ((n = n.toString()).length > 9) return 'Overflow';
    const n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (Number(n_array[1]) !== 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (Number(n_array[2]) !== 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (Number(n_array[3]) !== 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (Number(n_array[4]) !== 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (Number(n_array[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str.trim();
  }

  const rounded = Math.round(num);
  return `Rupees ${inWords(rounded)} Only`;
}

const ProductManagementPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Main state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // "all", "in_stock", "low_stock", "out_of_stock"
  const [bestsellerFilter, setBestsellerFilter] = useState("all"); // "all", "bestsellers", "standard"
  const [sortBy, setSortBy] = useState("newest"); // "newest", "name_asc", "price_asc", "price_desc", "stock_asc", "stock_desc"

  // Multi-selection for quotation/billing
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // Inline stock updating indicators
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [descModalProduct, setDescModalProduct] = useState(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [savedDocs, setSavedDocs] = useState([]);

  // Quotation / Bill Generator state
  const [docType, setDocType] = useState("quotation"); // "quotation" or "bill"
  const [docNumber, setDocNumber] = useState("");
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    gstin: ""
  });
  const [quoteItems, setQuoteItems] = useState([]);
  const [quoteNotes, setQuoteNotes] = useState(
    "1. Quotation is valid for 15 days from the date of issue.\n2. Payment terms: 100% advance or as agreed.\n3. Standard manufacturer warranty applies."
  );

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
      return;
    }
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/products-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const fetchSavedDocs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quotations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSavedDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch saved quotations/bills:", err);
    }
  };

  // Quick Inline Stock Adjustment
  const handleStockUpdate = async (productId, newStock) => {
    const safeStock = Math.max(0, Number(newStock) || 0);
    setUpdatingStockId(productId);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/product/${productId}/stock`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stock: safeStock })
      });
      if (res.ok) {
        setProducts(prev =>
          prev.map(p => (p._id === productId ? { ...p, stock: safeStock } : p))
        );
      } else {
        alert("Failed to update stock");
      }
    } catch (err) {
      console.error("Stock update error:", err);
    } finally {
      setUpdatingStockId(null);
    }
  };

  // Visibility toggle
  const handleToggleVisibility = async (productId, currentVisibility) => {
    const newVisibility = !(currentVisibility !== false);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/product/${productId}/toggle-visibility`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isVisible: newVisibility })
      });
      if (res.ok) {
        setProducts(prev =>
          prev.map(p => (p._id === productId ? { ...p, isVisible: newVisibility } : p))
        );
      }
    } catch (err) {
      console.error("Toggle visibility error:", err);
    }
  };

  // Bestseller toggle
  const handleToggleBestseller = async (productId, currentBestseller) => {
    const newStatus = !currentBestseller;
    const currentToken = token || localStorage.getItem("token");
    try {
      let res = await fetch(`${API_BASE_URL}/admin/product/${productId}/toggle-bestseller`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ isBestseller: newStatus })
      });
      if (res.status === 404) {
        res = await fetch(`${API_BASE_URL}/admin/product/${productId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify({ isBestseller: newStatus })
        });
      }
      if (res.ok) {
        setProducts(prev =>
          prev.map(p => (p._id === productId ? { ...p, isBestseller: newStatus } : p))
        );
      }
    } catch (err) {
      console.error("Toggle bestseller error:", err);
    }
  };

  // Delete product
  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to permanently delete this product?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/product/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p._id !== productId));
        selectedProductIds.delete(productId);
        setSelectedProductIds(new Set(selectedProductIds));
      } else {
        alert("Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  // Copy Product ID
  const copyProductId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle selection
  const toggleSelectProduct = (productId) => {
    const next = new Set(selectedProductIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    setSelectedProductIds(next);
  };

  // Toggle select all visible
  const handleSelectAll = (filteredList) => {
    if (selectedProductIds.size === filteredList.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredList.map(p => p._id)));
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const pName = (product.name || "").toLowerCase();
          const pCat = (product.category || "").toLowerCase();
          const pSub = (product.subcategory || "").toLowerCase();
          const pId = (product.productId || "").toLowerCase();
          const pSku = String(product.sku || "").toLowerCase();
          const pDesc = (product.description || "").toLowerCase();

          const matches =
            pName.includes(term) ||
            pCat.includes(term) ||
            pSub.includes(term) ||
            pId.includes(term) ||
            pSku.includes(term) ||
            pDesc.includes(term);

          if (!matches) return false;
        }

        // Category Filter
        if (selectedCategory !== "all") {
          if (product.category !== selectedCategory) return false;
        }

        // Stock Filter
        if (stockFilter === "in_stock") {
          if ((product.stock || 0) <= 10) return false;
        } else if (stockFilter === "low_stock") {
          if ((product.stock || 0) <= 0 || (product.stock || 0) > 10) return false;
        } else if (stockFilter === "out_of_stock") {
          if ((product.stock || 0) > 0) return false;
        }

        // Bestseller Filter
        if (bestsellerFilter === "bestsellers") {
          if (!product.isBestseller) return false;
        } else if (bestsellerFilter === "standard") {
          if (product.isBestseller) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
        if (sortBy === "stock_asc") return (a.stock || 0) - (b.stock || 0);
        if (sortBy === "stock_desc") return (b.stock || 0) - (a.stock || 0);
        return 0; // default newest/server order
      });
  }, [products, searchTerm, selectedCategory, stockFilter, bestsellerFilter, sortBy]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalStock = 0;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValuation = 0;
    let bestsellerCount = 0;

    products.forEach(p => {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      totalStock += stock;
      totalValuation += stock * price;

      if (p.isBestseller) bestsellerCount++;

      if (stock > 10) inStock++;
      else if (stock > 0) lowStock++;
      else outOfStock++;
    });

    return {
      totalProducts: products.length,
      inStock,
      lowStock,
      outOfStock,
      bestsellerCount,
      totalValuation: Math.round(totalValuation)
    };
  }, [products]);

  // Export Catalog as CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      alert("No products to export");
      return;
    }
    const headers = [
      "Product ID",
      "Product Name",
      "SKU",
      "Category",
      "Subcategory",
      "Price (Excl GST)",
      "GST %",
      "Price (Incl GST)",
      "Stock",
      "Stock Status",
      "Description"
    ];

    const rows = products.map(p => {
      const price = Number(p.price) || 0;
      const gst = Number(p.gstPercent) || 18;
      const priceWithGst = (price + (price * gst) / 100).toFixed(2);
      const stock = Number(p.stock) || 0;
      const status = stock > 10 ? "In Stock" : stock > 0 ? "Low Stock" : "Out of Stock";
      const cleanDesc = (p.description || "").replace(/"/g, '""').replace(/\n/g, " ");

      return [
        `"${p.productId || (p.sku ? `PRD-${p.sku}` : p._id)}"`,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${p.sku || ""}"`,
        `"${(p.category || "").replace(/"/g, '""')}"`,
        `"${(p.subcategory || "").replace(/"/g, '""')}"`,
        price,
        gst,
        priceWithGst,
        stock,
        `"${status}"`,
        `"${cleanDesc}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ETOSM_Product_Catalog_Billing_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initialize Quotation / Billing Generator
  const openQuoteGenerator = (singleProduct = null) => {
    let targetProducts = [];
    if (singleProduct) {
      targetProducts = [singleProduct];
    } else if (selectedProductIds.size > 0) {
      targetProducts = products.filter(p => selectedProductIds.has(p._id));
    } else {
      // Default to visible products if none explicitly checked
      targetProducts = filteredProducts.slice(0, 3);
    }

    const items = targetProducts.map(p => {
      const unitPrice = Number(p.price) || 0;
      const gstPercent = Number(p.gstPercent) || 18;
      const gstAmount = Number(((unitPrice * gstPercent) / 100).toFixed(2));
      const totalAmount = Number((unitPrice + gstAmount).toFixed(2));

      return {
        productId: p.productId || (p.sku ? `PRD-${p.sku}` : `PRD-${p._id.toString().slice(-5).toUpperCase()}`),
        name: p.name || "",
        description: p.description || "",
        availableStock: Number(p.stock) || 0,
        quantity: 1,
        unitPrice: unitPrice,
        gstPercent: gstPercent,
        gstAmount: gstAmount,
        totalAmount: totalAmount
      };
    });

    const randNum = Math.floor(10000 + Math.random() * 90000);
    const initialPrefix = docType === "bill" ? "INV" : "QT";
    setDocNumber(`${initialPrefix}-${new Date().getFullYear()}-${randNum}`);
    setQuoteItems(items);
    setQuoteModalOpen(true);
  };

  // Recalculate quotation item
  const updateQuoteItem = (index, field, value) => {
    setQuoteItems(prev => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const gstPercent = Number(item.gstPercent) || 0;

      const subtotalItem = unitPrice * qty;
      const gstItem = (subtotalItem * gstPercent) / 100;
      const totalItem = subtotalItem + gstItem;

      item.quantity = qty;
      item.unitPrice = unitPrice;
      item.gstPercent = gstPercent;
      item.gstAmount = Number(gstItem.toFixed(2));
      item.totalAmount = Number(totalItem.toFixed(2));

      next[index] = item;
      return next;
    });
  };

  const removeQuoteItem = (index) => {
    setQuoteItems(prev => prev.filter((_, i) => i !== index));
  };

  const addQuoteItemFromCatalog = (productId) => {
    const p = products.find(prod => prod._id === productId);
    if (!p) return;

    const unitPrice = Number(p.price) || 0;
    const gstPercent = Number(p.gstPercent) || 18;
    const gstAmount = Number(((unitPrice * gstPercent) / 100).toFixed(2));

    setQuoteItems(prev => [
      ...prev,
      {
        productId: p.productId || (p.sku ? `PRD-${p.sku}` : `PRD-${p._id.toString().slice(-5).toUpperCase()}`),
        name: p.name,
        description: p.description || "",
        availableStock: Number(p.stock) || 0,
        quantity: 1,
        unitPrice: unitPrice,
        gstPercent: gstPercent,
        gstAmount: gstAmount,
        totalAmount: Number((unitPrice + gstAmount).toFixed(2))
      }
    ]);
  };

  // Quotation Totals
  const quoteTotals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;

    quoteItems.forEach(item => {
      const lineSub = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);
      const lineGst = (lineSub * (Number(item.gstPercent) || 0)) / 100;
      subtotal += lineSub;
      totalTax += lineGst;
      grandTotal += lineSub + lineGst;
    });

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  }, [quoteItems]);

  // Generate & Download PDF
  const handleGeneratePdf = () => {
    if (quoteItems.length === 0) {
      alert("Please add at least one product item");
      return;
    }
    if (!customer.name.trim()) {
      alert("Please enter customer name");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const primaryColor = [227, 0, 15]; // #e3000f ETOSM Brand Red
      const slateDark = [15, 23, 42]; // #0f172a
      const slateGray = [100, 116, 139]; // #64748b

      let y = 16;

      // Header Banner
      doc.setFillColor(...slateDark);
      doc.rect(14, y, 182, 22, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.text("ETOSM BATTERY & ELECTRONICS", 20, y + 9);

      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text("Lithium Battery Packs • BMS Boards • Electronic Components • EV Solutions", 20, y + 15);

      // Document Type Ribbon
      const docTitle = docType === "bill" ? "TAX INVOICE / BILL" : "COMMERCIAL QUOTATION";
      doc.setFillColor(...primaryColor);
      doc.rect(130, y + 4, 60, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text(docTitle, 135, y + 13);

      y += 28;

      // Document Meta & Customer Info Grid
      doc.setTextColor(...slateDark);
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.text("BILLED TO / CUSTOMER DETAILS:", 14, y);
      doc.text("DOCUMENT DETAILS:", 120, y);

      y += 5;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);

      // Customer info box
      doc.text(`Name: ${customer.name || "N/A"}`, 14, y);
      doc.text(`Phone: ${customer.phone || "N/A"}`, 14, y + 4);
      doc.text(`Email: ${customer.email || "N/A"}`, 14, y + 8);
      if (customer.company) doc.text(`Company: ${customer.company}`, 14, y + 12);
      if (customer.gstin) doc.text(`GSTIN: ${customer.gstin}`, 14, y + 16);
      if (customer.address) {
        const addrLines = doc.splitTextToSize(`Address: ${customer.address}`, 90);
        doc.text(addrLines, 14, y + (customer.gstin ? 20 : 16));
      }

      // Doc details box
      doc.text(`Doc Number: ${docNumber || "N/A"}`, 120, y);
      doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 120, y + 4);
      if (docType === "quotation") {
        const validDate = new Date();
        validDate.setDate(validDate.getDate() + 15);
        doc.text(`Valid Until: ${validDate.toLocaleDateString("en-IN")}`, 120, y + 8);
      } else {
        doc.text(`Payment Status: Authorized / Due`, 120, y + 8);
      }
      doc.text(`Currency: Indian Rupee (INR)`, 120, y + 12);

      y += 28;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...slateDark);

      doc.text("#", 16, y + 5.5);
      doc.text("PRODUCT ID", 24, y + 5.5);
      doc.text("ITEM & DESCRIPTION", 55, y + 5.5);
      doc.text("QTY", 122, y + 5.5);
      doc.text("UNIT (Rs)", 135, y + 5.5);
      doc.text("GST%", 156, y + 5.5);
      doc.text("TOTAL (Rs)", 172, y + 5.5);

      y += 9;

      // Table Rows
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);

      quoteItems.forEach((item, idx) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        const rowBg = idx % 2 === 0 ? 255 : 248;
        doc.setFillColor(rowBg, rowBg, rowBg);
        doc.rect(14, y - 4, 182, 10, "F");

        doc.setTextColor(30, 41, 59);
        doc.text(String(idx + 1), 16, y + 2);
        doc.setFont("Helvetica", "bold");
        doc.text(item.productId || "PRD-N/A", 24, y + 2);

        doc.setFont("Helvetica", "normal");
        const nameText = item.name.length > 34 ? item.name.substring(0, 32) + "..." : item.name;
        doc.text(nameText, 55, y + 2);

        doc.text(String(item.quantity), 125, y + 2);
        doc.text(item.unitPrice.toFixed(2), 135, y + 2);
        doc.text(`${item.gstPercent}%`, 158, y + 2);
        doc.setFont("Helvetica", "bold");
        doc.text(item.totalAmount.toFixed(2), 172, y + 2);

        y += 9;
      });

      y += 4;

      // Summary Totals Box
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(248, 250, 252);
      doc.rect(115, y, 81, 32, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(115, y, 81, 32, "S");

      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(70, 70, 70);
      doc.text("Subtotal (Excl. Tax):", 120, y + 7);
      doc.text(`Rs. ${quoteTotals.subtotal.toFixed(2)}`, 165, y + 7);

      doc.text("Total GST (Taxes):", 120, y + 14);
      doc.text(`Rs. ${quoteTotals.totalTax.toFixed(2)}`, 165, y + 14);

      doc.setFillColor(...slateDark);
      doc.rect(115, y + 20, 81, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("GRAND TOTAL:", 120, y + 27.5);
      doc.text(`Rs. ${quoteTotals.grandTotal.toFixed(2)}`, 160, y + 27.5);

      // Amount in words
      doc.setFontSize(8);
      doc.setTextColor(...slateDark);
      doc.setFont("Helvetica", "italic");
      const inWords = numberToWordsINR(quoteTotals.grandTotal);
      doc.text(`Amount in Words: ${inWords}`, 14, y + 10);

      // Terms & Notes Box
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("TERMS & CONDITIONS / NOTES:", 14, y + 20);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...slateGray);
      const splitNotes = doc.splitTextToSize(quoteNotes, 90);
      doc.text(splitNotes, 14, y + 25);

      // Signatory
      y += 45;
      doc.setTextColor(...slateDark);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("FOR ETOSM BATTERY & ELECTRONICS", 130, y);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Authorized Signatory", 130, y + 12);
      doc.line(130, y + 10, 180, y + 10);

      // Save PDF
      const filename = `${docType.toUpperCase()}_${docNumber || Date.now()}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + err.message);
    }
  };

  // Save Quotation / Bill to Backend
  const handleSaveDocument = async () => {
    if (!customer.name.trim()) {
      alert("Customer Name is required to save document");
      return;
    }
    if (quoteItems.length === 0) {
      alert("Please add at least one product item");
      return;
    }

    try {
      const payload = {
        docType,
        docNumber,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerCompany: customer.company,
        customerAddress: customer.address,
        customerGstin: customer.gstin,
        items: quoteItems,
        subtotal: quoteTotals.subtotal,
        taxAmount: quoteTotals.totalTax,
        grandTotal: quoteTotals.grandTotal,
        notes: quoteNotes,
        status: docType === "bill" ? "Invoiced" : "Active"
      };

      const res = await fetch(`${API_BASE_URL}/admin/quotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`${docType === "bill" ? "Bill / Invoice" : "Quotation"} saved successfully!`);
        setQuoteModalOpen(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to save document");
      }
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  // Delete saved quotation from archive
  const handleDeleteSavedDoc = async (id) => {
    if (!window.confirm("Delete this document from history?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quotations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedDocs(prev => prev.filter(d => d._id !== id));
      }
    } catch (err) {
      console.error("Delete doc error:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="pm-container">
        {/* Module Header */}
        <div className="pm-header">
          <div className="pm-header-top">
            <div className="pm-title-area">
              <span className="pm-module-tag">
                <Package size={13} /> Admin Module 1
              </span>
              <h1>Product Management</h1>
              <p>
                Maintain product name, product ID, category, price, stock, and description.
                Data is maintained ready for storefront billing, quotation creation, and inventory control.
              </p>
            </div>

            <div className="pm-header-actions">
              <button
                className="pm-btn pm-btn-quote"
                onClick={() => openQuoteGenerator()}
                title="Create commercial quotation or tax invoice with selected products"
              >
                <FileText size={16} />
                <span>Create Quote / Bill</span>
                {selectedProductIds.size > 0 && (
                  <span className="badge">{selectedProductIds.size}</span>
                )}
              </button>

              <button
                className="pm-btn pm-btn-primary"
                onClick={() => navigate("/admin/add-product")}
              >
                <Plus size={16} /> Add Product
              </button>

              <button
                className="pm-btn pm-btn-secondary"
                onClick={handleExportCSV}
                title="Download complete catalog spreadsheet with Product IDs, prices, and stock"
              >
                <Download size={15} /> Export Catalog
              </button>

              <button
                className="pm-btn pm-btn-secondary"
                onClick={() => {
                  fetchSavedDocs();
                  setHistoryModalOpen(true);
                }}
                title="View generated quotations and bills history"
              >
                <History size={15} /> Doc History
              </button>
            </div>
          </div>
        </div>

        {/* KPI Overview Cards */}
        <div className="pm-kpi-grid">
          <div className="pm-kpi-card total">
            <div className="pm-kpi-icon">
              <Package size={22} />
            </div>
            <div className="pm-kpi-info">
              <h3>{kpis.totalProducts}</h3>
              <p>Total Products</p>
            </div>
          </div>

          <div className="pm-kpi-card instock">
            <div className="pm-kpi-icon">
              <CheckCircle2 size={22} />
            </div>
            <div className="pm-kpi-info">
              <h3>{kpis.inStock}</h3>
              <p>In Stock (&gt;10)</p>
            </div>
          </div>

          <div className="pm-kpi-card lowstock">
            <div className="pm-kpi-icon">
              <AlertTriangle size={22} />
            </div>
            <div className="pm-kpi-info">
              <h3>{kpis.lowStock}</h3>
              <p>Low Stock (1-10)</p>
            </div>
          </div>

          <div className="pm-kpi-card outofstock">
            <div className="pm-kpi-icon">
              <XCircle size={22} />
            </div>
            <div className="pm-kpi-info">
              <h3>{kpis.outOfStock}</h3>
              <p>Out of Stock (0)</p>
            </div>
          </div>

          <div className="pm-kpi-card valuation">
            <div className="pm-kpi-icon">
              <TrendingUp size={22} />
            </div>
            <div className="pm-kpi-info">
              <h3>₹{kpis.totalValuation.toLocaleString("en-IN")}</h3>
              <p>Inventory Valuation</p>
            </div>
          </div>
        </div>

        {/* Controls Card: Search & Filters */}
        <div className="pm-controls-card">
          <div className="pm-search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search product name, Product ID, SKU, category, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8"
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="pm-filters-group">
            <select
              className="pm-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="pm-select"
              value={bestsellerFilter}
              onChange={(e) => setBestsellerFilter(e.target.value)}
            >
              <option value="all">Bestsellers: All</option>
              <option value="bestsellers">⭐ Bestsellers on Home ({kpis.bestsellerCount})</option>
              <option value="standard">Standard Products</option>
            </select>

            <select
              className="pm-select"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">Stock: All Items</option>
              <option value="in_stock">In Stock (&gt;10 units)</option>
              <option value="low_stock">Low Stock (1-10 units)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>

            <select
              className="pm-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort: Catalog Order</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="stock_asc">Stock (Low to High)</option>
              <option value="stock_desc">Stock (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Banner */}
        {selectedProductIds.size > 0 && (
          <div className="pm-bulk-banner">
            <div className="pm-bulk-banner-left">
              <span className="count-pill">{selectedProductIds.size} Selected</span>
              <span>Products ready for Quotation / Billing generation</span>
            </div>
            <div className="pm-bulk-actions">
              <button
                className="pm-btn pm-btn-primary"
                onClick={() => openQuoteGenerator()}
              >
                <FileText size={15} /> Create Quotation / Bill
              </button>
              <button
                className="pm-btn pm-btn-secondary"
                onClick={() => setSelectedProductIds(new Set())}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Main Content: Table or Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
            <p>Loading products and inventory data...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ background: "white", padding: "60px 20px", textAlign: "center", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <Package size={48} color="#cbd5e1" style={{ marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px", color: "#1e293b" }}>No Products Found</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Try adjusting your search query, category, or stock level filters.
            </p>
          </div>
        ) : (
          /* PRODUCT GRID VIEW */
          <div className="products-grid">
            {filteredProducts.map((p) => {
              const price = Number(p.price) || 0;
              const gst = Number(p.gstPercent) || 18;
              const priceInclGst = (price + (price * gst) / 100).toFixed(2);
              const stock = Number(p.stock) || 0;
              const prodId = p.productId || (p.sku ? `PRD-${p.sku}` : `PRD-${p._id.toString().slice(-5).toUpperCase()}`);
              const isSelected = selectedProductIds.has(p._id);

              const stockStatus =
                stock > 10 ? "instock" : stock > 0 ? "lowstock" : "outofstock";
              const stockLabel =
                stock > 10 ? "In Stock" : stock > 0 ? "Low Stock" : "Out of Stock";

              return (
                <div
                  key={p._id}
                  className={`product-card ${p.isVisible === false ? "visibility-off" : ""} ${isSelected ? "selected" : ""}`}
                >
                  {/* Card Header: Multi-Select Checkbox & Product ID */}
                  <div className="product-card-top-bar">
                    <label className="card-checkbox-label" title="Select product for Quotation / Billing">
                      <input
                        type="checkbox"
                        className="pm-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(p._id)}
                      />
                      <span>Select</span>
                    </label>

                    <div
                      className="pm-id-badge"
                      onClick={() => copyProductId(prodId)}
                      title="Click to copy Product ID"
                    >
                      <span>{prodId}</span>
                      {copiedId === prodId ? (
                        <Check size={12} color="#10b981" />
                      ) : (
                        <Copy size={12} color="#94a3b8" />
                      )}
                    </div>
                  </div>

                  {/* Product Image */}
                  <div className="product-image">
                    <img
                      src={p.image ? `${API_BASE_URL}${p.image}` : "https://via.placeholder.com/200"}
                      alt={p.name}
                      onError={(e) => (e.target.src = "https://via.placeholder.com/200")}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="product-info">
                    <div className="category-row">
                      <span className="pm-category-pill">{p.category || "General"}</span>
                      {p.subcategory && (
                        <span className="pm-subcategory-pill">{p.subcategory}</span>
                      )}
                      {p.sku != null && p.sku !== "" && (
                        <span className="pm-sku-pill">
                          SKU: <strong>{p.sku}</strong>
                        </span>
                      )}
                    </div>

                    <h3 title={p.name}>{p.name}</h3>

                    <div className="card-price-row">
                      <span className="price">₹{price.toLocaleString("en-IN")}</span>
                      <span className="gst-subtext">+ GST {gst}% (₹{priceInclGst})</span>
                    </div>

                    {/* Stock & Quick Adjuster */}
                    <div className="card-stock-row">
                      <span className={`pm-stock-badge ${stockStatus}`}>
                        ● {stock} ({stockLabel})
                      </span>
                      <div className="pm-inline-stock">
                        <button
                          className="pm-inline-stock-btn"
                          onClick={() => handleStockUpdate(p._id, stock - 1)}
                          disabled={stock <= 0 || updatingStockId === p._id}
                          title="Decrease Stock"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="pm-inline-stock-input"
                          value={stock}
                          onChange={(e) => handleStockUpdate(p._id, e.target.value)}
                          disabled={updatingStockId === p._id}
                        />
                        <button
                          className="pm-inline-stock-btn"
                          onClick={() => handleStockUpdate(p._id, stock + 1)}
                          disabled={updatingStockId === p._id}
                          title="Increase Stock"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Description preview snippet */}
                    <div className="card-desc-wrap">
                      <p className="card-desc-text">
                        {p.description || "No description provided."}
                      </p>
                      <button
                        className="pm-desc-btn"
                        onClick={() => setDescModalProduct(p)}
                      >
                        View Specs & Details
                      </button>
                    </div>

                    {/* Home Visibility Toggle */}
                    <div className="visibility-toggle-row">
                      <span className={`status-badge ${p.isVisible !== false ? "on" : "off"}`}>
                        {p.isVisible !== false ? "🟢 Visible on Home" : "🔴 Hidden from Home"}
                      </span>
                      <label className="switch-toggle" title="Toggle Home Page Visibility">
                        <input
                          type="checkbox"
                          checked={p.isVisible !== false}
                          onChange={() => handleToggleVisibility(p._id, p.isVisible)}
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>

                    {/* Bestseller Toggle */}
                    <div className="visibility-toggle-row bestseller-row">
                      <span className={`status-badge ${p.isBestseller ? "bestseller-on" : "bestseller-off"}`}>
                        {p.isBestseller ? "⭐ Bestseller on Home" : "☆ Standard Product"}
                      </span>
                      <label className="switch-toggle bestseller-switch" title="Toggle Bestseller on Home Page">
                        <input
                          type="checkbox"
                          checked={!!p.isBestseller}
                          onChange={() => handleToggleBestseller(p._id, p.isBestseller)}
                        />
                        <span className="slider-round gold"></span>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="product-actions">
                    <button
                      className="btn-quote"
                      onClick={() => openQuoteGenerator(p)}
                      title="Add product to Quotation / Bill"
                    >
                      <FileText size={14} /> Quote / Bill
                    </button>
                    <button
                      className="btn-edit"
                      onClick={() => navigate(`/admin/edit-product/${p._id}`)}
                      title="Edit Product"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(p._id)}
                      title="Delete Product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Description & Technical Specifications Viewer */}
      {descModalProduct && (
        <div className="pm-modal-overlay" onClick={() => setDescModalProduct(null)}>
          <div className="pm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="pm-modal-header">
              <h2>
                <Package size={18} color="#e3000f" /> Product Information Detail
              </h2>
              <button className="pm-modal-close" onClick={() => setDescModalProduct(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="pm-modal-body">
              <div style={{ marginBottom: "16px" }}>
                <span className="pm-id-badge" style={{ marginBottom: "8px" }}>
                  Product ID: {descModalProduct.productId || descModalProduct._id}
                </span>
                <h3 style={{ margin: "4px 0", color: "#0f172a", fontSize: "18px" }}>
                  {descModalProduct.name}
                </h3>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Category: {descModalProduct.category} {descModalProduct.subcategory ? `> ${descModalProduct.subcategory}` : ""}
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Description:
                </h4>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#1e293b", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {descModalProduct.description || "No description provided."}
                </div>
              </div>

              {descModalProduct.specifications && descModalProduct.specifications.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                    Specifications (Used in Quotations):
                  </h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <tbody>
                      {descModalProduct.specifications.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 8px", fontWeight: "600", color: "#475569", width: "40%" }}>{s.label}</td>
                          <td style={{ padding: "6px 8px", color: "#0f172a" }}>{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="pm-modal-footer">
              <button
                className="pm-btn pm-btn-primary"
                onClick={() => {
                  const p = descModalProduct;
                  setDescModalProduct(null);
                  openQuoteGenerator(p);
                }}
              >
                <FileText size={15} /> Create Quotation with Item
              </button>
              <button className="pm-btn pm-btn-secondary" onClick={() => setDescModalProduct(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Interactive Quotation & Billing Document Generator */}
      {quoteModalOpen && (
        <div className="pm-modal-overlay" onClick={() => setQuoteModalOpen(false)}>
          <div className="pm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h2>
                <FileText size={20} color="#e3000f" />
                {docType === "bill" ? "Create Tax Invoice / Bill" : "Create Commercial Quotation"}
              </h2>
              <button className="pm-modal-close" onClick={() => setQuoteModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="pm-modal-body">
              {/* Document Type Selector */}
              <div className="pm-quote-tabs">
                <button
                  className={`pm-quote-tab ${docType === "quotation" ? "active" : ""}`}
                  onClick={() => {
                    setDocType("quotation");
                    const rand = Math.floor(10000 + Math.random() * 90000);
                    setDocNumber(`QT-${new Date().getFullYear()}-${rand}`);
                  }}
                >
                  📄 Commercial Quotation / Estimate
                </button>
                <button
                  className={`pm-quote-tab ${docType === "bill" ? "active" : ""}`}
                  onClick={() => {
                    setDocType("bill");
                    const rand = Math.floor(10000 + Math.random() * 90000);
                    setDocNumber(`INV-${new Date().getFullYear()}-${rand}`);
                  }}
                >
                  🧾 Tax Invoice / Bill
                </button>
              </div>

              {/* Document Meta Row */}
              <div className="pm-form-grid-3">
                <div className="pm-field-group">
                  <label>Document Number *</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                  />
                </div>
                <div className="pm-field-group">
                  <label>Document Date</label>
                  <input
                    type="text"
                    readOnly
                    value={new Date().toLocaleDateString("en-IN")}
                  />
                </div>
                <div className="pm-field-group">
                  <label>{docType === "bill" ? "Payment Due" : "Quotation Validity"}</label>
                  <input
                    type="text"
                    readOnly
                    value={docType === "bill" ? "Immediate / Net 15" : "15 Days"}
                  />
                </div>
              </div>

              {/* Customer / Client Details */}
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: "16px 0 8px" }}>
                Customer / Client Information
              </h4>
              <div className="pm-form-grid-2">
                <div className="pm-field-group">
                  <label>Customer / Client Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar / Green Energy Corp"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  />
                </div>
                <div className="pm-field-group">
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="pm-form-grid-3">
                <div className="pm-field-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </div>
                <div className="pm-field-group">
                  <label>Company / Firm</label>
                  <input
                    type="text"
                    placeholder="Optional company name"
                    value={customer.company}
                    onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                  />
                </div>
                <div className="pm-field-group">
                  <label>GSTIN / Tax ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={customer.gstin}
                    onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })}
                  />
                </div>
              </div>

              <div className="pm-field-group" style={{ marginBottom: "16px" }}>
                <label>Billing & Shipping Address</label>
                <input
                  type="text"
                  placeholder="Street address, City, State, PIN"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                />
              </div>

              {/* Line Items Table */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                  Product Line Items ({quoteItems.length})
                </h4>
                <select
                  className="pm-select"
                  style={{ maxWidth: "240px" }}
                  onChange={(e) => {
                    if (e.target.value) {
                      addQuoteItemFromCatalog(e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">+ Add Product from Catalog</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.productId || "PRD"} - {p.name} (₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pm-table-responsive">
                <table className="pm-quote-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "110px" }}>Product ID</th>
                      <th>Product Name & Description</th>
                      <th style={{ width: "80px" }}>Qty</th>
                      <th style={{ width: "100px" }}>Unit Price (₹)</th>
                      <th style={{ width: "80px" }}>GST %</th>
                      <th style={{ width: "110px" }}>Total (₹)</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteItems.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                          No products added to this document yet. Select from the dropdown above.
                        </td>
                      </tr>
                    ) : (
                      quoteItems.map((item, idx) => {
                        const stockWarn = item.quantity > item.availableStock;
                        return (
                          <tr key={idx}>
                            <td>
                              <span className="pm-id-badge">{item.productId}</span>
                              <div style={{ fontSize: "10px", color: stockWarn ? "#ef4444" : "#10b981", marginTop: "3px" }}>
                                {stockWarn ? `⚠️ Only ${item.availableStock} in stock` : `Stock: ${item.availableStock}`}
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                style={{ width: "100%", fontWeight: "600", marginBottom: "4px" }}
                                value={item.name}
                                onChange={(e) => updateQuoteItem(idx, "name", e.target.value)}
                              />
                              <input
                                type="text"
                                style={{ width: "100%", color: "#64748b", fontSize: "11px" }}
                                placeholder="Item description / specs"
                                value={item.description}
                                onChange={(e) => updateQuoteItem(idx, "description", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                style={{ width: "65px", textAlign: "center" }}
                                value={item.quantity}
                                onChange={(e) => updateQuoteItem(idx, "quantity", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                style={{ width: "85px" }}
                                value={item.unitPrice}
                                onChange={(e) => updateQuoteItem(idx, "unitPrice", e.target.value)}
                              />
                            </td>
                            <td>
                              <select
                                style={{ padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                                value={item.gstPercent}
                                onChange={(e) => updateQuoteItem(idx, "gstPercent", e.target.value)}
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td style={{ fontWeight: "700", color: "#0f172a" }}>
                              ₹{item.totalAmount.toFixed(2)}
                            </td>
                            <td>
                              <button
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                                onClick={() => removeQuoteItem(idx)}
                                title="Remove item"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary and Terms */}
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                    Terms & Conditions / Special Notes
                  </label>
                  <textarea
                    rows="4"
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      fontFamily: "inherit",
                      marginTop: "6px"
                    }}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                  />
                </div>

                <div className="pm-quote-summary-box">
                  <div className="pm-summary-row">
                    <span>Taxable Subtotal:</span>
                    <span>₹{quoteTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="pm-summary-row">
                    <span>GST (Estimated):</span>
                    <span>₹{quoteTotals.totalTax.toFixed(2)}</span>
                  </div>
                  <div className="pm-summary-row total">
                    <span>Grand Total:</span>
                    <span>₹{quoteTotals.grandTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", fontStyle: "italic" }}>
                    {numberToWordsINR(quoteTotals.grandTotal)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pm-modal-footer">
              <button
                className="pm-btn pm-btn-primary"
                onClick={handleGeneratePdf}
                title="Download formatted vector PDF"
              >
                <Download size={15} /> Download PDF
              </button>

              <button
                className="pm-btn pm-btn-quote"
                onClick={handleSaveDocument}
                title="Save this quotation or bill record into the system"
              >
                <FileText size={15} /> Save to System
              </button>

              <button className="pm-btn pm-btn-secondary" onClick={() => setQuoteModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Saved Quotations & Bills Archive */}
      {historyModalOpen && (
        <div className="pm-modal-overlay" onClick={() => setHistoryModalOpen(false)}>
          <div className="pm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "850px" }}>
            <div className="pm-modal-header">
              <h2>
                <History size={18} color="#e3000f" /> Quotations & Billing Archive
              </h2>
              <button className="pm-modal-close" onClick={() => setHistoryModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="pm-modal-body">
              {savedDocs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <FileText size={40} style={{ margin: "0 auto 10px", color: "#cbd5e1" }} />
                  <p>No quotations or bills saved yet. Generate one from Product Management!</p>
                </div>
              ) : (
                <div className="pm-table-responsive">
                  <table className="pm-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Doc Number</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Grand Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedDocs.map((doc) => (
                        <tr key={doc._id}>
                          <td>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: doc.docType === "bill" ? "#fee2e2" : "#f1f5f9",
                                color: doc.docType === "bill" ? "#b91c1c" : "#0f172a"
                              }}
                            >
                              {doc.docType === "bill" ? "Bill / Invoice" : "Quotation"}
                            </span>
                          </td>
                          <td>
                            <strong>{doc.docNumber}</strong>
                          </td>
                          <td>
                            <div>{doc.customerName}</div>
                            {doc.customerPhone && (
                              <div style={{ fontSize: "11px", color: "#64748b" }}>{doc.customerPhone}</div>
                            )}
                          </td>
                          <td>{new Date(doc.createdAt).toLocaleDateString("en-IN")}</td>
                          <td>{(doc.items || []).length} items</td>
                          <td style={{ fontWeight: "700" }}>₹{doc.grandTotal?.toFixed(2)}</td>
                          <td>
                            <button
                              className="pm-icon-btn delete"
                              onClick={() => handleDeleteSavedDoc(doc._id)}
                              title="Delete document"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pm-modal-footer">
              <button className="pm-btn pm-btn-secondary" onClick={() => setHistoryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ProductManagementPage;
