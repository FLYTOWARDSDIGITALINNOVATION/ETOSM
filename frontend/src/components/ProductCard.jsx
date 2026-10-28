import API_BASE_URL from '../apiConfig';
import React, { useState } from "react";
import { FaHeart, FaEye, FaShoppingCart, FaStar } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import "../styles/ProductCard.css";

const ProductCard = ({ product, variant, index = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [showAdded, setShowAdded] = useState(false);
  const [showWishAdded, setShowWishAdded] = useState(false);

  const isWishlisted = wishlist.some(p => p._id === product._id);
  const isOutOfStock = product?.stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product);
    setShowAdded(true);
    setTimeout(() => {
      setShowAdded(false);
      if (location.pathname === "/wishlist") navigate("/cart");
    }, 1500);
  };

  const toggleWishlist = () => {
    if (isWishlisted) {
      removeFromWishlist(product._id);
    } else {
      addToWishlist(product);
      setShowWishAdded(true);
      setTimeout(() => setShowWishAdded(false), 1500);
    }
  };
  const now = new Date();

  const discountActive =
    product.discountPercent > 0 &&
    product.discountStart &&
    product.discountEnd &&
    now >= new Date(product.discountStart) &&
    now <= new Date(product.discountEnd);

  const discountedPrice = discountActive
    ? Math.round(product.price - (product.price * product.discountPercent) / 100)
    : product.price;


  // Catalog badge selection matching reference image
  const getCatalogBadge = () => {
    if (isOutOfStock) return { label: "Out of Stock", type: "out-of-stock" };
    if (product.badge) {
      const b = String(product.badge).toLowerCase();
      if (b.includes("best") || b.includes("seller")) return { label: "Best Seller", type: "bestseller" };
      if (b.includes("new")) return { label: "New", type: "new" };
      if (b.includes("pop")) return { label: "Popular", type: "popular" };
      return { label: "Featured", type: "featured" };
    }
    const badges = [
      { label: "Best Seller", type: "bestseller" },
      { label: "New", type: "new" },
      { label: "Popular", type: "popular" },
      { label: "Featured", type: "featured" }
    ];
    return badges[index % badges.length];
  };

  const badgeInfo = getCatalogBadge();

  if (variant === "catalog") {
    return (
      <div 
        className="cat-product-card" 
        onClick={() => navigate(`/product/${product.slug || product._id}`)}
      >
        {/* Top-Left Category Badge (Best Seller, New, Popular, Featured) */}
        {badgeInfo && (
          <span className={`cat-card-pill-badge ${badgeInfo.type}`}>
            {badgeInfo.label}
          </span>
        )}

        {/* Product Image */}
        <div className="cat-card-img-wrap">
          <img 
            src={product.image ? `${API_BASE_URL}${product.image}` : "https://via.placeholder.com/300x300?text=No+Image"}
            alt={product.name} 
            onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x300?text=No+Image"; }}
          />
        </div>

        {/* Card Body */}
        <div className="cat-card-body">
          <h3 className="cat-card-title">{product.name}</h3>
          
          <span className="cat-card-category-link">
            {product.category || "Electronic Components"}
          </span>

          <div className="cat-card-price-row">
            <span className="cat-card-price">
              ₹ {Number(discountedPrice || product.price || 0).toLocaleString("en-IN")}
            </span>
            {discountActive && (
              <span className="cat-card-orig-price">
                ₹ {Number(product.price || 0).toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {/* Rating */}
          <div className="cat-card-rating-row">
            <div className="cat-card-stars">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} size={13} color="#f59e0b" />
              ))}
            </div>
            <span className="cat-card-rating-count">
              ({product.ratingCount || (10 + (index * 6) % 25)})
            </span>
          </div>

          {/* Bottom Actions Row: Add to Cart & Wishlist */}
          <div className="cat-card-actions-row">
            <button 
              className="cat-card-add-btn" 
              onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
              disabled={isOutOfStock}
              style={{ opacity: isOutOfStock ? 0.6 : 1, cursor: isOutOfStock ? "not-allowed" : "pointer" }}
            >
              <FaShoppingCart size={13} />
              <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
            </button>

            <button 
              className={`cat-card-wish-btn ${isWishlisted ? "active" : ""}`} 
              onClick={(e) => { e.stopPropagation(); toggleWishlist(); }}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <FaHeart size={14} />
            </button>
          </div>
        </div>

        {showAdded && <div className="added-toast">Product added to cart</div>}
        {showWishAdded && <div className="added-toast">Added to wishlist</div>}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="image-box">
        {isOutOfStock && (
          <div className="out-of-stock-badge" style={{ position: 'absolute', top: '10px', left: '10px', background: '#e3000f', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', zIndex: 10 }}>
            OUT OF STOCK
          </div>
        )}
        <button className={`wishlist-btn ${isWishlisted ? "liked" : ""}`} onClick={toggleWishlist} title="Add to wishlist">
          <FaHeart />
        </button>

        <img 
          src={product.image ? `${API_BASE_URL}${product.image}` : "https://via.placeholder.com/300x300?text=No+Image"}
          alt={product.name} 
          onClick={() => navigate(`/product/${product.slug || product._id}`)}
          style={{ cursor: 'pointer' }}
          onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x300?text=No+Image"; }}
        />

        {showAdded && <div className="added-toast">Product added to cart</div>}
        {showWishAdded && <div className="added-toast">Added to wishlist</div>}

        <div className="overlay-actions">
          <button className="quick-view-btn" onClick={() => navigate(`/product/${product.slug || product._id}`)}>
            <FaEye /> Quick View
          </button>
        </div>
      </div>

      <div className="card-info">
        <h4 
          className="product-title"
          onClick={() => navigate(`/product/${product.slug || product._id}`)}
          style={{ cursor: 'pointer' }}
        >
          {product.name}
        </h4>
        {product.sku != null && product.sku !== "" && (
          <div style={{ marginTop: '2px', marginBottom: '4px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: '500',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              padding: '1px 6px'
            }}>
              <span style={{ color: '#94a3b8', fontWeight: '400' }}>SKU:</span>
              <span style={{ color: '#1e293b', fontWeight: '700' }}>{product.sku}</span>
            </span>
          </div>
        )}
        <div className="rating-container">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <FaStar key={i} size={14} color={i < Math.round(product.averageRating || 0) ? "#FFD700" : "#e5e7eb"} />
            ))}
          </div>
          <span className="rating-count">({product.ratingCount || 0})</span>
        </div>
        <div className="price-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {discountActive ? (
              <>
                <span className="discounted-price">₹{discountedPrice}</span>
                <span className="original-price">₹{product.price}</span>
              </>
            ) : (
              <span className="normal-price">₹{product.price} </span>
            )}
          </div>
          <span className="gst-excl-label" style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Excl. {product.gstPercent !== undefined ? product.gstPercent : 18}% GST</span>
        </div>
        <button 
          className="add-cart-btn" 
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          style={{ opacity: isOutOfStock ? 0.5 : 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
        >
          <FaShoppingCart /> {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;


