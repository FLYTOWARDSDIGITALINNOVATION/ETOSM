import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FaQuoteRight, FaStar, FaHeartbeat, FaRunning, FaArrowRight, FaGoogle, FaPen, FaTimes } from 'react-icons/fa';
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
  const [googleReviews, setGoogleReviews] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Verified Customer");
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  // Fetch approved Google reviews
  useEffect(() => {
    fetch(`${API_BASE_URL}/google-reviews`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGoogleReviews(data);
      })
      .catch(err => console.error("Failed to load Google reviews:", err));
  }, []);

  const handleSubmitGoogleReview = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newComment.trim()) {
      alert("Please enter a name and comment.");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/google-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          role: newRole.trim() || "Verified Customer",
          rating: Number(newRating),
          text: newComment.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Thank you! Your review has been submitted for admin approval.");
        setNewName("");
        setNewRole("Verified Customer");
        setNewRating(5);
        setNewComment("");
        setIsModalOpen(false);
      } else {
        alert(data.message || "Failed to submit review.");
      }
    } catch (error) {
      console.error("Failed to submit Google review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };
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

      {/* --- GOOGLE REVIEWS SECTION --- */}
      <section className="motion-review-section">
        <div className="bg-glow"></div>
        <div className="container">
          <div className="section-intro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <span className="premium-tag">Google Customer Reviews</span>
              <h2 className="motion-title">Trusted by Tech <span className="italic-primary">Professionals</span></h2>
            </div>
            
            {/* Google Aggregate Rating Badge */}
            <div className="google-aggregate-badge">
              <div className="google-brand-header">
                <FaGoogle className="g-brand-icon" style={{ color: '#4285F4', marginRight: '6px' }} />
                <span className="g-brand-text">Google</span>
              </div>
              <div className="g-rating-meta">
                <span className="g-rating-number">4.9</span>
                <div className="rating-stars-gold">
                  <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                </div>
              </div>
              <span className="g-rating-count">Based on 148+ verified reviews</span>
            </div>
          </div>

          <div className="motion-grid">
            {googleReviews.map((rev) => (
              <div key={rev._id || rev.id} className="parallax-card">
                <div className="card-inner-layer">
                  <div className="card-top">
                    <span className="status-badge">
                      <span className="pulse-dot"></span>
                      Verified Google Review
                    </span>
                    <FaGoogle className="rev-icon-floating" style={{ color: '#4285F4' }} />
                  </div>

                  <div className="testimonial-text-box">
                    <span className="quote-watermark">“</span>
                    <p className="testimonial-para">"{rev.text}"</p>
                  </div>

                  <div className="card-footer-info">
                    <div>
                      <h4 className="user-name-inter">{rev.name}</h4>
                      <span className="user-role-primary">{rev.role}</span>
                    </div>
                    <div>
                      <div className="rating-stars-gold" style={{ marginBottom: '5px' }}>
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} style={{ color: i < rev.rating ? '#ffb800' : '#e2e8f0' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', textAlign: 'right' }}>
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : rev.date || "Just now"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="write-review-cta" style={{ textAlign: 'center', marginTop: '50px' }}>
            <button className="write-google-btn" onClick={() => setIsModalOpen(true)}>
              <FaPen /> Write a Google Review
            </button>
          </div>
        </div>
      </section>

      {/* --- GOOGLE REVIEW MODAL --- */}
      {isModalOpen && (
        <div className="google-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="google-modal-close" onClick={() => setIsModalOpen(false)}>
              <FaTimes />
            </button>
            <div className="google-modal-header">
              <FaGoogle size={32} style={{ color: '#4285F4', marginBottom: '10px' }} />
              <h3>Submit a Google Review</h3>
              <p>Share your experience with ETOSM Technology products</p>
            </div>
            <form onSubmit={handleSubmitGoogleReview} className="google-modal-form">
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Your Professional Role / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. IoT Hobbyist, Audio Enthusiast (Optional)"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <div className="star-rating-selector">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`selector-star ${star <= newRating ? 'active' : ''}`}
                      onClick={() => setNewRating(star)}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Review Comment</label>
                <textarea
                  placeholder="Tell us about the product quality, shipping speed, or support experience..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows="4"
                  required
                ></textarea>
              </div>
              <button type="submit" className="google-modal-submit-btn">
                Post Review to Google
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <Footer />
    </div>
  );
}

