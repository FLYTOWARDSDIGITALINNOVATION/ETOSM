import API_BASE_URL from '../apiConfig';
import React from "react";
import { FaCheck, FaShoppingCart } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./CategoryCard.css";

const CategoryCard = ({ product }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [showCartAdded, setShowCartAdded] = React.useState(false);

    const handleAddToCart = (e) => {
        e.stopPropagation();
        addToCart(product);
        setShowCartAdded(true);
        setTimeout(() => setShowCartAdded(false), 1500);
    };

    // Parse title to roughly match the stacked style "Yoga \n Socks"
    const titleWords = product.name.split(" ");
    const firstLine = titleWords[0];
    const secondLine = titleWords.slice(1).join(" ");

    return (
        <div className="category-card">
            <div className="category-image-wrapper">
                <img
                    src={`${API_BASE_URL}${product.image}`}
                    alt={product.name}
                    className="category-img"
                />
                <button className="cart-overlay-btn" onClick={handleAddToCart} title="Add to cart">
                    <FaShoppingCart />
                </button>
                {showCartAdded && <div className="added-toast">Product added to cart</div>}
            </div>

            <div className="category-content">
                <h3 className="category-title">
                    <span className="title-highlight">{firstLine}</span>
                    <br />
                    <span className="title-secondary">{secondLine}</span>
                </h3>

                <div className="features-list">
                    {product.features && product.features.map((feature, idx) => (
                        <div key={idx} className="feature-item">
                            <span className="checkbox-icon">☑</span> {feature}
                        </div>
                    ))}
                </div>

                <button
                    className="view-more-btn"
                    onClick={() => navigate(`/product/${product.slug || product._id}`)}
                >
                    View More
                </button>
            </div>
        </div>
    );
};

export default CategoryCard;



