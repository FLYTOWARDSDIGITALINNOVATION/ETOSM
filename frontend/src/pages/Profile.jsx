import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import Header from "../components/Header";
import {
  FaUserCircle, FaBoxOpen, FaMapMarkerAlt,
  FaSignOutAlt, FaEdit, FaPlus,
  FaShoppingBag, FaShieldAlt, FaChevronRight,
  FaArrowLeft
} from "react-icons/fa";

import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { setWishlist } = useWishlist();

  const userLocal = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  const userEmail = userLocal?.email;

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState("");
  const [addressText, setAddressText] = useState("");

  // Initializing with empty strings to prevent auto-fill issues
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profilePic, setProfilePic] = useState(localStorage.getItem("profilePic"));

  if (!userEmail) {
    return (
      <div className="pro-empty-state">
        <h2>Please login to view your profile</h2>
        <button className="pro-add-btn" onClick={() => navigate("/auth")}>Go to Login</button>
      </div>
    );
  }

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/user/${userEmail}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE_URL}/orders/${userEmail}`).then(r => r.json()).catch(() => []),
      fetch(`${API_BASE_URL}/wishlist/${userEmail}`).then(r => r.json()).catch(() => [])
    ])
      .then(([userData, ordersData, wishlistData]) => {
        const safeUser = userData && userData.email ? userData : userLocal;
        setUser(safeUser);
        setAddresses(safeUser?.addresses || []);
        setOrders(ordersData || []);
        setWishlist(wishlistData || []);
      })
      .catch(() => setUser(userLocal));
  }, [userEmail, setWishlist]);

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleAddAddress = async () => {
    if (!addressText) return alert("Address required");
    const res = await fetch(`${API_BASE_URL}/user/address`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, label: addressLabel || "Other", address: addressText })
    });
    const data = await res.json();
    setAddresses(data.addresses || []);
    setShowAddressForm(false);
    setAddressLabel("");
    setAddressText("");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) return alert("Passwords do not match");
    const res = await fetch(`${API_BASE_URL}/user/update-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, currentPassword, newPassword })
    });
    const data = await res.json();
    alert(data.message || "Password updated");
    if (res.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (!user) return <div className="pro-loading">Loading profile...</div>;

  return (
    <>
      <Header disableSearch />

      <div className="pro-page-bg">
        <div className="pro-back-wrapper">
          <button className="pro-back-btn" onClick={() => navigate("/home")}>
            <FaArrowLeft /> <span>Back to Store</span>
          </button>
        </div>

        <div className="pro-container">
          <aside className="pro-sidebar">
            <div className="pro-user-card">
              <div className="pro-avatar-container">
                <div className="pro-avatar-wrapper">
                  {profilePic ? <img src={profilePic} className="pro-avatar-img" alt="Profile" /> : <FaUserCircle className="pro-avatar-placeholder" />}
                </div>
                <button className="pro-avatar-edit-btn" onClick={() => document.getElementById("avatarInput").click()}>
                  <FaEdit size={14} />
                </button>
                <input type="file" id="avatarInput" hidden onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setProfilePic(reader.result);
                      localStorage.setItem("profilePic", reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>
              <h2>{user.name}</h2>
              <p className="pro-user-meta">{user.email}</p>
            </div>

            <nav className="pro-side-nav">
              <button className="pro-nav-btn" onClick={() => navigate("/orders")}>
                <FaBoxOpen /> <span>My Orders</span> <FaChevronRight className="chevron-icon" />
              </button>
              <button className="pro-nav-btn pro-logout-btn" onClick={logout}>
                <FaSignOutAlt /> <span>Logout</span>
              </button>
            </nav>
          </aside>

          <main className="pro-content-area">
            <section className="pro-content-section">
              <div className="header-title">
                <FaShoppingBag /> <h3>Recent Orders</h3>
              </div>
              {orders.length === 0 ? <div className="pro-empty-placeholder">No orders yet</div> : (
                orders.slice(0, 3).map(order => (
                  <div key={order._id} className="pro-order-card">
                    <div>
                      <strong>{order.productName}</strong>
                      <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`status-badge ${order.status?.toLowerCase()}`}>{order.status}</span>
                  </div>
                ))
              )}
            </section>

            <section className="pro-content-section">
              <div className="header-title">
                <FaMapMarkerAlt /> <h3>Saved Addresses</h3>
              </div>
              {addresses.map((a, i) => (
                <div key={i} className="pro-address-card">
                  <strong>{a.label}</strong>
                  <p>{a.address}</p>
                </div>
              ))}
              <button className="pro-add-btn" onClick={() => setShowAddressForm(true)}>
                <FaPlus /> Add New
              </button>
              {showAddressForm && (
                <div className="pro-form-card">
                  <input placeholder="Label" value={addressLabel} onChange={e => setAddressLabel(e.target.value)} />
                  <textarea placeholder="Full address" value={addressText} onChange={e => setAddressText(e.target.value)} />
                  <button className="pro-pwd-btn" onClick={handleAddAddress}>Save Address</button>
                </div>
              )}
            </section>

            <section className="pro-content-section">
              <div className="header-title">
                <FaShieldAlt /> <h3>Security</h3>
              </div>
              <div className="pro-form-card">
                {/* autoComplete="new-password" prevents browsers from filling email/old passwords */}
                <input 
                  type="password" 
                  placeholder="Current Password" 
                  value={currentPassword} 
                  autoComplete="new-password"
                  onChange={e => setCurrentPassword(e.target.value)} 
                />
                <input 
                  type="password" 
                  placeholder="New Password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
                <input 
                  type="password" 
                  placeholder="Confirm Password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
                <button className="pro-pwd-btn" onClick={handleChangePassword}>Update Password</button>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
};

export default Profile;


