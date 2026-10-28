import React, { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Search,
  Box,
  RefreshCw,
  LayoutGrid,
  List,
  BatteryCharging,
  Cpu,
  Layers,
  Volume2,
  ShieldCheck,
  Zap,
  Package,
  ChevronDown,
  X
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import API_BASE_URL from "../apiConfig";
import "./AllProductsPage.css";

// Curated Category list matching the reference image layout
const BASE_CATEGORIES = [
  { key: "All", name: "All Categories", icon: LayoutGrid },
  { key: "Battery Packs", name: "Battery Packs", icon: BatteryCharging },
  { key: "Battery Management System", name: "Battery Management System", icon: ShieldCheck },
  { key: "Amplifier", name: "Amplifier", icon: Volume2 }
];

const normalizeCat = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, ""); // normalize plural "components" vs "component"

const getCategoryIcon = (catName) => {
  const name = String(catName || "").toLowerCase();
  if (name.includes("all")) return LayoutGrid;
  if (name.includes("pack") || name.includes("cell") || name.includes("battery")) return BatteryCharging;
  if (name.includes("bms") || name.includes("management system") || name.includes("protection")) return ShieldCheck;
  if (name.includes("component") || name.includes("pcb")) return Layers;
  if (name.includes("amp") || name.includes("audio") || name.includes("sound")) return Volume2;
  if (name.includes("power") || name.includes("smps") || name.includes("supply")) return Zap;
  return Package;
};

const AllProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get("category");
    if (catParam) setSelectedCategory(catParam);
    const searchParam = params.get("search");
    if (searchParam) setSearchTerm(searchParam);

    fetchData();
  }, [location.search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products/all`),
        fetch(`${API_BASE_URL}/categories`)
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();

      if (Array.isArray(prodData)) setProducts(prodData);
      if (Array.isArray(catData)) setCategories(catData);
    } catch (err) {
      console.error("Failed to load catalog products:", err);
    } finally {
      setLoading(false);
    }
  };

  // Merge static base categories with any dynamic categories fetched from DB without duplicates
  const displayCategories = useMemo(() => {
    const list = [...BASE_CATEGORIES];
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        const catName = cat?.name || String(cat);
        if (!catName || catName === "BATTERY PACKS" || catName === "BMS Solutions") return; // ignore duplicates/unwanted
        const norm = normalizeCat(catName);
        const alreadyExists = list.some(
          (b) => normalizeCat(b.name) === norm || normalizeCat(b.key) === norm
        );
        if (!alreadyExists) {
          list.push({
            key: catName,
            name: catName,
            icon: getCategoryIcon(catName)
          });
        }
      });
    }
    return list;
  }, [categories]);

  // Filtering
  const filteredProducts = products.filter((product) => {
    if (product.isVisible === false) return false;

    // Category match
    const normSelected = normalizeCat(selectedCategory);
    const prodCatNorm = normalizeCat(product.category);
    const prodSubNorm = normalizeCat(product.subcategory);

    const matchesCategory =
      selectedCategory === "All" ||
      (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase()) ||
      (product.subcategory && product.subcategory.toLowerCase() === selectedCategory.toLowerCase()) ||
      (prodCatNorm && normSelected && (prodCatNorm === normSelected || prodCatNorm.includes(normSelected) || normSelected.includes(prodCatNorm))) ||
      (prodSubNorm && normSelected && (prodSubNorm === normSelected || prodSubNorm.includes(normSelected)));

    if (!searchTerm) {
      return matchesCategory;
    }

    const cleanTerm = searchTerm.toLowerCase().trim();
    const skuDigits = cleanTerm.replace(/[^0-9]/g, "");
    const skuOnlyTerm = cleanTerm.replace(/^(sku|item|code)[\s:\-_#]*/i, "").trim();

    const nameMatch = product.name?.toLowerCase().includes(cleanTerm);
    const catMatch = product.category?.toLowerCase().includes(cleanTerm);
    const subcatMatch = product.subcategory?.toLowerCase().includes(cleanTerm);

    let skuMatch = false;
    if (product.sku != null && product.sku !== "") {
      const pSkuStr = String(product.sku).toLowerCase().trim();
      const digitsInSku = pSkuStr.replace(/[^0-9]/g, "");
      skuMatch = (
        pSkuStr === cleanTerm ||
        pSkuStr.includes(cleanTerm) ||
        cleanTerm.includes(pSkuStr) ||
        (skuOnlyTerm && (pSkuStr === skuOnlyTerm || pSkuStr.includes(skuOnlyTerm) || skuOnlyTerm.includes(pSkuStr))) ||
        (skuDigits && digitsInSku && (digitsInSku === skuDigits || digitsInSku.includes(skuDigits))) ||
        `sku: ${pSkuStr}`.includes(cleanTerm) ||
        `sku ${pSkuStr}`.includes(cleanTerm)
      );
    }

    return skuMatch || ((nameMatch || catMatch || subcatMatch) && matchesCategory);
  });

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "rating") return (b.averageRating || 0) - (a.averageRating || 0);
    return 0;
  });

  return (
    <div className="all-products-page">
      <Header />

      {/* =========================================================
          SECTION 1: HERO BANNER (MATCHING REFERENCE IMAGE)
          ========================================================= */}
      <section className="catalog-hero-section">
        <div className="catalog-hero-container">
          <div className="catalog-hero-content">
            <span className="catalog-hero-eyebrow">OUR PRODUCTS</span>
            <h1 className="catalog-hero-title">All Products Catalog</h1>
            <p className="catalog-hero-subtitle">
              Explore our range of power supplies, battery packs, BMS solutions, audio modules, and electronic components. Find reliable products designed to meet your project requirements.
            </p>
          </div>

          <div className="catalog-hero-visual">
            <div className="catalog-hero-image-wrap">
              <img
                src="/catalog-hardware-hd-cutout.png"
                alt="EToSM Electronic Hardware & Battery Packs"
                className="catalog-hero-components-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 2: FLOATING FILTER & CONTROL BAR (PILL CONTAINER)
          ========================================================= */}
      <div className="catalog-controls-outer">
        <div className="catalog-floating-bar">
          {/* 1. Search Box */}
          <div className="cat-search-wrap">
            <Search size={18} className="cat-search-icon" />
            <input
              type="text"
              placeholder="Search for products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="cat-search-clear-btn" onClick={() => setSearchTerm("")} title="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          {/* 2. Category Icon Buttons (Icon Circle Above, Text Below) */}
          <div className="cat-icon-pills-row">
            {displayCategories.map((cat) => {
              const IconComp = cat.icon;
              const isActive = selectedCategory.toLowerCase() === cat.key.toLowerCase();
              return (
                <button
                  key={cat.key}
                  className={`cat-pill-btn ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.key)}
                  title={cat.name}
                >
                  <div className="cat-pill-circle">
                    <IconComp size={18} />
                  </div>
                  <span className="cat-pill-label">{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Sort By Selector */}
          <div className="cat-sort-wrap">
            <label className="cat-sort-label">Sort By:</label>
            <div className="cat-select-box">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="default">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown size={14} className="cat-select-chevron" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION 3: TOOLBAR (COUNT & VIEW MODE TOGGLE)
          ========================================================= */}
      <div className="catalog-toolbar-wrap">
        <div className="catalog-results-counter">
          <span>Showing <strong className="highlight-count">{sortedProducts.length}</strong> products</span>
          {selectedCategory !== "All" && (
            <span className="cat-active-chip">
              {selectedCategory}
              <button onClick={() => setSelectedCategory("All")} title="Clear filter">
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        <div className="catalog-view-modes">
          <button
            className={`cat-view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`cat-view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* =========================================================
          SECTION 4: PRODUCT CARDS LISTING (GRID OR LIST)
          ========================================================= */}
      <main className="catalog-content-container">
        {loading ? (
          <div className="catalog-loading-box">
            <RefreshCw size={36} className="catalog-spin" />
            <p>Loading full products catalog...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="catalog-empty-box">
            <Box size={52} className="empty-box-icon" />
            <h3>No products found</h3>
            <p>Try searching for a different keyword or reset the category filters.</p>
            <button
              className="cat-reset-btn"
              onClick={() => {
                setSelectedCategory("All");
                setSearchTerm("");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "catalog-products-grid" : "catalog-products-list"}>
            {sortedProducts.map((product, idx) => (
              <ProductCard
                key={product._id || idx}
                product={product}
                variant="catalog"
                index={idx}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AllProductsPage;
