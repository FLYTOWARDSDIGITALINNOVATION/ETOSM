import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaFingerprint, FaSnowflake, FaGlobe } from 'react-icons/fa';
import Header from '../components/Header';
import './AboutPage.css';

// Assets
import yogaTealGrip from '../assets/grip_yoga_teal.jpg';

const AboutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="innovative-about">
      <Header />

      <section className="hero-split">
        <div className="hero-left">
          <div className="reveal-box">
            <span className="tagline">ETOSM Technology</span>
            <h1 className="split-h1">POWER & <br /><span className="outline">PERFORMANCE.</span></h1>
            <p className="hero-para">
              We create synergy between power and performance. As a leading provider of Battery Management System in Tamil Nadu, ETOSM Technology delivers cutting-edge solutions that ensure the safety, efficiency, and long-term performance of energy storage systems.
            </p>
            <div className="btn-group">
              <button className="cta-main" onClick={() => navigate('/home')}>
                Shop Collection <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-stack">
            <img src="/aboutscreen.png" alt="ETOSM Technology" className="img-main" />
            <div className="accent-square"></div>
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

      <section className="vision-container">
        <div className="vision-layout">
          <div className="vision-card">
            <div className="card-inner">
              <FaFingerprint className="v-icon" />
              <h3>BMS Solutions</h3>
              <p>Cutting-edge Battery Management Systems ensuring safety, efficiency, and long-term performance of energy storage systems.</p>
            </div>
          </div>
          <div className="vision-card offset">
            <div className="card-inner">
              <FaGlobe className="v-icon" />
              <h3>Audio Tech</h3>
              <p>Advanced expertise in music Bluetooth decoders, power amplifiers, and high-performance circuit boards for seamless connectivity.</p>
            </div>
          </div>
          <div className="vision-card">
            <div className="card-inner">
              <FaSnowflake className="v-icon" />
              <h3>Innovation Driven</h3>
              <p>Committed to building technology that not only performs but also adds real value to everyday life and supports a greener future.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="depth-section">
        <div className="depth-content">
          <div className="depth-text">
            <h2 className="depth-title">WHY CHOOSE ETOSM?</h2>
            <p className="depth-intro">
              Whether it’s reliable power solutions or immersive audio systems, ETOSM Technology stands as a trusted name in delivering high-quality, performance-driven products. We are committed to building technology that adds real value to everyday life.
            </p>

            <div className="depth-row">
              <div className="depth-col">
                <span className="num">01</span>
                <h4>Safety First</h4>
                <p>Our BMS solutions ensure the highest standards of safety for energy storage systems.</p>
              </div>
              <div className="depth-col">
                <span className="num">02</span>
                <h4>Immersive Sound</h4>
                <p>Enhancing sound experiences with clarity and precision through our advanced audio decoders.</p>
              </div>
              <div className="depth-col">
                <span className="num">03</span>
                <h4>Green Future</h4>
                <p>We drive innovation that supports sustainable and smart energy management.</p>
              </div>
              <div className="depth-col">
                <span className="num">04</span>
                <h4>Trusted Quality</h4>
                <p>Delivering high-performance circuit boards and amplifiers you can rely on.</p>
              </div>
            </div>
          </div>

          <div className="depth-image-box">
            <img src={yogaTealGrip} alt="Highgrip Studio Excellence" className="depth-img" />
          </div>
        </div>
      </section>

      <section className="closing-statement">
        <div className="statement-inner">
          <p className="quote-text">"Technology that performs and adds real value."</p>
          <span className="brand-signature">— ETOSM TECHNOLOGY</span>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="footer-site">
        <div className="footer-container">
          <div className="footer-column brand-col">
            <h4 className="footer-col-title">HIGHGRIP</h4>
            <p className="footer-address">
              2/167, Merkukadu, Ramapuram,<br />
              Tiruchengodu, Namakkal,<br />
              Tamil Nadu-637202
            </p>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">QUICK LINKS</h4>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/products">Our Products</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/contact">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">PRODUCTS</h4>
            <ul className="footer-links">
              <li><a href="/products/yoga">Yoga Socks</a></li>
              <li><a href="/products/compression">Compression Sleeves</a></li>
              <li><a href="/products/thigh-high">Thigh High Socks</a></li>
              <li><a href="/products/medical">Medical Stockings</a></li>
              <li><a href="/products/trampoline">Trampoline Socks</a></li>
              <li><a href="/products/ankle">Ankle Grip Socks</a></li>
              <li><a href="/products/knee-pads">Crawling Knee Pads</a></li>
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
          <p>Copyright © 2026 by Highgripsox. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
