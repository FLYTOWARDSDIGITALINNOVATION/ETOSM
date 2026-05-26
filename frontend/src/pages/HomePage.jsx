import React, { useState, useEffect } from "react";
import { FaQuoteRight, FaStar, FaHeartbeat, FaRunning, FaArrowRight } from 'react-icons/fa';
import Header from "../components/Header";
import SidebarFilters from "../components/SidebarFilters";
import Hero from "../components/Hero";
import CollectionGrid from "../components/CollectionGrid";
import ProductCard from "../components/ProductCard";
import API_BASE_URL from "../apiConfig";

import "./HomePage.css";

export default function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]); // Real orders from DB
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
    <div className="home" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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

      {/* --- LIVE COMMUNITY RESULTS (DYNAMIC FROM DB) --- */}
      <section className="motion-review-section">
        <div className="bg-glow"></div>

        <div className="section-intro">
          <span className="premium-tag">Live Activity Feed</span>
          <h2 className="motion-title">LIVE STORE <span className="italic-magenta">FEED</span></h2>
          <p style={{ color: '#c71585', marginTop: '10px', fontSize: '1.2rem', fontWeight: '800' }}>
            THIS DATA IS NOW LIVE FROM YOUR DATABASE
          </p>
        </div>

        <div className="motion-grid">
          {recentOrders && recentOrders.length > 0 ? (
            recentOrders.map((order, idx) => (
              <div className="parallax-card" key={order._id || idx}>
                <div className="card-inner-layer">
                  <div className="card-top">
                    <div className="status-badge" style={{ background: '#fff1f2', color: '#c71585', fontWeight: '800' }}>
                      <span className="pulse-dot"></span>
                      RECENT ORDER
                    </div>
                    <div className="rev-icon-floating"><FaRunning /></div>
                  </div>

                  <div className="testimonial-text-box">
                    <FaQuoteRight className="quote-watermark" />
                    <p className="testimonial-para" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', color: '#1a1a1a' }}>
                      <strong>{order.userName || "Customer"}</strong> just purchased <strong>{order.productName}</strong>.
                      Verified security clearance successful.
                    </p>
                  </div>

                  <div className="card-footer-info">
                    <div className="user-details">
                      <h4 className="user-name-inter" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800' }}>
                        {order.totalAmount ? `₹${order.totalAmount.toFixed(2)}` : "Verified Elite"}
                      </h4>
                      <p className="user-role-magenta" style={{ fontWeight: '700' }}>LIVE FROM DB</p>
                    </div>
                    <div className="activity-date">
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="parallax-card">
              <div className="card-inner-layer" style={{ justifyContent: 'center', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontWeight: '600' }}>Syncing community activity...</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="footer-site">
        <div className="footer-container">
          <div className="footer-column brand-col">
            <h4 className="footer-col-title">HIGHGRIP</h4>
            <p className="footer-address">
              2/167, Merkukadu, Ramapuram,<br />
              Tiruchengodu, Namakkal,<br />
              Tamil Nadu-637202
            </p>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">QUICK LINKS</h4>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/products">Our Products</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/contact">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">PRODUCTS</h4>
            <ul className="footer-links">
              <li><a href="/products/yoga">Yoga Socks</a></li>
              <li><a href="/products/compression">Compression Sleeves</a></li>
              <li><a href="/products/thigh-high">Thigh High Socks</a></li>
              <li><a href="/products/medical">Medical Stockings</a></li>
              <li><a href="/products/trampoline">Trampoline Socks</a></li>
              <li><a href="/products/ankle">Ankle Grip Socks</a></li>
              <li><a href="/products/knee-pads">Crawling Knee Pads</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">GET IN TOUCH</h4>
            <p className="footer-contact-text">
              If you have any enquiries, please do not hesitate to contact us.<br /><br />
              Email: support@etosmtechnology.in<br />
              Phone: +91 88070 80216
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Copyright © 2026 by Highgripsox. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

