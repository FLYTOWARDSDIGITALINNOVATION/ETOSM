import API_BASE_URL from '../apiConfig';
import React, { useState } from 'react';
import { useCart } from "../context/CartContext";
import { ChevronLeft, Lock, FileText } from 'lucide-react';
import { useNavigate, useLocation } from "react-router-dom";
import OrderReceipt from '../components/OrderReceipt';
import './Checkout.css';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  // Handle Buy Now item (single item checkout)
  const buyNowItem = location.state?.buyNowItem;
  const checkoutItems = buyNowItem ? [buyNowItem] : cart;

  // Get previous addresses from localStorage
  const previousAddresses = user ? JSON.parse(localStorage.getItem(`addresses_${user.email}`)) || [] : [];

  // State for selection logic
  const [selectedShipping, setSelectedShipping] = useState('standard');
  const [selectedPayment, setSelectedPayment] = useState('razorpay');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [useExistingAddress, setUseExistingAddress] = useState(previousAddresses.length > 0);
  const [selectedPreviousAddress, setSelectedPreviousAddress] = useState(previousAddresses.length > 0 ? 0 : null);

  // State for shipping information
  const [shippingInfo, setShippingInfo] = useState({
    firstName: useExistingAddress && previousAddresses.length > 0 ? previousAddresses[0].firstName : '',
    lastName: useExistingAddress && previousAddresses.length > 0 ? previousAddresses[0].lastName : '',
    email: user?.email || '',
    phone: useExistingAddress && previousAddresses.length > 0 ? previousAddresses[0].phone : '',
    address: useExistingAddress && previousAddresses.length > 0 ? previousAddresses[0].address : ''
  });

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectPreviousAddress = (index) => {
    const addr = previousAddresses[index];
    setSelectedPreviousAddress(index);
    setShippingInfo({
      firstName: addr.firstName,
      lastName: addr.lastName,
      email: addr.email,
      phone: addr.phone,
      address: addr.address
    });
  };

  // Calculations
  const subtotal = checkoutItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const shippingCosts = { standard: 0, express: 9.99, overnight: 24.99 };
  const shippingCost = shippingCosts[selectedShipping];
  const tax = subtotal * 0.08;
  const total = subtotal + tax + shippingCost;

  const handlePlaceOrder = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!shippingInfo.firstName || !shippingInfo.address || !shippingInfo.phone) {
      alert("Please fill in required shipping information including phone number");
      return;
    }

    // Save address for future use
    const addresses = previousAddresses;
    const addressExists = addresses.some(addr => addr.address === shippingInfo.address);
    if (!addressExists) {
      addresses.push(shippingInfo);
      localStorage.setItem(`addresses_${user.email}`, JSON.stringify(addresses));
    }

    const placeDatabaseOrder = async () => {
      try {
        const orderPromises = checkoutItems.map(item =>
          fetch(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName: item.name,
              productId: item._id || item.id,
              quantity: item.qty,
              price: item.price * item.qty,
              userEmail: user.email,
              userName: user.name,
              phone: shippingInfo.phone,
              shippingAddress: shippingInfo,
              shippingMethod: selectedShipping,
              paymentMethod: selectedPayment,
              shippingCost: shippingCost,
              tax: item.qty * (item.price * 0.08),
              totalAmount: (item.price * item.qty) + (item.qty * (item.price * 0.08)) + (shippingCost / checkoutItems.length),
              variation: item.variation || item.size
            })
          })
        );

        await Promise.all(orderPromises);
        if (clearCart && !buyNowItem) clearCart();
        navigate('/order-success', { state: { purchasedItems: checkoutItems } });
      } catch (error) {
        console.error("Order failed:", error);
        alert("Failed to place order. Please try again.");
      }
    };

    if (selectedPayment === 'razorpay') {
      const res = await loadRazorpay();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        return;
      }

      try {
        // 1. Create order on backend
        const orderRes = await fetch(`${API_BASE_URL}/payment/razorpay/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: total })
        });
        const orderData = await orderRes.json();

        if (!orderData || !orderData.id) {
          alert("Server error. Please try again.");
          return;
        }

        // 2. Open Razorpay Checkout Modal
        const options = {
          key: 'rzp_live_T1px3FgPWmGoPr', // Public Key ID
          amount: orderData.amount,
          currency: orderData.currency,
          name: "ETOSM Technology",
          description: "Test Transaction",
          image: "/logo1.png",
          order_id: orderData.id,
          handler: async function (response) {
            // 3. Verify Payment
            const verifyRes = await fetch(`${API_BASE_URL}/payment/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              await placeDatabaseOrder();
            } else {
              alert("Payment Verification Failed!");
            }
          },
          prefill: {
            name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
            email: shippingInfo.email,
            contact: shippingInfo.phone
          },
          theme: {
            color: "#c71585"
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();

      } catch (error) {
        console.error("Payment Error:", error);
        alert("Something went wrong with the payment gateway.");
      }
    } else {
      // COD flow
      await placeDatabaseOrder();
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">

        {/* Navigation */}
        <div className="back-to-cart" onClick={() => navigate("/cart")}>
          <ChevronLeft size={18} /> Back to Cart
        </div>

        <h1 className="checkout-title">Secure Checkout</h1>

        <div className="checkout-grid">

          {/* LEFT COLUMN: FORMS */}
          <div className="checkout-main">

            {/* Step 1: Shipping Information */}
            <section className="checkout-card">
              <div className="step-header">
                <span className="step-num">1</span>
                <h3>Shipping Information</h3>
              </div>

              {/* Previous Addresses Option */}
              {previousAddresses.length > 0 && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="radio"
                      checked={useExistingAddress}
                      onChange={() => setUseExistingAddress(true)}
                      style={{ marginRight: '10px' }}
                    />
                    <label style={{ fontWeight: '500' }}>Use Previous Address</label>
                  </div>
                  {useExistingAddress && (
                    <div style={{ marginLeft: '25px', marginBottom: '15px' }}>
                      {previousAddresses.map((addr, idx) => (
                        <div key={idx} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleSelectPreviousAddress(idx)}>
                          <input
                            type="radio"
                            checked={selectedPreviousAddress === idx}
                            onChange={() => handleSelectPreviousAddress(idx)}
                            style={{ marginRight: '10px' }}
                          />
                          <label style={{ cursor: 'pointer' }}>
                            {addr.firstName} {addr.lastName} - {addr.address}, {addr.phone}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="radio"
                      checked={!useExistingAddress}
                      onChange={() => setUseExistingAddress(false)}
                      style={{ marginRight: '10px' }}
                    />
                    <label style={{ fontWeight: '500' }}>Use New Address</label>
                  </div>
                </div>
              )}

              <div className="input-grid">
                <div className="field">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="FirstName"
                    value={shippingInfo.firstName}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="field">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="LastName"
                    value={shippingInfo.lastName}
                    onChange={handleShippingChange}
                  />
                </div>
                <div className="field full">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="example@gmail.com"
                    value={shippingInfo.email}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="field full">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+91 xxxxxxxxxx"
                    value={shippingInfo.phone}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className="field full">
                  <label>Street Address</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="123 Main Street"
                    value={shippingInfo.address}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Step 2: Shipping Method */}
            <section className="checkout-card">
              <div className="step-header">
                <span className="step-num">2</span>
                <h3>Shipping Method</h3>
              </div>
              <div className="method-selection-container">
                <label className={`method-option ${selectedShipping === 'standard' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    onChange={() => setSelectedShipping('standard')}
                    checked={selectedShipping === 'standard'}
                  />
                  <span className="custom-radio"></span>
                  <div className="method-details">
                    <span className="method-title">Standard Shipping <span className="method-time">5-7 business days</span></span>
                  </div>
                  <span className="method-price free">FREE</span>
                </label>

                <label className={`method-option ${selectedShipping === 'express' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    onChange={() => setSelectedShipping('express')}
                    checked={selectedShipping === 'express'}
                  />
                  <span className="custom-radio"></span>
                  <div className="method-details">
                    <span className="method-title">Express Shipping <span className="method-time">2-3 business days</span></span>
                  </div>
                  <span className="method-price">₹9.99</span>
                </label>

                <label className={`method-option ${selectedShipping === 'overnight' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    onChange={() => setSelectedShipping('overnight')}
                    checked={selectedShipping === 'overnight'}
                  />
                  <span className="custom-radio"></span>
                  <div className="method-details">
                    <span className="method-title">Overnight Shipping <span className="method-time">Next business day</span></span>
                  </div>
                  <span className="method-price">₹24.99</span>
                </label>
              </div>
            </section>

            {/* Step 3: Payment Method */}
            <section className="checkout-card">
              <div className="step-header">
                <span className="step-num">3</span>
                <h3>Payment Method</h3>
              </div>
              <div className="payment-selection-container">

                {/* 1. Pay Online (Razorpay) */}
                <label className={`method-option ${selectedPayment === 'razorpay' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    onChange={() => setSelectedPayment('razorpay')}
                    checked={selectedPayment === 'razorpay'}
                  />
                  <span className="custom-radio"></span>
                  <div className="method-details">
                    <span className="method-title">Pay Online (UPI, Cards, Netbanking)</span>
                    <p className="method-desc" style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                      Secure payments via Razorpay.
                    </p>
                  </div>
                  <div className="card-icons">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" style={{ height: '16px', marginLeft: '5px' }} />
                  </div>
                </label>

                {/* 2. Cash on Delivery */}
                <label className={`method-option ${selectedPayment === 'cod' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    onChange={() => setSelectedPayment('cod')}
                    checked={selectedPayment === 'cod'}
                  />
                  <span className="custom-radio"></span>
                  <div className="method-details">
                    <span className="method-title">Cash on Delivery (COD)</span>
                    <p className="method-desc" style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                      Pay when you receive the package.
                    </p>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: ORDER SUMMARY */}
          <aside className="checkout-sidebar">
            <div className="summary-card">
              <h3>Order Summary</h3>

              <div className="itemized-list">
                {checkoutItems.map(item => (
                  <div key={item.id} className="summary-product">
                    {/* ✅ Robust Image Loading Logic */}
                    <img
                      src={(item.image || item.img || "").startsWith("/")
                        ? `${API_BASE_URL}${item.image || item.img}`
                        : (item.image || item.img || "https://via.placeholder.com/80")}
                      alt={item.name}
                    />
                    <div className="sp-details">
                      <p className="sp-name">{item.name}</p>
                      <p className="sp-qty">Qty: {item.qty}</p>
                      <p className="sp-price">₹{item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary-totals">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? "free" : ""}>
                    {shippingCost === 0 ? "FREE" : `₹${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="total-row">
                  <span>Tax (8%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <hr />
                <div className="total-row final">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="checkout-actions">
                <button
                  className="preview-slip-btn"
                  onClick={() => setShowReceipt(true)}
                  disabled={!shippingInfo.firstName || !shippingInfo.address || !shippingInfo.phone}
                >
                  <FileText size={16} /> Preview Slip
                </button>
                <button className="place-order-btn" onClick={handlePlaceOrder}>
                  <Lock size={16} />
                  {selectedPayment === 'cod' ? 'Confirm Order' : 'Place Order'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showReceipt && (
        <OrderReceipt
          order={{
            shippingAddress: shippingInfo,
            shippingMethod: selectedShipping,
            paymentMethod: selectedPayment,
            subtotal,
            shippingCost,
            tax,
            totalAmount: total
          }}
          items={checkoutItems}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: '90%', background: '#fff0f6', border: '2px solid #ff8fb1', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: '#d63384' }}>Please login to place an order</h3>
            <p style={{ color: '#6b7280' }}>You need to be signed in to complete checkout.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => { setShowLoginModal(false); navigate('/auth'); }} style={{ background: '#ff66a3', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}>Login</button>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'transparent', border: '1px solid #ff8fb1', color: '#d63384', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;



