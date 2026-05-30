import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FaQuoteRight, FaStar, FaHeartbeat, FaRunning, FaArrowRight } from 'react-icons/fa';
import Header from "../components/Header";
import SidebarFilters from "../components/SidebarFilters";
import Hero from "../components/Hero";
import CollectionGrid from "../components/CollectionGrid";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import API_BASE_URL from "../apiConfig";

import "./HomePage.css";

export default function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]); // Real orders from DB
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get("search");
    if (query) {
      setSearchTerm(query);
      // Optional: scroll to products section
      setTimeout(() => {
        const collection = document.querySelector('.collection-section');
        if (collection) collection.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [location.search]);
  const [filters, setFilters] = useState({
    deals: [],
    delivery: [],
    maxPrice: 2000,
    minPrice: 0,
    minRating: 0,
    payOnDelivery: false
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/products`)
      .then((res) => res.json())
      .then((data) => {
        setAllProducts(data);
        setFilteredProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
        setLoading(false);
      });

    // Fetch real recent orders
    fetch(`${API_BASE_URL}/orders/public/recent`)
      .then(res => res.json())
      .then(data => setRecentOrders(data))
      .catch(err => console.error("Failed to fetch recent orders", err));
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term.toLowerCase());
  };

  useEffect(() => {
    let result = [...allProducts];
    if (searchTerm) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
      );
    }
    result = result.filter(p => p.price >= (filters.minPrice || 0) && p.price <= filters.maxPrice);
    if (filters.minRating > 0) {
      result = result.filter(p => (p.averageRating || 0) >= filters.minRating);
    }
    if (filters.deals.includes("republic")) {
      result = result.filter(p => p.discountPercent > 0 || p.tag === "Sale");
    }
    setFilteredProducts(result);
  }, [filters, searchTerm, allProducts]);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="home" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header onSearch={handleSearch} />
      <Hero />
      <CollectionGrid />

      {/* Main Shop Section */}
      <div id="shop-section" className="shop-layout container">
        <div className="mobile-filter-toggle">
          <button onClick={() => setShowMobileFilters(!showMobileFilters)}>
            {showMobileFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        <SidebarFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          className={showMobileFilters ? "mobile-active" : ""}
        />

        <div className="shop-main">
          <section className="collection-compact">
            <p className="item-count">{filteredProducts.length} items found</p>
          </section>

          <section className="products-grid-container">
            {loading ? (
              <p>Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <div className="no-results">
                <h3>No products match your filters</h3>
              </div>
            ) : (
              <div className="products-view">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>



      {/* --- FOOTER --- */}
      <Footer />
    </div>
  );
}

