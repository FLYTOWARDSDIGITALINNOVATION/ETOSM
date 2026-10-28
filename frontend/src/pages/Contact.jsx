import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  User,
  MessageSquare,
  CheckCircle2,
  Navigation,
  Compass
} from "lucide-react";
import "./Contact.css";
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  // Contact form state
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    subject: "General Enquiry",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Contact EToSM Technology | Electronic Components & Power Solutions";
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      alert("Please fill in all required fields (Name, Email, Message).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: formData.name.trim(),
          userEmail: formData.email.trim(),
          userPhone: formData.phone.trim(),
          subject: formData.subject,
          message: formData.message.trim(),
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setFormData({
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          subject: "General Enquiry",
          message: ""
        });
        setTimeout(() => setSubmitSuccess(false), 6000);
      } else {
        alert("Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Error sending message. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <Header />

      {/* SECTION 1: Dark Tech Hero Banner Matching User Reference Image */}
      <section className="contact-banner-section">
        {/* Subtle Edge Circuit Lines - Confined strictly to far left margin */}
        <div className="contact-circuit-overlay">
          <svg className="contact-circuit-svg" viewBox="0 0 90 220" fill="none">
            <path d="M 0 30 L 30 30 L 52 56 L 72 56" stroke="#e3000f" strokeWidth="1.5" strokeOpacity="0.45" />
            <circle cx="72" cy="56" r="3" fill="#e3000f" fillOpacity="0.8" />
            
            <path d="M 0 95 L 35 95 L 56 120 L 76 120" stroke="#e3000f" strokeWidth="1.5" strokeOpacity="0.4" />
            <circle cx="76" cy="120" r="3" fill="#e3000f" fillOpacity="0.75" />
            
            <path d="M 0 160 L 25 160 L 45 182 L 65 182" stroke="#e3000f" strokeWidth="1.2" strokeOpacity="0.35" />
            <circle cx="65" cy="182" r="2.5" fill="#e3000f" fillOpacity="0.7" />
          </svg>
        </div>

        <div className="contact-banner-container">
          <div className="contact-banner-content">
            <span className="contact-banner-eyebrow">GET IN TOUCH</span>
            <h1 className="contact-banner-title">
              Contact <span className="contact-title-accent">EToSM Technology</span>
            </h1>
            <p className="contact-banner-desc">
              Have questions about our electronic components or power solutions? Contact our team to 
              discuss your requirements and find the right solutions for your projects.
            </p>
          </div>

          <div className="contact-banner-visual">
            <div className="contact-hardware-frame">
              <img
                src="/contact-hardware-clean.png"
                alt="EToSM Electronic Components & Battery Solutions"
                className="contact-hardware-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: 2-COLUMN MAIN CONTACT SECTION (Reference Image Layout) */}
      <div className="contact-main-wrapper">
        <div className="contact-main-container">
          
          {/* LEFT SIDE: Our Contact Information */}
          <div className="contact-info-col">
            <h2 className="contact-info-heading">Our Contact Information</h2>
            <p className="contact-info-subtitle">
              We'd love to hear from you. Reach out to us through any of the channels below, and our team will get back to you as soon as possible.
            </p>

            <div className="contact-items-list">
              {/* 1. Phone */}
              <div className="contact-item-row">
                <div className="contact-item-icon-circle">
                  <Phone size={20} />
                </div>
                <div className="contact-item-details">
                  <span className="contact-item-label">PHONE</span>
                  <a href="tel:+918807080216" className="contact-item-value contact-item-link">
                    +91 88070 80216
                  </a>
                  <span className="contact-item-sub">Mon – Sat, 9:00 AM – 6:00 PM</span>
                </div>
              </div>

              {/* 2. Email */}
              <div className="contact-item-row">
                <div className="contact-item-icon-circle">
                  <Mail size={20} />
                </div>
                <div className="contact-item-details">
                  <span className="contact-item-label">EMAIL</span>
                  <a href="mailto:support@etosmtechnology.in" className="contact-item-value contact-item-link">
                    support@etosmtechnology.in
                  </a>
                  <span className="contact-item-sub">We'll respond within 24 hours.</span>
                </div>
              </div>

              {/* 3. Address */}
              <div className="contact-item-row">
                <div className="contact-item-icon-circle">
                  <MapPin size={20} />
                </div>
                <div className="contact-item-details">
                  <span className="contact-item-label">ADDRESS</span>
                  <div className="contact-item-address">
                    <strong>Etosm</strong><br />
                    2/167, Merkukadu, Ramapuram,<br />
                    Tiruchengodu, Namakkal,<br />
                    Tamil Nadu-637202
                  </div>
                </div>
              </div>

              {/* 4. Business Hours */}
              <div className="contact-item-row">
                <div className="contact-item-icon-circle">
                  <Clock size={20} />
                </div>
                <div className="contact-item-details">
                  <span className="contact-item-label">BUSINESS HOURS</span>
                  <span className="contact-item-value">Monday – Saturday</span>
                  <span className="contact-item-sub">9:00 AM – 6:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Let's Find the Right Solution for Your Project (Matching Reference Image) */}
          <div className="contact-solution-col">
            <div className="contact-solution-card">
              <h3 className="contact-solution-title">
                Let's Find the Right Solution for Your Project
              </h3>
              <p className="contact-solution-desc">
                Looking for the right electronic components or battery solutions for your project? We're happy to 
                help. Share your requirements with us, and our team will help you find the right products for 
                your needs.
              </p>
              
              <div className="contact-solution-actions">
                <a href="tel:+918807080216" className="contact-solution-call-btn">
                  <Phone size={18} />
                  <span>Call Us</span>
                </a>
              </div>

              {/* Optional Quick Message Form */}
              <div className="contact-solution-divider">
                <span>OR SEND A MESSAGE</span>
              </div>

              {submitSuccess && (
                <div className="contact-form-success">
                  <CheckCircle2 size={18} />
                  <span>Thank you! Your message has been sent successfully. We will get back to you shortly.</span>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="contact-solution-form">
                <div className="contact-solution-row two-cols">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Name *"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Your Email *"
                    required
                  />
                </div>
                <div className="contact-solution-row">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                  />
                </div>
                <div className="contact-solution-row">
                  <textarea
                    name="message"
                    rows="3"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your Message *"
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="contact-solution-send-btn"
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? "Sending..." : "Send Message"}</span>
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 4: GOOGLE MAPS & VISIT US (Matching User Reference Image) */}
      <section className="contact-visit-section">
        <div className="contact-visit-container">
          {/* Left Side: Embedded Google Maps */}
          <div className="contact-map-col">
            <div className="contact-map-frame">
              <iframe
                title="EToSM Technology Office Location"
                src="https://maps.google.com/maps?q=2%2F167%2C%20Merkukadu%2C%20Ramapuram%2C%20Tiruchengodu%2C%20Namakkal%2C%20Tamil%20Nadu%20637202&t=&z=14&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

          {/* Right Side: Visit Us Card */}
          <div className="contact-visit-col">
            <div className="contact-visit-card">
              <span className="contact-visit-eyebrow">VISIT US</span>
              <h2 className="contact-visit-title">Let's Build Something Great Together</h2>
              <p className="contact-visit-desc">
                We're always happy to discuss your requirements, answer your questions and explore how our electronic components and power solutions can help with your projects.
              </p>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=2%2F167%2C+Merkukadu%2C+Ramapuram%2C+Tiruchengodu%2C+Namakkal%2C+Tamil+Nadu+637202"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-visit-cta"
              >
                <Navigation size={18} />
                <span>Get Directions</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: '90%', background: '#fff5f5', border: '2px solid #ffb8b8', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: '#e3000f' }}>Please login to send a message</h3>
            <p style={{ color: '#4a5568' }}>You need to be signed in to contact us.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => { setShowLoginModal(false); navigate('/auth'); }} style={{ background: '#e3000f', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Login</button>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'transparent', border: '1px solid #ffb8b8', color: '#e3000f', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contact;
