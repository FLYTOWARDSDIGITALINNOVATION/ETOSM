import API_BASE_URL from "../apiConfig";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Package,
  CheckCircle2,
  Filter,
  X,
  Sparkles,
  Loader2
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AdminBestsellersPage.css";

const AdminBestsellersPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterView, setFilterView] = useState("all"); // "all" | "available"
  const [toast, setToast] = useState(null);

  // Auth check
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
      return;
    }
    fetchData();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/products-stats?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/categories?t=${Date.now()}`)
      ]);

      const prodsData = await prodRes.json();
      const catsData = await catRes.json();

      setProducts(Array.isArray(prodsData) ? prodsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (err) {
      console.error("Error loading bestsellers data:", err);
      showToast("Failed to load products. Please check connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Only products explicitly marked as isBestseller: true are live!
  const liveProducts = useMemo(() => {
    return products.filter((p) => p.isBestseller === true);
  }, [products]);

  // Set of live product IDs for fast O(1) lookup
  const liveProductIds = useMemo(() => {
    return new Set(liveProducts.map((p) => p._id));
  }, [liveProducts]);

  // Toggle Bestseller status (Add or Remove)
  const handleToggleBestseller = async (productId, currentIsLive, productName) => {
    if (togglingId) return; // Prevent spamming
    setTogglingId(productId);

    const newStatus = !currentIsLive;
    const currentToken = token || localStorage.getItem("token");

    if (!currentToken) {
      showToast("Authentication session expired. Please log in again.", "error");
      setTogglingId(null);
      return;
    }

    const payload = {
      isBestseller: newStatus,
      ...(newStatus ? { isVisible: true } : {})
    };

    try {
      // 1. Attempt dedicated toggle-bestseller endpoint
      let res = await fetch(`${API_BASE_URL}/admin/product/${productId}/toggle-bestseller`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      });

      // 2. Fallback to /admin/product/:id if 404
      if (res.status === 404) {
        res = await fetch(`${API_BASE_URL}/admin/product/${productId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${res.status}`);
      }

      // Update state locally
      setProducts((prev) =>
        prev.map((p) =>
          p._id === productId
            ? { ...p, isBestseller: newStatus, ...(newStatus ? { isVisible: true } : {}) }
            : p
        )
      );

      // Trigger cross-tab sync so Home Page updates instantly
      localStorage.setItem("etosm_bestsellers_updated", String(Date.now()));
      window.dispatchEvent(new Event("storage"));

      if (newStatus) {
        showToast(`⭐ Added "${productName}" to Home Page Bestsellers!`, "success");
      } else {
        showToast(`Removed "${productName}" from Bestsellers.`, "info");
      }
    } catch (err) {
      console.error("Failed to toggle bestseller:", err);
      showToast(err.message || "Failed to update bestseller status. Try again.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // Filtered Catalog for adding
  const filteredCatalog = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      // View filter: show only items not yet in bestsellers
      if (filterView === "available" && liveProductIds.has(p._id)) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = (p.name || "").toLowerCase().includes(query);
        const skuMatch = (p.sku || "").toLowerCase().includes(query);
        const catMatch = (p.category || "").toLowerCase().includes(query);
        if (!nameMatch && !skuMatch && !catMatch) return false;
      }
      return true;
    });
  }, [products, selectedCategory, filterView, searchTerm, liveProductIds]);

  return (
    <AdminLayout>
      <div className="bestsellers-page-container">
        {/* Toast Notification */}
        {toast && (
          <div className={`bestseller-toast ${toast.type}`}>
            {toast.type === "success" && <CheckCircle2 size={18} />}
            {toast.type === "info" && <Sparkles size={18} />}
            {toast.type === "error" && <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="bestsellers-header">
          <div className="bestsellers-header-text">
            <div className="bestsellers-title-row">
              <span className="bestsellers-star-badge">
                <Star size={18} fill="#d97706" color="#d97706" />
              </span>
              <h1>Bestsellers Management</h1>
            </div>
            <p>
              Select which products appear in the <strong>"Bestselling Products"</strong> carousel on the customer storefront home page.
            </p>
          </div>

          <div className="bestsellers-header-actions">
            <button
              className="btn-preview-home"
              onClick={() => window.open("/#shop-section", "_blank")}
              title="Open storefront home page in a new tab"
            >
              <ExternalLink size={16} />
              <span>Preview on Home Page</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: Active Bestsellers on Home Page */}
        <div className="bestsellers-card active-bestsellers-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">
                ⭐ Currently Live on Home Page
                <span className="bestseller-count-badge badge-custom">
                  {liveProducts.length} Featured
                </span>
              </h2>
              <p className="card-subtitle">
                {liveProducts.length === 0
                  ? "No products currently selected. Add products from the catalog below to feature them on the storefront home page."
                  : `These ${liveProducts.length} product${liveProducts.length > 1 ? "s are" : " is"} currently live in the customer home page Bestselling Products carousel.`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bestsellers-loading">
              <Loader2 size={32} className="spin-icon" />
              <span>Loading bestsellers...</span>
            </div>
          ) : liveProducts.length === 0 ? (
            <div className="bestsellers-empty-state">
              <div className="empty-icon-box">
                <Star size={36} color="#d97706" />
              </div>
              <h3>No Bestsellers Selected Yet</h3>
              <p>
                Browse the catalog below and click <strong>"+ Add to Bestsellers"</strong> on any product to display it on the customer home page carousel.
              </p>
            </div>
          ) : (
            <div className="active-bestsellers-grid">
              {liveProducts.map((product) => {
                const isToggling = togglingId === product._id;
                const displayImg =
                  product.images && product.images.length > 0
                    ? product.images[0]
                    : product.image || "/placeholder.jpg";

                return (
                  <div key={product._id} className="active-bestseller-card">
                    <div className="card-media">
                      <img src={displayImg} alt={product.name} />
                      <span className="live-star-badge">
                        <Star size={13} fill="#fff" color="#fff" />
                        Live on Home
                      </span>
                    </div>

                    <div className="card-details">
                      <span className="product-category">{product.category || "General"}</span>
                      <h4 className="product-name" title={product.name}>
                        {product.name}
                      </h4>
                      <div className="product-meta">
                        <span className="product-price">₹{Number(product.price || 0).toLocaleString("en-IN")}</span>
                        <span className={`stock-pill ${product.stock > 0 ? "in-stock" : "out-of-stock"}`}>
                          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                        </span>
                      </div>
                    </div>

                    <div className="card-action">
                      <button
                        className="btn-remove-bestseller"
                        disabled={isToggling}
                        onClick={() => handleToggleBestseller(product._id, true, product.name)}
                        title="Remove from home page bestsellers"
                      >
                        {isToggling ? (
                          <Loader2 size={15} className="spin-icon" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        <span>Remove from Home</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Catalog - Add / Manage Products */}
        <div className="bestsellers-card catalog-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">
                <Package size={20} color="#2563eb" />
                Product Catalog ({filteredCatalog.length} products)
              </h2>
              <p className="card-subtitle">
                Search and click "+ Add to Bestsellers" to feature any product on the home page.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="catalog-filter-bar">
            <div className="catalog-search-box">
              <Search size={18} color="#64748b" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm("")}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="catalog-filters">
              <select
                className="catalog-select"
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
                className="catalog-select"
                value={filterView}
                onChange={(e) => setFilterView(e.target.value)}
              >
                <option value="all">All Products</option>
                <option value="available">Not Yet on Home Page</option>
              </select>
            </div>
          </div>

          {/* Catalog Products Table */}
          {loading ? (
            <div className="bestsellers-loading">
              <Loader2 size={32} className="spin-icon" />
              <span>Loading catalog...</span>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="bestsellers-empty-state">
              <Package size={36} color="#94a3b8" />
              <h3>No matching products found</h3>
              <p>Try clearing your search query or choosing another category filter.</p>
            </div>
          ) : (
            <div className="catalog-table-wrap">
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((prod) => {
                    const isLiveOnHome = liveProductIds.has(prod._id);
                    const isToggling = togglingId === prod._id;
                    const displayImg =
                      prod.images && prod.images.length > 0
                        ? prod.images[0]
                        : prod.image || "/placeholder.jpg";

                    return (
                      <tr key={prod._id} className={isLiveOnHome ? "row-featured" : ""}>
                        <td className="col-product">
                          <img
                            src={displayImg}
                            alt={prod.name}
                            className="catalog-prod-thumb"
                          />
                          <div className="catalog-prod-info">
                            <span className="catalog-prod-name">{prod.name}</span>
                            {prod.sku && <span className="catalog-prod-sku">SKU: {prod.sku}</span>}
                          </div>
                        </td>
                        <td>
                          <span className="catalog-category-tag">{prod.category || "General"}</span>
                        </td>
                        <td className="col-price">
                          ₹{Number(prod.price || 0).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <span
                            className={`stock-pill ${prod.stock > 0 ? "in-stock" : "out-of-stock"}`}
                          >
                            {prod.stock > 0 ? `${prod.stock} in stock` : "Out of stock"}
                          </span>
                        </td>
                        <td>
                          {isLiveOnHome ? (
                            <span className="status-badge-featured">
                              <Star size={13} fill="#d97706" color="#d97706" />
                              ⭐ Live on Home
                            </span>
                          ) : (
                            <span className="status-badge-standard">Standard</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {isLiveOnHome ? (
                            <button
                              className="btn-action-remove"
                              disabled={isToggling}
                              onClick={() => handleToggleBestseller(prod._id, true, prod.name)}
                              title="Remove from home page"
                            >
                              {isToggling ? (
                                <Loader2 size={14} className="spin-icon" />
                              ) : (
                                <X size={14} />
                              )}
                              <span>Remove</span>
                            </button>
                          ) : (
                            <button
                              className="btn-action-add"
                              disabled={isToggling}
                              onClick={() => handleToggleBestseller(prod._id, false, prod.name)}
                              title="Add to home page bestsellers"
                            >
                              {isToggling ? (
                                <Loader2 size={14} className="spin-icon" />
                              ) : (
                                <Plus size={14} />
                              )}
                              <span>+ Add to Bestsellers</span>
                            </button>
                          )}
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
    </AdminLayout>
  );
};

export default AdminBestsellersPage;
