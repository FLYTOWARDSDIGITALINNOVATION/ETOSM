import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Search, Box, ArrowLeft, RefreshCw } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import API_BASE_URL from "../apiConfig";
import "./AllProductsPage.css";

const AllProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");
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

  // Filtering
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      product.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    return 0;
  });

  return (
    <div className="all-products-page">
      <Header />

      <main className="catalog-main container">
        {/* Breadcrumb / Top Bar */}
        <div className="catalog-top-bar">
          <Link to="/home" className="back-link">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="catalog-page-title">All Products Catalog</h1>
        </div>

        {/* Filter & Controls Bar */}
        <div className="catalog-controls">
          {/* Search Box */}
          <div className="catalog-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search catalog products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="category-pills">
            <button
              className={`pill ${selectedCategory === "All" ? "active" : ""}`}
              onClick={() => setSelectedCategory("All")}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                className={`pill ${selectedCategory === cat.name ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="sort-box">
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div className="catalog-summary">
          <span>Showing <strong>{sortedProducts.length}</strong> products</span>
          {selectedCategory !== "All" && (
            <span className="filter-badge">
              Category: {selectedCategory}{" "}
              <button onClick={() => setSelectedCategory("All")}>✕</button>
            </span>
          )}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="catalog-loading">
            <RefreshCw size={32} className="spin-icon" />
            <p>Loading full catalog...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="catalog-empty">
            <Box size={48} />
            <h3>No products found</h3>
            <p>Try resetting filters or searching for something else.</p>
            <button onClick={() => { setSelectedCategory("All"); setSearchTerm(""); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="catalog-grid">
            {sortedProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AllProductsPage;
