import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaUser, FaHeart, FaShoppingCart, FaBars, FaTimes, FaChevronDown } from "react-icons/fa";
import "./Header.css";

import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

const Header = ({ onSearch }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [categories, setCategories] = useState([]);

  const navigate = useNavigate();
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

  // Effect to handle scroll styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <header className={`main-header ${scrolled ? "header-scrolled" : ""}`}>
      {/* 1. Global Announcement Bar */}
      <div className="top-bar">
        <p>✨ SPECIAL OFFER: GET 20% OFF ON YOUR FIRST ORDER • USE CODE: FIRST20 ✨</p>
      </div>

      <nav className="navbar container">
        {/* 2. Logo */}
        <div className="nav-left">
          <Link to="/home" className="brand-logo">
            <img src="/logoo.png" alt="HighGrip Logo" />
          </Link>
        </div>

        {/* 3. Center: Dynamic Navigation */}
        <ul className={`nav-links ${isMobileMenuOpen ? "active" : ""}`}>
          <li>
            <Link to="/home" className="nav-item">
              <span className="nav-icon-small">🏠</span> Home
            </Link>
          </li>
          <li className="dropdown">
            <span className="nav-item">
              <span className="nav-icon-small">🛡️</span> Products <FaChevronDown className="dropdown-caret" />
            </span>
            <ul className="dropdown-menu">
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
              <span className="nav-icon-small">📖</span> About
            </Link>
          </li>
          <li>
            <Link to="/customer-service" className="nav-item">
              <span className="nav-icon-small">💬</span> FAQ
            </Link>
          </li>
          <li>
            <Link to="/contact" className="nav-item">
              <span className="nav-icon-small">📞</span> Contact Us
            </Link>
          </li>
        </ul>

        {/* 4. Right: Search & Utilities */}
        <div className="nav-right">
          {/* Enhanced Search Bar */}
          <div className={`search-container ${isSearchOpen ? "expanded" : ""}`}>
            <div className="search-box">
              <FaSearch className="search-trigger" onClick={() => setIsSearchOpen(!isSearchOpen)} />
              <input
                type="text"
                className="search-input"
                placeholder="Search products..."
                onChange={(e) => onSearch && onSearch(e.target.value)}
              />
            </div>
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
                <span className="u-badge">{cart.reduce((sum, i) => sum + i.qty, 0)}</span>
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
                    <Link to="/profile">Settings</Link>
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



