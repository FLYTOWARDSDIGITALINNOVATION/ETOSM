import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Volume2, Leaf, Award, Target, Eye } from 'lucide-react';
import { FaArrowRight, FaFingerprint, FaSnowflake, FaGlobe } from 'react-icons/fa';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './AboutPage.css';

// Assets

const AboutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);

    // Dynamic SEO Meta Tags
    document.title = "Electronic Components Supplier in India | EToSM";

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content =
      "Get to know EToSM Technology, an electronic components supplier in India committed to product quality, customer support, and building lasting business relationships.";

    // Meta Keywords (Primary Keyword)
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = "Electronic Components Supplier in India";

    // OpenGraph & Twitter Meta Tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = "Electronic Components Supplier in India | EToSM";

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc)
      ogDesc.content =
        "Get to know EToSM Technology, an electronic components supplier in India committed to product quality, customer support, and building lasting business relationships.";

    let twTitle = document.querySelector('meta[property="twitter:title"]');
    if (twTitle) twTitle.content = "Electronic Components Supplier in India | EToSM";

    let twDesc = document.querySelector('meta[property="twitter:description"]');
    if (twDesc)
      twDesc.content =
        "Get to know EToSM Technology, an electronic components supplier in India committed to product quality, customer support, and building lasting business relationships.";
  }, []);

  return (
    <div className="innovative-about">
      <Header />

      <section className="about-banner-section">
        <div className="about-banner-container">
          <div className="about-banner-content">
            <span className="about-banner-eyebrow">ABOUT US</span>
            <h1 className="about-banner-h1">
              Your Trusted <br />
              <span className="about-banner-highlight">Electronic Components</span> <br />
              Supplier in India
            </h1>
            <p className="about-banner-desc">
              At EToSM Technology, we supply electronic components and battery solutions for businesses,
              product developers, and projects. We bring useful products together to support your work in
              electronics and power systems.
            </p>
            <div className="about-banner-btn-group">
              <button className="about-banner-cta" onClick={() => navigate('/all-products')}>
                <span>Explore Products</span>
                <FaArrowRight className="about-cta-arrow" />
              </button>
            </div>
          </div>

          <div className="about-banner-visual">
            <div className="about-chevron-wrap">
              <svg className="about-chevron-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 32 0 L 0 50 L 16 100" fill="none" stroke="#e3000f" strokeWidth="2.5" />
              </svg>
              <div className="about-banner-img-wrap">
                <img
                  src="/about-hardware-clean.png"
                  alt="Electronic Components and Battery Solutions - EToSM Technology"
                  className="about-hardware-img"
                />
                <div className="about-banner-vignette"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="brand-marquee">
        <div className="marquee-content">
          <span>BATTERY MANAGEMENT</span>
          <span>•</span>
          <span>AUDIO TECHNOLOGY</span>
          <span>•</span>
          <span>POWER AMPLIFIERS</span>
          <span>•</span>
          <span>BLUETOOTH DECODERS</span>
          <span>•</span>
          <span>CIRCUIT BOARDS</span>
          <span>•</span>
          <span>PERFORMANCE-DRIVEN</span>
        </div>
      </div>

      
      {/* SECTION 2: WHO WE ARE */}
      <section className="about-who-section">
        <div className="about-who-container">
          <div className="about-who-image-col">
            <div className="about-who-img-frame">
              <img
                src="/about-who-clean.png"
                alt="About EToSM Technology - Who We Are"
                className="about-who-img"
              />
            </div>
          </div>

          <div className="about-who-text-col">
            <div className="about-who-eyebrow-wrap">
              <span className="about-who-bar"></span>
              <span className="about-who-eyebrow">WHO WE ARE</span>
            </div>
            <h2 className="about-who-h2">About EToSM Technology</h2>
            <p className="about-who-para">
              EToSM Technology supplies electronic components and battery solutions for different
              applications. Our product range includes battery packs, battery management systems,
              amplifiers, and other electronic components.
            </p>
            <p className="about-who-para">
              We understand that every business and project has its own needs. We focus on providing useful
              products and clear information so our customers can make informed decisions. Our goal is to
              build lasting relationships through dependable service and honest communication.
            </p>
          </div>
        </div>
      </section>

            {/* SECTION 3: WHAT WE OFFER */}
      <section className="about-offer-section">
        <div className="about-offer-container">
          <div className="about-offer-header">
            <div className="about-offer-eyebrow-wrap">
              <span className="about-offer-bar"></span>
              <span className="about-offer-eyebrow">WHAT WE OFFER</span>
            </div>
            <h2 className="about-offer-h2">Electronic Components and Battery Solutions</h2>
            <p className="about-offer-subtitle">
              From battery systems to electronic components, we offer products for different technical and
              business needs. Explore our product range to learn more about what we supply.
            </p>
          </div>

          <div className="about-offer-grid">
            {/* Card 1: Battery Packs */}
            <div className="about-offer-card">
              <div className="about-offer-img-box">
                <img
                  src="/offer-battery-packs.png"
                  alt="Battery Packs"
                  className="about-offer-card-img"
                />
              </div>
              <div className="about-offer-card-body">
                <h3 className="about-offer-card-title">Battery Packs</h3>
                <p className="about-offer-card-desc">
                  Battery packs for applications that need a dependable power source.
                </p>
              </div>
            </div>

            {/* Card 2: Electronic Components */}
            <div className="about-offer-card">
              <div className="about-offer-img-box">
                <img
                  src="/offer-components.png"
                  alt="Electronic Components"
                  className="about-offer-card-img"
                />
              </div>
              <div className="about-offer-card-body">
                <h3 className="about-offer-card-title">Electronic Components</h3>
                <p className="about-offer-card-desc">
                  Components used in electronic circuits, devices, and product development.
                </p>
              </div>
            </div>

            {/* Card 3: Battery Management Systems */}
            <div className="about-offer-card">
              <div className="about-offer-img-box">
                <img
                  src="/offer-bms.png"
                  alt="Battery Management Systems"
                  className="about-offer-card-img"
                />
              </div>
              <div className="about-offer-card-body">
                <h3 className="about-offer-card-title">Battery Management Systems</h3>
                <p className="about-offer-card-desc">
                  Systems that help monitor and manage battery operation.
                </p>
              </div>
            </div>

            {/* Card 4: Amplifiers */}
            <div className="about-offer-card">
              <div className="about-offer-img-box">
                <img
                  src="/offer-amplifiers.png"
                  alt="Amplifiers"
                  className="about-offer-card-img"
                />
              </div>
              <div className="about-offer-card-body">
                <h3 className="about-offer-card-title">Amplifiers</h3>
                <p className="about-offer-card-desc">
                  Amplifiers for audio systems and other applications that need stronger audio signals.
                </p>
              </div>
            </div>
          </div>

          <div className="about-offer-cta-wrap">
            <button className="about-offer-btn" onClick={() => navigate('/all-products')}>
              <span>View All Products</span>
              <FaArrowRight className="about-offer-btn-arrow" />
            </button>
          </div>
        </div>
      </section>

            {/* SECTION 4: WHY CHOOSE ETOSM TECHNOLOGY */}
      <section className="about-why-section">
        <div className="about-why-container">
          {/* Left Column: Headline and Description */}
          <div className="about-why-left">
            <div className="about-why-eyebrow-wrap">
              <span className="about-why-bar"></span>
              <span className="about-why-eyebrow">WHY CHOOSE ETOSM TECHNOLOGY?</span>
            </div>
            <h2 className="about-why-h2">We Help You Find What You Need</h2>
            <p className="about-why-desc">
              We believe good service starts with understanding what customers need. We aim to make the
              buying process straightforward, from product enquiries to support after you contact us.
            </p>
          </div>

          {/* Right Column: 2x2 Grid of 4 Cards */}
          <div className="about-why-grid">
            {/* Card 01: Safety Matters */}
            <div className="about-why-card">
              <div className="about-why-card-icon">
                <ShieldCheck size={26} />
              </div>
              <div className="about-why-card-content">
                <div className="about-why-card-header">
                  <span className="about-why-card-num">01</span>
                  <h3 className="about-why-card-title">Safety Matters</h3>
                </div>
                <p className="about-why-card-desc">
                  Our Battery Management Systems help monitor battery performance and support safe battery
                  operation.
                </p>
              </div>
            </div>

            {/* Card 02: Better Sound */}
            <div className="about-why-card">
              <div className="about-why-card-icon">
                <Volume2 size={26} />
              </div>
              <div className="about-why-card-content">
                <div className="about-why-card-header">
                  <span className="about-why-card-num">02</span>
                  <h3 className="about-why-card-title">Better Sound</h3>
                </div>
                <p className="about-why-card-desc">
                  Our audio decoders and amplifiers help deliver clear sound for audio applications.
                </p>
              </div>
            </div>

            {/* Card 03: Smarter Energy Use */}
            <div className="about-why-card">
              <div className="about-why-card-icon">
                <Leaf size={26} />
              </div>
              <div className="about-why-card-content">
                <div className="about-why-card-header">
                  <span className="about-why-card-num">03</span>
                  <h3 className="about-why-card-title">Smarter Energy Use</h3>
                </div>
                <p className="about-why-card-desc">
                  We offer battery and power solutions that support efficient energy use.
                </p>
              </div>
            </div>

            {/* Card 04: Quality You Can Trust */}
            <div className="about-why-card">
              <div className="about-why-card-icon">
                <Award size={26} />
              </div>
              <div className="about-why-card-content">
                <div className="about-why-card-header">
                  <span className="about-why-card-num">04</span>
                  <h3 className="about-why-card-title">Quality You Can Trust</h3>
                </div>
                <p className="about-why-card-desc">
                  We focus on supplying dependable electronic components, circuit boards, and amplifiers
                  for your projects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* SECTION 5: OUR MISSION AND VISION */}
      <section className="about-mv-section">
        <div className="about-mv-container">
          {/* Left: Eco Circuit Board Image */}
          <div className="about-mv-image-col">
            <div className="about-mv-img-frame">
              <img
                src="/about-mission-plant.png"
                alt="Our Mission and Vision - Sustainable Electronics and Power Solutions"
                className="about-mv-img"
              />
            </div>
          </div>

          {/* Right: Mission & Vision Content */}
          <div className="about-mv-text-col">
            <div className="about-mv-header">
              <div className="about-mv-eyebrow-wrap">
                <span className="about-mv-bar"></span>
                <span className="about-mv-eyebrow">OUR MISSION AND VISION</span>
              </div>
              <h2 className="about-mv-h2">Our Mission and Vision</h2>
            </div>

            <div className="about-mv-blocks-grid">
              {/* Mission */}
              <div className="about-mv-block">
                <div className="about-mv-icon-title">
                  <div className="about-mv-icon-wrap">
                    <Target size={22} className="about-mv-icon" />
                  </div>
                  <h3 className="about-mv-block-title">Our Mission</h3>
                </div>
                <p className="about-mv-block-desc">
                  To supply electronic components and battery solutions that meet customer needs,
                  while making product selection and enquiries easier.
                </p>
              </div>

              {/* Vertical Divider */}
              <div className="about-mv-divider"></div>

              {/* Vision */}
              <div className="about-mv-block">
                <div className="about-mv-icon-title">
                  <div className="about-mv-icon-wrap">
                    <Eye size={22} className="about-mv-icon" />
                  </div>
                  <h3 className="about-mv-block-title">Our Vision</h3>
                </div>
                <p className="about-mv-block-desc">
                  To build a strong reputation in the electronics industry through reliable products,
                  helpful service, and long-term customer relationships.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* SECTION 6: CALL TO ACTION BANNER */}
      <section className="about-cta-section">
        <div className="about-cta-container">
          {/* Left: Heading with red bar */}
          <div className="about-cta-left">
            <span className="about-cta-bar"></span>
            <h2 className="about-cta-h2">
              Need Electronic Components <br />
              for Your Project?
            </h2>
          </div>

          {/* Center Divider */}
          <div className="about-cta-divider"></div>

          {/* Middle: Description and CTA button */}
          <div className="about-cta-middle">
            <p className="about-cta-desc">
              Tell us what you are looking for. Our team is ready to answer your questions and help you with
              your product enquiry.
            </p>
            <button className="about-cta-btn" onClick={() => navigate('/contact')}>
              <span>Contact Us</span>
              <FaArrowRight className="about-cta-btn-arrow" />
            </button>
          </div>

          {/* Right: Subtle White Circuit Traces on Brand Red Card (Matching Reference Image) */}
          <div className="about-cta-circuit-wrap">
            <svg className="about-cta-circuit-svg" viewBox="0 0 320 160" fill="none">
              <path d="M 40 160 L 110 90 L 180 90 L 220 50 L 290 50" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.3" />
              <circle cx="180" cy="90" r="3.5" fill="#ffffff" fillOpacity="0.55" />
              <circle cx="290" cy="50" r="3.5" fill="#ffffff" fillOpacity="0.65" />
              
              <path d="M 90 160 L 150 100 L 230 100 L 260 70 L 320 70" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.38" />
              <circle cx="230" cy="100" r="3.5" fill="#ffffff" fillOpacity="0.6" />
              
              <path d="M 140 160 L 190 110 L 270 110" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.25" />
              <circle cx="270" cy="110" r="3.5" fill="#ffffff" fillOpacity="0.5" />

              <path d="M 10 160 L 80 90 L 150 90 L 190 50 L 260 50 L 280 30 L 320 30" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.3" />
              <circle cx="150" cy="90" r="3.5" fill="#ffffff" fillOpacity="0.55" />
              <circle cx="260" cy="50" r="3.5" fill="#ffffff" fillOpacity="0.55" />
              <circle cx="320" cy="30" r="3.5" fill="#ffffff" fillOpacity="0.7" />
            </svg>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <Footer />
    </div>
  );
};

export default AboutPage;
