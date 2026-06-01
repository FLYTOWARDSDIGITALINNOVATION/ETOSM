import API_BASE_URL from '../apiConfig';
import React, { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Youtube,
} from "lucide-react";
import "./Contact.css";
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const handleSendMessage = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!message.trim()) {
      alert("Please write a message");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          message: message.trim(),
        }),
      });

      if (res.ok) {
        alert("Message sent successfully!");
        setMessage("");
      } else {
        alert("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Error sending message");
    }
  };
  return (
    <div className="contact-page">
      <Header />

      {/* Pink Banner - Now Transparent/Animated Text */}
      <section className="contact-hero">
        <h1>Contact us for any Questions</h1>
        <p>
          We'd love to hear from you! If you have any questions, feedback, or need assistance, please feel free to reach out to us using the contact details provided. Our team is here to help and will respond as soon as possible. Thank you for getting in touch!
        </p>
      </section>

      {/* CONTACT INFO SECTION */}
      <div className="contact-container">

        {/* LEFT GRID */}
        <div className="contact-info">

          <div className="info-card">
            <div className="icon-wrapper">
              <MapPin />
            </div>
            <div>
              <h4>Address:</h4>
              <p>
                <strong>Etosm</strong><br />
                2/167, Merkukadu, Ramapuram,<br />
                Tiruchengodu, Namakkal,<br />
                Tamil Nadu-637202
              </p>
            </div>
          </div>

          <a href="tel:+918807080216" className="info-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon-wrapper">
              <Phone />
            </div>
            <div>
              <h4>Call Us:</h4>
              <p>+91 88070 80216</p>
            </div>
          </a>

          <a href="mailto:support@etosmtechnology.in" className="info-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="icon-wrapper">
              <Mail />
            </div>
            <div>
              <h4>Email:</h4>
              <p>support@etosmtechnology.in</p>
            </div>
          </a>

          <div className="info-card">
            <div className="icon-wrapper">
              <span style={{ fontSize: '24px' }}>🌍</span>
            </div>
            <div>
              <h4>Social:</h4>
              <div className="social-icons">
                <a href="https://www.instagram.com/etosm_technology/?igshid=OGQ5ZDc2ODk2ZA%3D%3D" target="_blank" rel="noopener noreferrer">
                  <Instagram />
                </a>
                <a href="https://www.youtube.com/@etosmtechnology?si=sal1NnJrMi8LEiru" target="_blank" rel="noopener noreferrer">
                  <Youtube />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT CTA CARD */}
        <div className="contact-cta">
          <h2>Got questions or need help choosing the right battery or electronics component?</h2>
          <p>We'd love to hear from you! Our technical team is ready to assist with your BMS, lithium battery pack, or electronics queries.</p>
          <a href="tel:+918807080216" className="call-us-btn">Call Us</a>
        </div>

      </div>

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



