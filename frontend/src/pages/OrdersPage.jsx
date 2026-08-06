import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaStar, FaBoxOpen, FaArrowLeft, FaCheck } from "react-icons/fa";
import "./OrdersPage.css";

const OrdersPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [hover, setHover] = useState(null);

    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        if (user?.email) {
            fetch(`${API_BASE_URL}/orders/${user.email}`)
                .then((res) => res.json())
                .then((data) => {
                    setOrders(data);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Error fetching orders:", err);
                    setLoading(false);
                });
        }
    }, [user]);

    const handleOpenModal = (order) => {
        setSelectedOrder(order);
        setRating(0);
        setComment("");
    };

    const handleCloseModal = () => {
        setSelectedOrder(null);
    };

    const handleSubmitReview = async () => {
        if (rating === 0) {
            alert("Please select a star rating");
            return;
        }

        const formData = new FormData();
        formData.append("productId", selectedOrder.productId);
        formData.append("userEmail", user.email);
        formData.append("userName", user.name);
        formData.append("rating", rating);
        formData.append("comment", comment);

        try {
            const res = await fetch(`${API_BASE_URL}/reviews`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                alert("Review submitted successfully!");
                handleCloseModal();
            } else {
                const data = await res.json();
                alert(data.message || "Failed to submit review");
            }
        } catch (err) {
            console.error(err);
            alert("Error submitting review");
        }
    };

    const updateOrderStatus = async (orderId, nextStatus) => {
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus })
            });
            if (res.ok) {
                const updatedOrder = await res.json();
                setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder.order : o));
            }
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    if (loading) return <div className="loading">Loading orders...</div>;

    const stages = ["Ordered", "Packed", "Shipped", "Delivered"];

    return (
        <div className="orders-container">
            {/* BACK BUTTON */}
            <button className="back-home-btn" onClick={() => navigate("/home")}>
                <FaArrowLeft /> Back to Shop
            </button>

            <h2 className="orders-heading">My Orders</h2>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <FaBoxOpen size={50} />
                    <h3>No orders found</h3>
                    <p>You haven't purchased anything yet.</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map((order) => {
                        const isCancelled = order.status === "Cancelled";
                        const currentStageIndex = isCancelled ? -1 : stages.indexOf(order.status || "Ordered");
                        return (
                            <div key={order._id} className="order-card">
                                <div className="order-header">
                                    <span>Ordered on {new Date(order.createdAt).toLocaleDateString()}</span>
                                    <span>Order ID: {order._id.slice(-6).toUpperCase()}</span>
                                </div>

                                {/* Visual Stepper */}
                                {!isCancelled ? (
                                    <div className="order-stepper">
                                        {stages.map((stage, index) => (
                                            <div key={stage} className={`step ${index <= currentStageIndex ? "active completed" : ""}`}>
                                                <div className="step-circle">
                                                    {index < currentStageIndex ? <FaCheck size={12} /> : index + 1}
                                                </div>
                                                <div className="step-label">{stage}</div>
                                                {index < stages.length - 1 && <div className="step-line"></div>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="cancelled-banner" style={{ padding: '12px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', border: '1px solid #fee2e2', fontWeight: '600', textAlign: 'center', margin: '15px 0' }}>
                                        This order has been Cancelled
                                    </div>
                                )}

                                <div className="order-details">
                                    <div className="product-info">
                                        <span className="product-name">{order.productName}</span>
                                        <span className="product-qty">Quantity: {order.quantity}</span>
                                        {order.variation && <span className="product-qty" style={{ marginLeft: '10px' }}>Size: {order.variation}</span>}
                                        <div className="order-dates">
                                            {order.packedAt && (
                                                <span className="date-info packed">
                                                    Packed: {new Date(order.packedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                            {order.shippedAt && (
                                                <span className="date-info shipped">
                                                    Shipped: {new Date(order.shippedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                            {order.deliveredAt && (
                                                <span className="date-info delivered">
                                                    Delivered: {new Date(order.deliveredAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="order-meta">
                                        <div className="order-price">₹{order.price}</div>
                                        <span className={`order-status status-${order.status?.toLowerCase() || 'ordered'}`}>
                                            {order.status || "Ordered"}
                                        </span>
                                    </div>
                                </div>

                                <div className="order-actions">
                                    <button className="rate-btn" onClick={() => handleOpenModal(order)}>
                                        <FaStar /> Rate & Review
                                    </button>

                                    <div className="demo-controls">
                                        {order.status === "Ordered" && (
                                            <button className="demo-btn pack" onClick={() => updateOrderStatus(order._id, "Packed")}>
                                                Pack Item
                                            </button>
                                        )}
                                        {order.status === "Packed" && (
                                            <button className="demo-btn ship" onClick={() => updateOrderStatus(order._id, "Shipped")}>
                                                Ship Item
                                            </button>
                                        )}
                                        {order.status === "Shipped" && (
                                            <button className="demo-btn deliver" onClick={() => updateOrderStatus(order._id, "Delivered")}>
                                                Mark Delivered
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Review Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Rate {selectedOrder.productName}</h3>
                        <div className="star-rating">
                            {[...Array(5)].map((_, index) => {
                                const val = index + 1;
                                return (
                                    <FaStar
                                        key={index}
                                        className={`star-icon ${val <= (hover || rating) ? "filled" : ""}`}
                                        onClick={() => setRating(val)}
                                        onMouseEnter={() => setHover(val)}
                                        onMouseLeave={() => setHover(null)}
                                    />
                                );
                            })}
                        </div>
                        <textarea
                            className="review-input"
                            placeholder="How was your experience with this product?"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={handleCloseModal}>Cancel</button>
                            <button className="submit-btn" onClick={handleSubmitReview}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersPage;


