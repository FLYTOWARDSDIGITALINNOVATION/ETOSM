import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Headphones, Truck, ArrowRight, Zap } from "lucide-react";
import "./Hero.css";

const Hero = () => {
  const scrollToShop = () => {
    const shopSection = document.getElementById("shop-section");
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/all-products";
    }
  };

  return (
    <section className="etosm-hero">
      <div className="hero-content-wrapper container">
        <div className="hero-left-col">
          {/* Tagline Badge */}
          <div className="hero-tag-badge">
            <Zap size={14} className="hero-zap-icon" />
            <span>POWERING A SMARTER TOMORROW</span>
          </div>

          {/* Primary H1 Tag (SEO requirement) */}
          <h1 className="hero-seo-title">
            Electronic Components Online India – EToSM Technology
          </h1>

          {/* Display Headline */}
          <h2 className="hero-display-headline">
            WIRED FOR <br />
            <span className="hero-headline-accent">INNOVATION</span>
          </h2>

          {/* Description Paragraph */}
          <p className="hero-description">
            EToSM Technology provides electronic components and power solutions for businesses
            and project developers. As an electronic components supplier in India, we offer
            products for electronic projects, battery systems, and power supply needs.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta-group">
            <button className="hero-btn-primary" onClick={scrollToShop}>
              <span>Explore Products</span>
              <ArrowRight size={16} />
            </button>
            <Link to="/about" className="hero-btn-secondary">
              Learn More
            </Link>
          </div>

          {/* Key Highlights (3 Bullet points with icons - Bold & Dark for High Contrast) */}
          <div className="hero-highlights-row">
            <div className="hero-highlight-item">
              <div className="highlight-icon-wrap">
                <ShieldCheck size={18} />
              </div>
              <div className="hero-feature-content">
                <strong className="hero-feature-title">Quality Products</strong>
                <span className="hero-feature-sub">Rigorous safety tested</span>
              </div>
            </div>

            <div className="hero-highlight-item">
              <div className="highlight-icon-wrap">
                <Headphones size={18} />
              </div>
              <div className="hero-feature-content">
                <strong className="hero-feature-title">Customer Support</strong>
                <span className="hero-feature-sub">Dedicated technical help</span>
              </div>
            </div>

            <div className="hero-highlight-item">
              <div className="highlight-icon-wrap">
                <Truck size={18} />
              </div>
              <div className="hero-feature-content">
                <strong className="hero-feature-title">Reliable Service and Delivery</strong>
                <span className="hero-feature-sub">Pan-India secure dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
