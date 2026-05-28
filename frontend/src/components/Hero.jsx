import React from "react";
import { Link } from "react-router-dom";
import "./Hero.css";

const Hero = () => {
  const scrollToShop = () => {
    const shopSection = document.getElementById("shop-section");
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="etosm-hero">
      <div className="hero-text-container">
        <h1 className="hero-main-title">
          <span className="hero-title-highlight">WIRED FOR</span>
          <br />
          <span className="hero-title-underline">INNOVATION</span>
        </h1>

        <p className="hero-description">
          Welcome to <strong>EToSM Technology</strong>, a product-focused engineering brand delivering
          dependable <strong>power electronics and embedded systems</strong>. We develop{" "}
          <strong>
            SMPS power supplies, Battery Management Systems (BMS), lithium batteries, inverter
            solutions, audio modules, and automation electronics
          </strong>{" "}
          with strong emphasis on{" "}
          <strong>safety design, thermal management, EMI control, and consistent testing</strong>.
        </p>

        <div className="hero-cta-group">
          <button className="hero-btn-primary" onClick={scrollToShop}>
            Explore Products
          </button>
          <Link to="/about" className="hero-btn-secondary">
            Learn More
          </Link>
        </div>
      </div>

      {/* Decorative animated circuit lines */}
      <div className="hero-decoration" aria-hidden="true">
        <div className="circuit-line line-1"></div>
        <div className="circuit-line line-2"></div>
        <div className="circuit-dot dot-1"></div>
        <div className="circuit-dot dot-2"></div>
        <div className="circuit-dot dot-3"></div>
      </div>
    </section>
  );
};

export default Hero;
