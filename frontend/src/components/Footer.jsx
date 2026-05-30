import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../apiConfig";

export default function Footer() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Failed to fetch categories", err));
  }, []);

  return (
    <footer className="footer-site">
      <div className="footer-container">
        <div className="footer-column brand-col">
          <h4 className="footer-col-title">ETOSM TECHNOLOGY</h4>
          <p className="footer-address">
            Indian Electronics Design &amp; Manufacturing<br />
            Power Electronics | BMS | Audio<br />
            Tamil Nadu, India
          </p>
        </div>

        <div className="footer-column">
          <h4 className="footer-col-title">QUICK LINKS</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4 className="footer-col-title">PRODUCTS</h4>
          <ul className="footer-links">
            {Array.isArray(categories) && categories.length > 0 ? (
              categories.map(cat => (
                <li key={cat._id}>
                  <Link to={`/category/${cat.name}`}>{cat.name}</Link>
                </li>
              ))
            ) : (
              <li>No categories added</li>
            )}
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
        <p>Copyright © 2026 EToSM Technology. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
