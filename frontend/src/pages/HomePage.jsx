import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  FaQuoteLeft,
  FaQuoteRight,
  FaUser,
  FaStar,
  FaArrowRight,
  FaGoogle,
  FaPen,
  FaTimes
} from "react-icons/fa";
import {
  ShieldCheck,
  Zap,
  Snowflake,
  Activity,
  Users,
  Settings,
  Layers,
  FileText,
  Headphones,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import CollectionGrid from "../components/CollectionGrid";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import API_BASE_URL from "../apiConfig";

import "./HomePage.css";

// Section 5 Default Featured Reviews from PDF
const defaultFeaturedReviews = [
  {
    id: "spec-rev-1",
    name: "Vikram Malhotra",
    role: "Industrial IoT Lead",
    rating: 5,
    text: "Quick shipping and excellent customer support. We use their customized battery packs for our outdoor telemetry sensor nodes. Great thermal management and reliable battery protection.",
    date: "Verified Customer"
  },
  {
    id: "spec-rev-2",
    name: "Dr. Ananya Sen",
    role: "Acoustic Consultant",
    rating: 5,
    text: "Used their 250V electrolytic capacitors for a power supply redesign in a high-fidelity valve amplifier. Extremely low ESR and stable capacitance under load. Audio clarity is amazing.",
    date: "Verified Customer"
  },
  {
    id: "spec-rev-3",
    name: "Arun Prakash",
    role: "Coimbatore, India",
    rating: 5,
    text: "The team is very helpful and professional. Got exactly what I needed for my project. Quality is top-notch!",
    date: "Verified Customer"
  }
];

export default function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [googleReviews, setGoogleReviews] = useState(defaultFeaturedReviews);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Verified Customer");
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const bestsellersRef = useRef(null);

  const scrollBestsellers = (direction) => {
    if (bestsellersRef.current) {
      // Scroll by roughly 2 to 3 card widths
      const scrollAmount = bestsellersRef.current.clientWidth * 0.8;
      bestsellersRef.current.scrollBy({
        left: direction === "next" ? scrollAmount : -scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // SEO document title & meta tags check
  useEffect(() => {
    document.title = "Electronic Components Online India | EToSM";

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content =
      "Find electronic components online in India at EToSM Technology. Explore power electronic components, battery packs, amplifiers and BMS solutions.";

    // Set meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content =
      "Electronic Components Online India, Electronic Components Store India, Power Electronic Components";
  }, []);

  // Fetch approved Google reviews
  useEffect(() => {
    fetch(`${API_BASE_URL}/google-reviews`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge API reviews while keeping the 2 PDF specified reviews first
          setGoogleReviews([...defaultFeaturedReviews.slice(0, 2), ...data]);
        }
      })
      .catch((err) => console.error("Failed to load Google reviews:", err));
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get("search");
    if (query) {
      navigate(`/all-products?search=${encodeURIComponent(query)}`, { replace: true });
      setSearchTerm(query);
    } else {
      setSearchTerm("");
    }
  }, [location.search, navigate]);

  const [filters, setFilters] = useState({
    deals: [],
    delivery: [],
    maxPrice: 1000000,
    minPrice: 0,
    minRating: 0
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/products/all`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllProducts(data);
          setFilteredProducts(data.filter((p) => p.isVisible !== false));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
        setLoading(false);
      });
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term.toLowerCase());
  };

  useEffect(() => {
    let result = [...allProducts];

    if (!searchTerm) {
      result = result.filter((p) => p.isVisible !== false);
      result = result.filter(
        (p) => p.price >= (filters.minPrice || 0) && p.price <= filters.maxPrice
      );
      if (filters.minRating > 0) {
        result = result.filter((p) => (p.averageRating || 0) >= filters.minRating);
      }
      if (filters.deals.includes("republic")) {
        result = result.filter((p) => p.discountPercent > 0 || p.tag === "Sale");
      }
    } else {
      const cleanTerm = searchTerm.toLowerCase().trim();
      const skuDigits = cleanTerm.replace(/[^0-9]/g, "");
      const skuOnlyTerm = cleanTerm.replace(/^(sku|item|code)[\s:\-_#]*/i, "").trim();

      result = result.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(cleanTerm);
        const catMatch = p.category?.toLowerCase().includes(cleanTerm);
        const subcatMatch = p.subcategory?.toLowerCase().includes(cleanTerm);
        let skuMatch = false;
        if (p.sku != null && p.sku !== "") {
          const pSkuStr = String(p.sku).toLowerCase().trim();
          const digitsInSku = pSkuStr.replace(/[^0-9]/g, "");
          skuMatch =
            pSkuStr === cleanTerm ||
            pSkuStr.includes(cleanTerm) ||
            cleanTerm.includes(pSkuStr) ||
            (skuOnlyTerm &&
              (pSkuStr === skuOnlyTerm ||
                pSkuStr.includes(skuOnlyTerm) ||
                skuOnlyTerm.includes(pSkuStr))) ||
            (skuDigits &&
              digitsInSku &&
              (digitsInSku === skuDigits || digitsInSku.includes(skuDigits))) ||
            `sku: ${pSkuStr}`.includes(cleanTerm) ||
            `sku ${pSkuStr}`.includes(cleanTerm);
        }
        return skuMatch || nameMatch || catMatch || subcatMatch;
      });
    }

    setFilteredProducts(result);
  }, [filters, searchTerm, allProducts]);

  const renderReviewCard = (rev, uniqueKey) => (
    <div key={uniqueKey} className="customer-review-card">
      <div className="review-quote-wrap">
        <FaQuoteLeft className="review-blue-quote" />
      </div>

      <p className="review-card-body">"{rev.text}"</p>

      <div className="review-card-bottom">
        <div className="review-author-wrap">
          <div className="review-avatar-circle">
            <FaUser className="review-avatar-icon" />
          </div>
          <div className="review-author-info">
            <h4 className="review-author-name">{rev.name}</h4>
            <span className="review-author-role">{rev.role}</span>
          </div>
        </div>

        <div className="review-stars-gold">
          {[...Array(rev.rating || 5)].map((_, i) => (
            <FaStar key={i} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="home" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header onSearch={handleSearch} />

      {/* =========================================================================
          SECTION 1: HERO SECTION
          ========================================================================= */}
      <Hero />

      {/* =========================================================================
          SECTION 2: PRODUCT CATEGORIES
          ========================================================================= */}
      <CollectionGrid />

      {/* =========================================================================
          SECTION 3: BESTSELLING PRODUCTS
          ========================================================================= */}
      <section className="bestsellers-section" id="shop-section">
        <div className="container">
          {/* Section 3 Header (Matching Reference Image & PDF) */}
          <div className="bestsellers-header-block">
            <span className="bestsellers-badge">— BESTSELLERS —</span>
            <h2 className="bestsellers-title">Bestselling Products</h2>
            <p className="bestsellers-description">
              Discover our popular electronic products for different power and electronic
              applications. From everyday components to power electronic components, browse our
              range to find suitable products for your projects and business needs.
            </p>
          </div>

          {/* Section 3: Bestselling Products 5-Card Carousel with Side Arrows (No boxes below) */}
          <div className="bestsellers-carousel-outer">
            <button
              className="bestsellers-arrow-btn prev"
              onClick={() => scrollBestsellers("prev")}
              aria-label="Previous products"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="bestsellers-carousel-track" ref={bestsellersRef}>
              {loading ? (
                <p style={{ padding: "40px", width: "100%", textAlign: "center", color: "#64748b" }}>
                  Loading products...
                </p>
              ) : filteredProducts.length === 0 ? (
                <div className="no-results" style={{ width: "100%", textAlign: "center", padding: "40px" }}>
                  <h3>No products found</h3>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div className="bestsellers-carousel-card" key={product._id}>
                    <ProductCard product={product} />
                  </div>
                ))
              )}
            </div>

            <button
              className="bestsellers-arrow-btn next"
              onClick={() => scrollBestsellers("next")}
              aria-label="Next products"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* View All Products Catalog CTA */}
          {!loading && (
            <div style={{ textAlign: "center", padding: "30px 0 10px" }}>
              <Link to="/all-products" className="bestsellers-view-all-btn">
                <span>View All Products Catalog</span>
                <FaArrowRight />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: WHY CHOOSE US?
          ========================================================================= */}
      <section className="why-choose-section">
        <div className="container">
          <div className="why-choose-header">
            <span className="why-choose-badge">WHY CHOOSE US</span>
            <h2 className="why-choose-title">
              Your Trusted Source for Electronic Components in India
            </h2>
            <p className="why-choose-lead">
              Finding the right electronic components is important for every project. At EToSM
              Technology, we offer a range of electronic products and power solutions to help you
              find products that suit your requirements.
            </p>
          </div>

          {/* 4 Key Pillars Grid (H3 tags from PDF Page 3) */}
          <div className="why-choose-pillars-grid">
            <div className="pillar-card">
              <div className="pillar-icon-wrap">
                <Layers size={22} />
              </div>
              <h3>Wide Range of Products</h3>
              <p>
                Explore battery packs, electronic components, amplifiers, battery management
                systems and power solutions in one place.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon-wrap">
                <FileText size={22} />
              </div>
              <h3>Clear Product Details</h3>
              <p>
                Check product features and specifications to understand what each product offers
                before making a decision.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon-wrap">
                <ShieldCheck size={22} />
              </div>
              <h3>Quality and Reliability</h3>
              <p>
                We focus on product quality, performance and safety to help you choose components
                for your applications, including projects that require power electronic components.
              </p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon-wrap">
                <Headphones size={22} />
              </div>
              <h3>Support for Your Needs</h3>
              <p>
                Have questions about a product? Contact our team for help finding options that suit
                your project or business requirements.
              </p>
            </div>
          </div>

          {/* Reference Image: Engineering Standards & Capabilities Banner */}
          <div className="engineering-standards-box">
            <div className="standards-left">
              <h3>Why Choose ETOSM Technology?</h3>
              <p>
                We combine engineering expertise with a commitment to quality, delivering electronic
                components that meet your performance and reliability needs.
              </p>
            </div>
            <div className="standards-grid">
              <div className="standard-item">
                <div className="std-icon-wrap">
                  <ShieldCheck size={22} />
                </div>
                <div className="std-item-text">
                  <strong>Quality Products</strong>
                  <span>Reliable and tested for consistent performance</span>
                </div>
              </div>

              <div className="standard-item">
                <div className="std-icon-wrap">
                  <Snowflake size={22} />
                </div>
                <div className="std-item-text">
                  <strong>Thermal Management</strong>
                  <span>Efficient cooling for longer life</span>
                </div>
              </div>

              <div className="standard-item">
                <div className="std-icon-wrap">
                  <ShieldCheck size={22} />
                </div>
                <div className="std-item-text">
                  <strong>Safety & Reliability</strong>
                  <span>Built with global safety standards</span>
                </div>
              </div>

              <div className="standard-item">
                <div className="std-icon-wrap">
                  <Activity size={22} />
                </div>
                <div className="std-item-text">
                  <strong>EMI Control</strong>
                  <span>Reduced interference for stable operation</span>
                </div>
              </div>

              <div className="standard-item">
                <div className="std-icon-wrap">
                  <Users size={22} />
                </div>
                <div className="std-item-text">
                  <strong>Engineering Support</strong>
                  <span>Our team is here to help you find the right solution</span>
                </div>
              </div>

              <div className="standard-item">
                <div className="std-icon-wrap">
                  <Settings size={22} />
                </div>
                <div className="std-item-text">
                  <strong>Custom Solutions</strong>
                  <span>Tailored products for your unique needs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 CTA: Explore Our Products */}
          <div className="why-choose-cta">
            <Link to="/all-products" className="why-choose-btn">
              <span>Explore Our Products</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: CUSTOMER REVIEWS
          ========================================================================= */}
      <section className="motion-review-section">
        <div className="container">
          {/* Centered Header from PDF & Reference Image */}
          <div className="reviews-section-header">
            <span className="reviews-eyebrow">WHAT OUR CUSTOMERS SAY</span>
            <h2 className="reviews-h2">What Our Customers Say About EToSM Technology</h2>
            <h3 className="reviews-subheading">Real Feedback. Real Trust.</h3>
            <p className="reviews-lead">
              Read about our customers' experiences with EToSM Technology and the products they
              use for their work.
            </p>
          </div>

          {/* Reviews Cards Grid (Matching Reference Image) */}
          <div className="reviews-cards-grid">
            {googleReviews.slice(0, 3).map((rev) => renderReviewCard(rev, rev._id || rev.id))}
          </div>

          {/* Carousel Pagination Dots from Reference Image */}
          <div className="reviews-carousel-dots">
            <span className="dot active"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>

          {/* Google Aggregate Social Proof & Write a Google Review CTA */}
          <div className="write-review-cta-wrap">
            <div className="google-aggregate-pill">
              <FaGoogle className="g-pill-icon" style={{ color: "#4285F4" }} />
              <span className="g-pill-score">4.9</span>
              <div className="g-pill-stars">
                <FaStar />
                <FaStar />
                <FaStar />
                <FaStar />
                <FaStar />
              </div>
              <span className="g-pill-count">Based on 148+ verified Google reviews</span>
            </div>

            <button className="write-google-btn" onClick={() => setIsModalOpen(true)}>
              <FaPen /> Write a Google Review
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: FINAL CALL TO ACTION (MATCHING REFERENCE IMAGE)
          ========================================================================= */}
      <section className="final-cta-section">
        <div className="container">
          <div className="final-cta-card">
            <div className="final-cta-pcb-overlay"></div>

            <div className="final-cta-left">
              <h2 className="final-cta-title">
                Looking for Electronic Components Online in India?
              </h2>
              <p className="final-cta-desc">
                Explore our range of electronic components and power solutions for your next project.
                Whether you need components for a new design or power electronic components for
                your application, our team is here to help.
              </p>
            </div>

            <div className="final-cta-right">
              <Link to="/contact" className="final-cta-pill-btn">
                <span>Talk to Our Team</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- GOOGLE REVIEW SUBMISSION MODAL --- */}
      {isModalOpen && (
        <div className="google-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="google-modal-close" onClick={() => setIsModalOpen(false)}>
              <FaTimes />
            </button>
            <div className="google-modal-header">
              <FaGoogle size={32} style={{ color: "#4285F4", marginBottom: "10px" }} />
              <h3>Submit a Google Review</h3>
              <p>Share your experience with EToSM Technology products</p>
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
                  placeholder="e.g. IoT Lead, Audio Consultant (Optional)"
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
                      className={`selector-star ${star <= newRating ? "active" : ""}`}
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
