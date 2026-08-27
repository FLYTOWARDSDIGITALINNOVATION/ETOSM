import API_BASE_URL from '../apiConfig';
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { Trash2, ChevronLeft } from "lucide-react";
import Header from "../components/Header";
import "./CartPage.css";

const CartPage = () => {
  const { cart, removeFromCart, updateQty } = useCart();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const subtotal = cart.reduce(
    (acc, item) => acc + (Number(item.unitPrice || item.price) * Number(item.qty)),
    0
  );

  const tax = cart.reduce(
    (acc, item) => acc + (Number(item.unitPrice || item.price) * Number(item.qty) * (Number(item.gstPercent !== undefined ? item.gstPercent : 18) / 100)),
    0
  );
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (!user) {
      alert("Please login to proceed with checkout");
      navigate("/auth");
      return;
    }
    navigate("/checkout");
  };

  return (
    <div className="cart-page-wrapper">
      <Header />

      <div className={`container cart-container ${cart.length === 0 ? "is-empty" : ""}`}>
        {cart.length > 0 && (
          <>
            <div className="continue-link" onClick={() => navigate("/home")}>
              <ChevronLeft size={16} /> Continue Shopping
            </div>
            <h1 className="cart-title">
              Shopping Cart ({cart.length} items)
            </h1>
          </>
        )}

        {cart.length === 0 ? (
          <div className="empty-cart-card">
            <div className="cart-icon-wrapper">🛒</div>
            <h2 className="empty-title">Your bag is light as a feather!</h2>
            <p className="empty-subtitle">
              Fill it with things that make you smile.
            </p>
            <button
              className="classic-shop-btn"
              onClick={() => navigate("/home")}
            >
              Fill Your Bag
            </button>
          </div>
        ) : (
          <div className="cart-grid">
            {/* LEFT COLUMN */}
            <div className="cart-items-column">
              {cart.map((item) => {
                // ✅ IMAGE FIX (NO other file touched)
                // ✅ IMAGE FIX: Handle relative paths from backend
                let imageSrc = item.img || item.image || "https://via.placeholder.com/120";
                if (imageSrc.startsWith("/")) {
                  imageSrc = `${API_BASE_URL}${imageSrc}`;
                }

                return (
                  <div key={item.productId} className="cart-product-card">
                    <img
                      src={imageSrc}
                      alt={item.name}
                      className="product-img"
                    />

                    <div className="product-details">
                      <div className="product-header">
                        <h3>{item.name}</h3>
                        {item.variation && <p className="product-variation">Size: {item.variation}</p>}
                        <button
                          className="delete-btn"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="product-footer">
                        <div className="qty-controls">
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.qty - 1)}
                            disabled={item.qty <= 1}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="cart-qty-input"
                            min="1"
                            max={item.stock || 999}
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1) {
                                updateQty(item.productId, val);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.qty + 1)}
                            disabled={item.stock && item.qty >= item.stock}
                          >
                            +
                          </button>
                        </div>

                        <span className="current-price">
                          ₹{(Number(item.unitPrice || item.price) * Number(item.qty)).toFixed(2)}
                          <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px', fontWeight: 'normal' }}>(excl. {item.gstPercent !== undefined ? item.gstPercent : 18}% GST)</span>
                        </span>


                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT COLUMN */}
            <div className="summary-column">
              <div className="summary-card">
                <h3>Order Summary</h3>

                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="summary-row">
                  <span>GST</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>

                <hr />

                <div className="summary-row total">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>

                <button
                  className="checkout-full-btn"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;




