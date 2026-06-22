import API_BASE_URL from '../apiConfig';
import React, { useState } from "react";
import { FaHeart, FaEye, FaShoppingCart, FaStar } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import "../styles/ProductCard.css";

const ProductCard = ({ product }) => {
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


