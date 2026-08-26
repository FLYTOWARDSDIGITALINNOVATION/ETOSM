import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { FaStar, FaShoppingCart, FaArrowLeft, FaCloud, FaExpand, FaPalette, FaBolt, FaHeartbeat, FaFilePdf } from "react-icons/fa";
import { MdSecurity, MdAir, MdCompress, MdLocalLaundryService, MdCheckCircle } from "react-icons/md";
import { jsPDF } from "jspdf";

import { useCart } from "../context/CartContext";
import "./ProductDetailPage.css";

// ── Smart Description Renderer ──────────────────────────────────────────────
// Parses the plain-text description stored in MongoDB and outputs proper
// semantic HTML: h2 for section headings, h3 for FAQ questions,
// ul/li for bullet lines, and p for body text.
// The very first heading-style line (same wording as H1) is skipped because
// the product <h1> already covers it above the description block.
const renderDescription = (text, collapsed) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let bulletBuffer = [];
  let key = 0;

  // Flush any accumulated bullet points into a <ul>
  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={key++} className="desc-bullet-list">
          {bulletBuffer.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  const isBullet = (line) => {
    return /^([•✓\-\*]|\d+\))\s*/.test(line) && !/^\d+\.\s/.test(line);
  };

  const isFaq = (line) => {
    return /^\d+\.\s/.test(line);
  };

  const isSectionHeading = (line) => {
    if (!line.trim()) return false;
    if (isBullet(line)) return false;
    if (isFaq(line)) return false;

    // Ends with colon or question mark (e.g. "This particular battery may find application in the following:", "Why Choose...?")
    if (/[:\?]$/.test(line.trim())) return true;

    // Short standalone title line (<= 90 chars) that does not end in a period '.'
    if (line.trim().length <= 90 && !line.trim().endsWith('.')) return true;

    return false;
  };

  let firstHeadingSkipped = false;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushBullets();
      return;
    }

    // Bullet point → collect into buffer
    if (isBullet(line)) {
      const cleanBullet = line.replace(/^([•✓\-\*]|\d+\))\s*/, '');
      bulletBuffer.push(cleanBullet);
      return;
    }

    flushBullets();

    // FAQ question  e.g. "1. What is a rechargeable battery 3.7V?"
    if (isFaq(line)) {
      elements.push(<h3 key={key++} className="desc-faq-question">{line}</h3>);
      return;
    }

    // Section heading detection
    if (isSectionHeading(line)) {
      if (!firstHeadingSkipped) {
        firstHeadingSkipped = true;
        elements.push(
          <h2 key={key++} className="desc-main-title">{line}</h2>
        );
        return;
      }
      elements.push(<h2 key={key++} className="desc-section-heading">{line}</h2>);
      return;
    }

    // Regular body paragraph
    elements.push(<p key={key++} className="desc-body">{line}</p>);
  });

  flushBullets();

  return (
    <div className={`desc-rendered ${collapsed ? 'collapsed' : ''}`}>
      {elements}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const ProductDetailPage = () => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState("");
  const [allImages, setAllImages] = useState([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Fetch product from API
  useEffect(() => {
    fetch(`${API_BASE_URL}/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        const images = [data.image, ...(data.images || [])].filter(Boolean);
        setAllImages(images);
        setCurrentImage(data.image);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch product:", err);
        setLoading(false);
      });
  }, [id]);

  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Review State
  const [reviews, setReviews] = useState([]);
  const [userRating, setUserRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [uploadImages, setUploadImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeatures, setShowFeatures] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (product?._id) {
      fetchReviews(product._id);
    }
  }, [product]);

  const fetchReviews = async (productId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/${productId}`);
      const data = await res.json();
      if (Array.isArray(data)) setReviews(data);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    }
  };

  const handleImageChange = (e) => {
    setUploadImages(Array.from(e.target.files));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to leave a review");
      return;
    }

    if (!product?._id) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("productId", product._id);
    formData.append("userEmail", user.email);
    formData.append("userName", user.name);
    formData.append("rating", userRating);
    formData.append("comment", newComment);
    uploadImages.forEach((image) => {
      formData.append("images", image);
    });

    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setNewComment("");
        setUserRating(5);
        setUploadImages([]);
        fetchReviews(product._id);
        fetch(`${API_BASE_URL}/products/${id}`)
          .then(res => res.json())
          .then(data => setProduct(data));
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!product) return;

    if (product.pdfUrl) {
      const pdfLink = product.pdfUrl.startsWith("/") ? `${API_BASE_URL}${product.pdfUrl}` : product.pdfUrl;
      window.open(pdfLink, "_blank");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Color Palette
      const primaryColor = [26, 58, 92]; // #1a3a5c (Sleek dark blue)
      const textColor = [51, 51, 51]; // #333333
      const lightGray = [150, 150, 150];
      const tableHeaderBg = [240, 244, 248];

      let y = 20;

      // Header Branding
      doc.setFillColor(...primaryColor);
      doc.rect(20, y, 170, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("ETOSM TECHNOLOGY — TECHNICAL SPECIFICATION SHEET", 25, y + 9.5);

      y += 25;

      // Product Title
      doc.setTextColor(...textColor);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      const titleLines = doc.splitTextToSize(product.name, 170);
      doc.text(titleLines, 20, y);
      y += (titleLines.length * 7) + 2;

      // Category
      doc.setTextColor(...lightGray);
      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(10);
      doc.text(`Category: ${product.category}`, 20, y);
      y += 8;

      // Price details
      const now = new Date();
      const isDiscountActive =
        product.discountPercent > 0 &&
        product.discountStart &&
        product.discountEnd &&
        now >= new Date(product.discountStart) &&
        now <= new Date(product.discountEnd);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      if (isDiscountActive) {
        const discountedPrice = (product.price * (1 - product.discountPercent / 100)).toFixed(2);
        doc.setTextColor(...textColor);
        doc.text(`Price: INR ${discountedPrice}`, 20, y);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(...lightGray);
        doc.text(` (Original Price: INR ${product.price} | ${product.discountPercent}% OFF)`, 65, y);
      } else {
        doc.setTextColor(...textColor);
        doc.text(`Price: INR ${product.price}`, 20, y);
      }
      y += 12;

      // Horizontal Line separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      y += 10;

      // Helper to check page overflow and add new page
      const checkPageOverflow = (neededHeight) => {
        if (y + neededHeight > 275) {
          doc.addPage();
          y = 20; // reset y to top margin on new page
        }
      };

      // Add Product Image if available
      if (product.image) {
        try {
          const imageUrl = `${API_BASE_URL}${product.image}`;
          const img = await new Promise((resolve, reject) => {
            const imageEl = new Image();
            imageEl.crossOrigin = "anonymous";
            imageEl.onload = () => resolve(imageEl);
            imageEl.onerror = (err) => reject(err);
            imageEl.src = imageUrl;
          });

          // Determine dimensions and fit inside a 50mm square bounding box
          let imgW = img.width;
          let imgH = img.height;
          const maxBox = 50;
          const ratio = Math.min(maxBox / imgW, maxBox / imgH);
          imgW = imgW * ratio;
          imgH = imgH * ratio;

          const boxSize = 54;
          const xOffset = 20 + (boxSize - imgW) / 2;
          const yOffset = y + (boxSize - imgH) / 2;

          // Draw a light grey bounding box for the product image
          doc.setDrawColor(220, 220, 220);
          doc.rect(20, y, boxSize, boxSize, "S");

          // Determine format
          const ext = product.image.split('.').pop().toLowerCase();
          const format = ext === 'png' ? 'PNG' : 'JPEG';

          // Add image to PDF
          doc.addImage(img, format, xOffset, yOffset, imgW, imgH);
          y += boxSize + 10;
        } catch (imgError) {
          console.error("Failed to load product image for PDF:", imgError);
          // Gracefully continue without image
        }
      }

      // Description Section
      if (product.description) {
        checkPageOverflow(30);
        doc.setTextColor(...primaryColor);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Product Overview", 20, y);
        y += 6;

        doc.setTextColor(...textColor);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        const cleanedDesc = product.description
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]*>/g, ""); // strip any html tags
        
        const descLines = doc.splitTextToSize(cleanedDesc, 170);
        for (let line of descLines) {
          checkPageOverflow(6);
          doc.text(line, 20, y);
          y += 5;
        }
        y += 5;
      }

      // Specifications Section
      if (product.specifications && product.specifications.length > 0) {
        checkPageOverflow(30);
        doc.setTextColor(...primaryColor);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Technical Specifications", 20, y);
        y += 8;

        // Draw table headers
        doc.setFillColor(...tableHeaderBg);
        doc.rect(20, y, 170, 7, "F");
        doc.setDrawColor(200, 200, 200);
        doc.rect(20, y, 170, 7, "S");
        
        doc.setTextColor(...textColor);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Specification Parameter", 24, y + 4.5);
        doc.text("Value", 105, y + 4.5);
        doc.line(100, y, 100, y + 7);
        y += 7;

        // Draw table body
        doc.setFont("Helvetica", "normal");
        for (let spec of product.specifications) {
          const cellLines = doc.splitTextToSize(spec.value || "", 80);
          const cellHeight = Math.max(7, cellLines.length * 5 + 2);
          
          checkPageOverflow(cellHeight);

          // Draw cells border
          doc.setDrawColor(220, 220, 220);
          doc.rect(20, y, 170, cellHeight, "S");
          doc.line(100, y, 100, y + cellHeight);

          // Render parameter name
          doc.text(spec.label || "", 24, y + 4.5);
          // Render wrapped value
          doc.text(cellLines, 104, y + 4.5);
          
          y += cellHeight;
        }
        y += 10;
      }

      // Features Section
      if (product.features && product.features.length > 0) {
        checkPageOverflow(30);
        doc.setTextColor(...primaryColor);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Key Features & Benefits", 20, y);
        y += 8;

        doc.setTextColor(...textColor);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        for (let feature of product.features) {
          const featureLines = doc.splitTextToSize(feature, 160);
          const itemHeight = featureLines.length * 5;
          checkPageOverflow(itemHeight + 2);
          doc.text("•", 20, y);
          doc.text(featureLines, 25, y);
          y += itemHeight + 1;
        }
        y += 10;
      }

      // Add Footer to all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(20, 280, 190, 280);

        doc.setTextColor(...lightGray);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.text("ETOSM Technology | Email: support@etosmtechnology.in | Phone: +91 88070 80216", 20, 285);
        doc.text(`Page ${i} of ${pageCount}`, 175, 285);
      }

      // Trigger Download
      const filename = `${product.slug || "product"}-spec-sheet.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const sizes = ["S", "M", "L", "XL"];

  const isOutOfStock = product?.stock <= 0;

  const handleAddToCart = () => {
    if (product && !isOutOfStock) {
      addToCart({
        ...product,
        qty: quantity,
        ...(selectedSize ? { size: selectedSize } : {}),
      });
    }
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;

    // Calculate dynamic price based on discount logic
    const now = new Date();
    const isDiscountActive =
      product.discountPercent > 0 &&
      product.discountStart &&
      product.discountEnd &&
      now >= new Date(product.discountStart) &&
      now <= new Date(product.discountEnd);

    const finalPrice = isDiscountActive
      ? (product.price * (1 - product.discountPercent / 100))
      : product.price;

    const buyNowPayload = {
      ...product,
      productId: product._id || product.id,
      qty: quantity,
      price: finalPrice
    };
    if (selectedSize) {
      buyNowPayload.size = selectedSize;
    }

    navigate("/checkout", {
      state: {
        buyNowItem: buyNowPayload
      }
    });
  };

  if (loading) return <div className="container" style={{ marginTop: '100px' }}>Loading...</div>;
  if (!product) return <div className="container" style={{ marginTop: '100px' }}>Product not found</div>;
  const now = new Date();

  const isDiscountActive =
    product.discountPercent > 0 &&
    product.discountStart &&
    product.discountEnd &&
    now >= new Date(product.discountStart) &&
    now <= new Date(product.discountEnd);

  const discountedPrice = isDiscountActive
    ? (product.price * (1 - product.discountPercent / 100)).toFixed(2)
    : product.price;

  const getFeatureIcon = (feature) => {
    const text = feature.toLowerCase();
    if (text.includes("anti-slip") || text.includes("grip") || text.includes("no slip")) return <MdSecurity style={{ color: '#c71585' }} />;
    if (text.includes("cushioned") || text.includes("soft")) return <FaCloud style={{ color: '#c71585' }} />;
    if (text.includes("breathable") || text.includes("mesh") || text.includes("no sweat")) return <MdAir style={{ color: '#c71585' }} />;
    if (text.includes("stretchable") || text.includes("fit") || text.includes("stretch") || text.includes("no slide")) return <FaExpand style={{ color: '#c71585' }} />;
    if (text.includes("compression") || text.includes("circulation")) return <MdCompress style={{ color: '#c71585' }} />;
    if (text.includes("color") || text.includes("pastel") || text.includes("design") || text.includes("stylish") || text.includes("sophistication") || text.includes("classic") || text.includes("comfort")) return <FaPalette style={{ color: '#c71585' }} />;
    if (text.includes("wash") || text.includes("dry")) return <MdLocalLaundryService style={{ color: '#c71585' }} />;
    if (text.includes("performance") || text.includes("sports") || text.includes("fitness") || text.includes("active") || text.includes("play") || text.includes("unisex") || text.includes("travel")) return <FaBolt style={{ color: '#c71585' }} />;
    if (text.includes("recovery") || text.includes("fatigue") || text.includes("swelling") || text.includes("soreness")) return <FaHeartbeat style={{ color: '#c71585' }} />;
    if (text.includes("sweat") || text.includes("wicking")) return <MdLocalLaundryService style={{ color: '#c71585' }} />;
    if (text.includes("logo") || text.includes("text") || text.includes("merchandise")) return <MdCheckCircle style={{ color: '#c71585' }} />;
    return <MdCheckCircle style={{ color: '#c71585' }} />;
  };

  return (
    <div className="product-detail-page">
      <Header />
      <div className="container detail-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft size={14} /> Back to Shop
        </button>
        <div className="detail-grid">
          <div className="product-image-section">
            <div className="main-image-container">
              <img
                src={`${API_BASE_URL}${currentImage}` || "https://via.placeholder.com/600"}
                alt={product.name}
                className="main-detail-img"
              />
            </div>
            {allImages.length > 1 && (
              <div className="thumbnail-gallery">
                {allImages.map((img, i) => (
                  <img
                    key={i}
                    src={`${API_BASE_URL}${img}`}
                    alt={`thumb-${i}`}
                    className={`thumb-img ${currentImage === img ? "active-thumb" : ""}`}
                    onClick={() => setCurrentImage(img)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="product-info-section">
            <h1 className="detail-title">{product.name}</h1>
            <div className="detail-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                {isDiscountActive ? (
                  <>
                    <span className="old-price">₹{product.price}</span>
                    <span className="price">
                      ₹{discountedPrice}
                      <span className="off-text"> ({Number(product.discountPercent).toFixed(1)}% OFF)</span>
                    </span>
                  </>
                ) : (
                  <span className="price">₹{product.price}</span>
                )}
              </div>
              <span className="gst-excl-detail-label" style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', fontWeight: '500' }}>(Excluding {product.gstPercent !== undefined ? product.gstPercent : 18}% GST)</span>
            </div>

            <div className="detail-rating" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={i < Math.round(product.averageRating || 0) ? "star-filled" : "star-empty"}
                  />
                ))}
              </div>
              <span className="reviews">({product.ratingCount || 0} ratings)</span>
              {product.tag && <span className="detail-tag">{product.tag}</span>}
              <span className={`stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`} style={{ fontWeight: 'bold', color: isOutOfStock ? '#e3000f' : '#10b981', padding: '4px 8px', backgroundColor: isOutOfStock ? '#fff1f2' : '#ecfdf5', borderRadius: '4px', fontSize: '12px' }}>
                {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
              </span>
            </div>

            {product.specifications && product.specifications.length > 0 && (
              <div className="specifications-section">
                <table className="specifications-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Specification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx}>
                        <td className="spec-label">{spec.label}</td>
                        <td className="spec-value">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {product.description
              ? renderDescription(product.description, !showFullDescription)
              : <p className="desc-body">Elevate your style with this premium quality {product.name.toLowerCase()}.</p>
            }
            {product.description && (
              <button className="read-more-btn" onClick={() => setShowFullDescription(!showFullDescription)}>
                {showFullDescription ? 'Show less' : 'Read more'}
              </button>
            )}


            {product.features && product.features.length > 0 && (
              <div className="features-accordion">
                <div className="accordion-header" onClick={() => setShowFeatures(!showFeatures)}>
                  <h4>Key Features</h4>
                  <span className={`toggle-icon ${showFeatures ? 'open' : ''}`}>
                    {showFeatures ? <span style={{ fontSize: '1.5rem' }}>−</span> : <span style={{ fontSize: '1.5rem' }}>+</span>}
                  </span>
                </div>
                {showFeatures && (
                  <ul className="features-list">
                    {product.features.map((feature, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="feature-icon">{getFeatureIcon(feature)}</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="selection-group">
              <h4>Quantity</h4>
              <div className="quantity-control">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={isOutOfStock}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={isOutOfStock || quantity >= product.stock}>+</button>
              </div>
            </div>
            <div className="action-buttons">
              <button className="add-to-cart-outline" onClick={handleAddToCart} disabled={isOutOfStock} style={{ opacity: isOutOfStock ? 0.5 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>
                <FaShoppingCart /> {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button className="buy-now-btn" onClick={handleBuyNow} disabled={isOutOfStock} style={{ opacity: isOutOfStock ? 0.5 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>
                {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
              </button>
              <button 
                className="download-pdf-btn" 
                onClick={handleDownloadPDF} 
                disabled={isDownloadingPdf}
                title="Download product specification sheet"
              >
                <FaFilePdf /> {isDownloadingPdf ? "Downloading..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>

        <div className="review-section">
          <h2>Customer Reviews</h2>
          <div className="reviews-layout">
            <div className="review-form-card">
              <h3>Write a Review</h3>
              <form onSubmit={handleSubmitReview}>
                <div className="rating-input">
                  <label>Rating:</label>
                  <div className="star-selector">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={star <= userRating ? "star-filled" : "star-empty"}
                        onClick={() => setUserRating(star)}
                      />
                    ))}
                  </div>
                </div>
                <div className="comment-input">
                  <label>Comment:</label>
                  <textarea
                    placeholder="Share your experience..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div className="image-input">
                  <label>Upload Images:</label>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} />
                  <div className="image-previews">
                    {uploadImages.map((img, i) => (
                      <img
                        key={i}
                        src={URL.createObjectURL(img)}
                        alt="preview"
                        className="preview-thumb"
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="submit-review-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Post Review"}
                </button>
              </form>
            </div>
            <div className="reviews-list">
              {reviews.length === 0 ? (
                <p className="no-reviews">No reviews yet. Be the first to rate this product!</p>
              ) : (
                reviews.map((rev, index) => (
                  <div key={index} className="review-item">
                    <div className="review-header">
                      <div className="user-info">
                        <strong>{rev.userName}</strong>
                        <span className="review-date">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="review-rating">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className={i < rev.rating ? "star-filled" : "star-empty"} />
                        ))}
                      </div>
                    </div>
                    <p className="review-comment">{rev.comment}</p>
                    {rev.images && rev.images.length > 0 && (
                      <div className="review-images">
                        {rev.images.map((img, i) => (
                          <img
                            key={i}
                            src={`${API_BASE_URL}${img}`}
                            alt="review"
                            onClick={() => window.open(`${API_BASE_URL}${img}`, "_blank")}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;


