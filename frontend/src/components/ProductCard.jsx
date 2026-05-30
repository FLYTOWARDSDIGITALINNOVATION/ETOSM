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

  const handleAddToCart = () => {
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
        <button className={`wishlist-btn ${isWishlisted ? "liked" : ""}`} onClick={toggleWishlist} title="Add to wishlist">
          <FaHeart />
        </button>

        <img 
          src={`${API_BASE_URL}${product.image}`} 
          alt={product.name} 
          onClick={() => navigate(`/product/${product._id}`)}
          style={{ cursor: 'pointer' }}
        />

        {showAdded && <div className="added-toast">Product added to cart</div>}
        {showWishAdded && <div className="added-toast">Added to wishlist</div>}

        <div className="overlay-actions">
          <button className="quick-view-btn" onClick={() => navigate(`/product/${product._id}`)}>
            <FaEye /> Quick View
          </button>
        </div>
      </div>

      <div className="card-info">
        <h4 
          className="product-title"
          onClick={() => navigate(`/product/${product._id}`)}
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
        <div className="price-box">
          {discountActive ? (
            <>
              <span className="discounted-price">₹{discountedPrice}</span>
              <span className="original-price">₹{product.price}</span>
            </>
          ) : (
            <span className="normal-price">₹{product.price} </span>
          )}
        </div>
        <button className="add-cart-btn" onClick={handleAddToCart}>
          <FaShoppingCart /> Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;


