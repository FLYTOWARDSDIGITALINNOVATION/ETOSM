import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, Eye, X, MapPin, CreditCard, ShoppingBag, Printer } from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AdminOrdersPage.css";

const STATUS_OPTIONS = [
  "Ordered",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ✅ AUTH CHECK
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user || !user.isAdmin) {
      navigate("/login");
    }
  }, [navigate]);

  // ✅ FETCH ORDERS
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      let url = `${API_BASE_URL}/admin/orders`;
      if (fromDate && toDate) {
        url += `?from=${fromDate}&to=${toDate}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch orders: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Orders data:", data); // Debugging log

      if (data && Array.isArray(data.orders)) {
        const sortedOrders = [...data.orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOrders(sortedOrders);
      } else {
        console.error("Invalid data format:", data);
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
      alert(`Error loading orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ UPDATE STATUS
  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");

    await fetch(`${API_BASE_URL}/admin/orders/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    fetchOrders();
  };

  return (
    <AdminLayout>
      <div className="orders-container">
        <div className="page-header">
          <h1>Orders Management</h1>
          <p>View and manage all customer orders</p>
        </div>

        {/* 🔄 LOADING */}
        {loading && (
          <div className="loading-state">
            <Clock size={40} className="spin" />
            <p>Loading orders...</p>
          </div>
        )}

        {/* 📭 EMPTY */}
        {!loading && orders.length === 0 && (
          <div className="empty-state">
            <Package size={48} />
            <p>No orders found</p>
          </div>
        )}

        {/* 📦 TABLE */}
        {!loading && orders.length > 0 && (
          <>
            <div className="filter-bar">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From Date" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To Date" />
              <button className="filter-btn" onClick={fetchOrders}>
                Filter
              </button>
            </div>

            <div className="table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Invoice ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td className="order-id">#{o._id?.slice(-6) || 'N/A'}</td>
                      <td style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                        {o.invoiceNumber || 'N/A'}
                      </td>
                      <td>
                        <strong>{o.userName || 'New Customer'}</strong>
                        <br />
                        <small>{o.userEmail || 'No Email'}</small>
                      </td>
                      <td>
                        <strong>{o.productName || 'Unknown Product'}</strong>
                        <br />
                        <small style={{ color: '#64748b' }}>ID: {o.productId || 'N/A'}</small>
                      </td>
                      <td>{o.quantity || 0}</td>
                      <td className="price">₹{o.totalAmount?.toFixed(2) || o.price || '0.00'}</td>
                      <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <select
                          value={o.status || "Ordered"}
                          className={`status-select ${(o.status || "ordered").toLowerCase()}`}
                          onChange={(e) => updateStatus(o._id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="details-btn" onClick={() => setSelectedOrder(o)} title="View Details">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 🔍 ORDER DETAILS MODAL */}
      {
        selectedOrder && (
          <div className="order-modal-overlay">
            <div className="order-modal">
              <div className="modal-header">
                <h3>Order Details</h3>
                <div className="no-print" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    onClick={() => window.print()}
                    style={{
                      background: 'linear-gradient(135deg, #e3000f 0%, #b3000c 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(227, 0, 15, 0.2)'
                    }}
                  >
                    <Printer size={14} /> Print Slip
                  </button>
                  <button className="close-btn" onClick={() => setSelectedOrder(null)}><X size={20} /></button>
                </div>
              </div>

              <div className="modal-content">
                <div className="modal-section">
                  <h4><MapPin size={16} /> Shipping Address</h4>
                  <div className="address-box">
                    <p><strong>Name:</strong> {selectedOrder.shippingAddress?.firstName} {selectedOrder.shippingAddress?.lastName}</p>
                    <p><strong>Email:</strong> {selectedOrder.shippingAddress?.email}</p>
                    <p><strong>Phone:</strong> {selectedOrder.phone || selectedOrder.shippingAddress?.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> 
                        <br />{selectedOrder.shippingAddress?.address}{selectedOrder.shippingAddress?.apartment ? ` (${selectedOrder.shippingAddress.apartment})` : ''}
                        {selectedOrder.shippingAddress?.locality && <><br />{selectedOrder.shippingAddress.locality}</>}
                        <br />{[selectedOrder.shippingAddress?.city, selectedOrder.shippingAddress?.state, selectedOrder.shippingAddress?.postalCode].filter(Boolean).join(', ')}
                    </p>
                    <p><strong>Method:</strong> {selectedOrder.shippingMethod?.toUpperCase()}</p>
                  </div>
                </div>

                <div className="modal-section">
                  <h4><CreditCard size={16} /> Payment & Billing</h4>
                  <div className="payment-box">
                    <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod?.toUpperCase()}</p>
                    <p><strong>Invoice ID:</strong> {selectedOrder.invoiceNumber || 'N/A'}</p>
                    <p><strong>Razorpay Payment ID:</strong> {selectedOrder.razorpayPaymentId || (selectedOrder.invoiceNumber?.startsWith('pay_') ? selectedOrder.invoiceNumber : 'N/A')}</p>
                    {selectedOrder.razorpayOrderId && <p><strong>Razorpay Order ID:</strong> {selectedOrder.razorpayOrderId}</p>}
                    <div className="price-breakdown" style={{ marginTop: '10px' }}>
                      <div className="price-row"><span>Unit Price:</span> <span>₹{(selectedOrder.price / selectedOrder.quantity).toFixed(2)}</span></div>
                      <div className="price-row"><span>Quantity:</span> <span>x{selectedOrder.quantity}</span></div>
                      <div className="price-row"><span>Product Total:</span> <span>₹{selectedOrder.price}</span></div>
                      <div className="price-row"><span>Shipping:</span> <span>₹{selectedOrder.shippingCost || 0}</span></div>
                      <div className="price-row"><span>GST:</span> <span>₹{selectedOrder.tax?.toFixed(2) || '0.00'}</span></div>
                      <hr />
                      <div className="price-row total"><span>Order Total:</span> <span>₹{selectedOrder.totalAmount?.toFixed(2) || selectedOrder.price}</span></div>
                    </div>
                  </div>
                </div>

                <div className="modal-section">
                  <h4><ShoppingBag size={16} /> Product Info</h4>
                  <div className="product-box">
                    <p><strong>Product Name:</strong> {selectedOrder.productName || 'N/A'}</p>
                    <p><strong>Product ID:</strong> {selectedOrder.productId || 'N/A'}</p>
                    <p><strong>Database Order ID:</strong> {selectedOrder._id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </AdminLayout>
  );
};

export default AdminOrdersPage;



