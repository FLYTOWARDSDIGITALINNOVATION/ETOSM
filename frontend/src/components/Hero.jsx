import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./Hero.css";

// Assets
import yogaTeal from "../assets/hero_blue_socks.jpg";
import gymPushup from "../assets/grip_gym.jpg";
import tennisCourt from "../assets/grip_tennis.jpg";
import footballField from "../assets/grip_football.jpg";
import trackRunning from "../assets/grip_running.jpg";

const slides = [
  {
    id: "01",
    tag: "STUDIO BALANCE",
    title: "Master Your",
    highlight: "Inner Stability",
    desc: "Precision-engineered grip for the most demanding yoga and studio practices.",
    img: yogaTeal,
  },
  {
    id: "02",
    tag: "PRO PERFORMANCE",
    title: "Push Beyond",
    highlight: "Your Limits",
    desc: "Medical-grade traction technology that supports every explosive movement.",
    img: gymPushup,
  },
  {
    id: "03",
    tag: "COURT AGILITY",
    title: "Unmatched",
    highlight: "Side-to-Side Control",
    desc: "Dominate the court with specialized grip locks for tennis and indoor sports.",
    img: tennisCourt,
  },
  {
    id: "04",
    tag: "FIELD READY",
    title: "Explosive Power",
    highlight: "On Every Surface",
    desc: "Stay grounded and agile during high-intensity field maneuvers and match play.",
    img: footballField,
  },
  {
    id: "05",
    tag: "ENDURANCE TRACK",
    title: "Go Further",
    highlight: "With Confidence",
    desc: "Superior breathability and non-slip security for your longest runs and sessions.",
    img: trackRunning,
  }
];

const Hero = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[index];

  const handleNext = () => setIndex((prev) => (prev + 1) % slides.length);
  const handlePrev = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const scrollToShop = () => {
    const shopSection = document.getElementById("shop-section");
    if (shopSection) {
      shopSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="full-hero-carousel">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`hero-slide ${i === index ? "active" : ""}`}
          style={{ backgroundImage: `url(${s.img})` }}
        >
          <div className="hero-overlay">
            <div className="hero-content container">
              <span className="hero-badge">{s.tag}</span>
              <h1 className="hero-title">
                {s.title} <br />
                <span className="hero-highlight">{s.highlight}</span>
              </h1>
              <p className="hero-desc">{s.desc}</p>
              <button className="shop-btn" onClick={scrollToShop}>
                SHOP COLLECTION
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Controls */}
      <div className="carousel-nav">
        <button className="nav-arrow prev" onClick={handlePrev}><FaChevronLeft /></button>
        <button className="nav-arrow next" onClick={handleNext}><FaChevronRight /></button>
      </div>

      <div className="carousel-dots">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
          ></span>
        ))}
      </div>
    </section>
  );
};

export default Hero;
