import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaSearch, FaUser, FaHeart, FaShoppingCart, FaBars, FaTimes, FaChevronDown, FaHome, FaBox, FaInfoCircle, FaEnvelope } from "react-icons/fa";
import "./Header.css";

import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

const Header = ({ onSearch }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState([]);
  const [localSearch, setLocalSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const searchWrapperRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { wishlist } = useWishlist();
  const { cart } = useCart();
  const user = JSON.parse(localStorage.getItem("user"));

  // Fetch categories for dropdown
  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Failed to fetch categories", err));
  }, []);

  // Fetch all products for instant SKU & name search dropdown
  useEffect(() => {
    fetch(`${API_BASE_URL}/products/all`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllProducts(data);
      })
      .catch(err => console.error("Failed to fetch products in header", err));
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Instant SKU & product matching
  const matchingProducts = useMemo(() => {
    if (!localSearch.trim()) return [];
    const cleanTerm = localSearch.toLowerCase().trim();
    const skuDigits = cleanTerm.replace(/[^0-9]/g, "");
    const skuOnlyTerm = cleanTerm.replace(/^(sku|item|code)[\s:\-_#]*/i, "").trim();

    return allProducts
      .map(p => {
        const nameMatch = p.name?.toLowerCase().includes(cleanTerm);
        const catMatch = p.category?.toLowerCase().includes(cleanTerm);
        const subcatMatch = p.subcategory?.toLowerCase().includes(cleanTerm);

        let skuMatch = false;
        let isExactSku = false;
        if (p.sku != null && p.sku !== "") {
          const pSkuStr = String(p.sku).toLowerCase().trim();
          const digitsInSku = pSkuStr.replace(/[^0-9]/g, "");

          if (pSkuStr === cleanTerm || (skuOnlyTerm && pSkuStr === skuOnlyTerm) || (skuDigits && digitsInSku === skuDigits)) {
            skuMatch = true;
            isExactSku = true;
          } else if (
            pSkuStr.includes(cleanTerm) ||
            cleanTerm.includes(pSkuStr) ||
            (skuOnlyTerm && (pSkuStr.includes(skuOnlyTerm) || skuOnlyTerm.includes(pSkuStr))) ||
            (skuDigits && digitsInSku && (digitsInSku === skuDigits || digitsInSku.includes(skuDigits))) ||
            `sku: ${pSkuStr}`.includes(cleanTerm) ||
            `sku ${pSkuStr}`.includes(cleanTerm)
          ) {
            skuMatch = true;
          }
        }

        const matches = skuMatch || nameMatch || catMatch || subcatMatch;
        return { product: p, matches, skuMatch, isExactSku };
      })
      .filter(item => item.matches)
      .sort((a, b) => {
        if (a.isExactSku && !b.isExactSku) return -1;
        if (!a.isExactSku && b.isExactSku) return 1;
        if (a.skuMatch && !b.skuMatch) return -1;
        if (!a.skuMatch && b.skuMatch) return 1;
        return 0;
      })
      .slice(0, 6)
      .map(item => item.product);
  }, [allProducts, localSearch]);

  const handleExecuteSearch = () => {
    if (!localSearch.trim()) return;
    setIsDropdownVisible(false);
    const targetUrl = location.pathname === "/all-products"
      ? `/all-products?search=${encodeURIComponent(localSearch.trim())}`
      : `/home?search=${encodeURIComponent(localSearch.trim())}`;
    navigate(targetUrl);
  };

  // Effect to handle scroll styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
    window.location.href = "/";
  };

  return (
    <header className={`main-header ${scrolled ? "header-scrolled" : ""}`}>
      {/* 1. Global Announcement Bar */}
      <div className="top-bar">
        <p>⚡ ETOSM TECHNOLOGY: PREMIUM POWER ELECTRONICS, CUSTOM BMS & AUDIO SOLUTIONS ⚡</p>
      </div>

      <nav className="navbar container">
        {/* 2. Logo */}
        <div className="nav-left">
          <Link to="/home" className="brand-logo">
            <img src="/logo1.png" alt="Etosm Logo" />
          </Link>
        </div>

        {/* 3. Center: Dynamic Navigation */}
        {isMobileMenuOpen ? (
          <ul className="nav-links active">
            <li>
              <Link to="/home" className="nav-item">
                <FaHome className="nav-icon-small" /> Home
              </Link>
            </li>
            <li className="dropdown">
              <span className="nav-item">
                <FaBox className="nav-icon-small" /> Products <FaChevronDown className="dropdown-caret" />
              </span>
              <ul className="dropdown-menu">
                <li>
                  <Link to="/all-products" className="dropdown-item" style={{ fontWeight: 'bold', color: '#e3000f' }}>
                    <span className="item-dot" style={{ background: '#e3000f' }}></span> All Products Catalog
                  </Link>
                </li>
                <li style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></li>
                {Array.isArray(categories) && categories.map(cat => (
                  <li key={cat._id}>
                    <Link to={`/category/${cat.name}`} className="dropdown-item">
                      <span className="item-dot"></span> {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <Link to="/about" className="nav-item">
                <FaInfoCircle className="nav-icon-small" /> About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="nav-item">
                <FaEnvelope className="nav-icon-small" /> Contact Us
              </Link>
            </li>
          </ul>
        ) : (
          <div className="nav-links-wrapper">
            <ul className="nav-links-main">
              <li>
                <Link to="/home" className="nav-item">
                  <FaHome className="nav-icon-small" /> Home
                </Link>
              </li>
              <li className="dropdown">
                <span className="nav-item">
                  <FaBox className="nav-icon-small" /> Products <FaChevronDown className="dropdown-caret" />
                </span>
                <ul className="dropdown-menu">
                  <li>
                    <Link to="/all-products" className="dropdown-item" style={{ fontWeight: 'bold', color: '#e3000f' }}>
                      <span className="item-dot" style={{ background: '#e3000f' }}></span> All Products Catalog
                    </Link>
                  </li>
                  <li style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></li>
                  {Array.isArray(categories) && categories.map(cat => (
                    <li key={cat._id}>
                      <Link to={`/category/${cat.name}`} className="dropdown-item">
                        <span className="item-dot"></span> {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
            <ul className="nav-links-scroll">
              <li>
                <Link to="/about" className="nav-item">
                  <FaInfoCircle className="nav-icon-small" /> About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="nav-item">
                  <FaEnvelope className="nav-icon-small" /> Contact Us
                </Link>
              </li>
            </ul>
          </div>
        )}

        {/* 4. Right: Search & Utilities */}
        <div className="nav-right">
          {/* Enhanced Search Bar & Instant SKU Dropdown */}
          <div ref={searchWrapperRef} style={{ position: 'relative' }}>
            <div className={`search-container ${isSearchOpen ? "expanded" : ""}`}>
              <div className="search-box">
                <FaSearch
                  className="search-trigger"
                  onClick={() => {
                    if (localSearch.trim() !== '') {
                      handleExecuteSearch();
                    } else {
                      setIsSearchOpen(!isSearchOpen);
                    }
                  }}
                  title="Search"
                />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search products, SKU..."
                  value={localSearch}
                  onFocus={() => {
                    if (localSearch.trim()) setIsDropdownVisible(true);
                  }}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    setIsDropdownVisible(true);
                    if (onSearch) onSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExecuteSearch();
                    } else if (e.key === 'Escape') {
                      setIsDropdownVisible(false);
                    }
                  }}
                />
              </div>
            </div>

            {/* Instant Floating Search Results Dropdown */}
            {isDropdownVisible && localSearch.trim() !== '' && (
              <div className="header-search-results-dropdown" style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '370px',
                maxWidth: '92vw',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.16)',
                border: '1px solid #e2e8f0',
                zIndex: 3000,
                overflow: 'hidden',
                padding: '6px 0',
              }}>
                <div style={{ padding: '6px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Matching Products ({matchingProducts.length})</span>
                  <span style={{ color: '#e3000f', cursor: 'pointer', fontSize: '12px' }} onClick={handleExecuteSearch}>
                    View All &rarr;
                  </span>
                </div>

                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {matchingProducts.length === 0 ? (
                    <div style={{ padding: '20px 14px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No product found for "<strong>{localSearch}</strong>"
                    </div>
                  ) : (
                    matchingProducts.map((prod) => (
                      <div
                        key={prod._id}
                        onClick={() => {
                          setIsDropdownVisible(false);
                          setLocalSearch("");
                          navigate(`/product/${prod.slug || prod._id}`);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          borderBottom: '1px solid #f8fafc',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <img
                          src={prod.image ? `${API_BASE_URL}${prod.image}` : "https://via.placeholder.com/50"}
                          alt={prod.name}
                          style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', flexShrink: 0 }}
                          onError={(e) => (e.target.src = "https://via.placeholder.com/50")}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prod.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            {prod.sku != null && prod.sku !== "" && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#1e293b',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                padding: '1px 6px',
                              }}>
                                <span style={{ color: '#3b82f6', fontWeight: '500' }}>SKU:</span>
                                {prod.sku}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{prod.category}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#e3000f', flexShrink: 0 }}>
                          ₹{prod.price}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {matchingProducts.length > 0 && (
                  <div
                    onClick={handleExecuteSearch}
                    style={{
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#e3000f',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    See all results for "{localSearch}" &rarr;
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divider"></div>

          <div className="utility-icons">
            <Link to="/wishlist" className="utility-btn wish">
              <FaHeart />
              {wishlist.length > 0 && <span className="u-badge">{wishlist.length}</span>}
            </Link>

            <Link to="/cart" className="utility-btn cart">
              <FaShoppingCart />
              {cart.length > 0 && (
                <span className="u-badge">{cart.length}</span>
              )}
            </Link>

            <div className="user-dropdown-container">
              {user ? (
                <div className="user-profile-trigger">
                  <Link to="/profile" className="utility-btn profile">
                    <FaUser />
                  </Link>
                  <div className="user-mini-menu">
                    <p className="welcome-username">Hi, {user.name ? user.name.split(' ')[0] : 'User'}</p>
                    <Link to="/orders">My Orders</Link>
                    <button onClick={handleLogout} className="logout-btn">Sign Out</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => navigate("/auth")} className="login-pill">
                  Sign In
                </button>
              )}
            </div>
          </div>

          <div className="hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <div /> : <FaBars />}
            {/* FaTimes is handled inside the drawer or just rely on overlay/toggle */}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1999
          }}
        />
      )}

      {/* Close Button inside Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)} style={{
          position: 'fixed',
          top: '25px',
          right: '25px',
          zIndex: 2101,
          fontSize: '1.5rem',
          color: '#111',
          cursor: 'pointer'
        }}>
          <FaTimes />
        </div>
      )}
    </header>
  );
};

export default Header;



