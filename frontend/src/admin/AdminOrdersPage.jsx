import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, Eye, X, MapPin, CreditCard, ShoppingBag, Printer, Search } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
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
        <div className="orders-page-header">
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
            <div className="orders-filter-bar">
              <div className="filter-search-box">
                <Search size={16} className="filter-search-icon" />
                <input
                  type="text"
                  placeholder="Search customer, email, SKU, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-search-input"
                />
              </div>
              <div className="filter-date-group">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="filter-date-input"
                  title="From Date"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="filter-date-input"
                  title="To Date"
                />
                <button className="filter-btn" onClick={fetchOrders}>
                  Filter
                </button>
              </div>
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
                  {orders
                    .filter((o) => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return (
                        (o._id || "").toLowerCase().includes(term) ||
                        (o.invoiceNumber || "").toLowerCase().includes(term) ||
                        (o.userName || "").toLowerCase().includes(term) ||
                        (o.userEmail || "").toLowerCase().includes(term) ||
                        (o.phone || "").toLowerCase().includes(term) ||
                        (o.productName || "").toLowerCase().includes(term) ||
                        (o.sku != null && String(o.sku).toLowerCase().includes(term))
                      );
                    })
                    .map((o) => (
                    <tr key={o._id} className="order-row-card">
                      <td className="col-order-id" data-label="Order ID">
                        <span className="order-id-val">#{o._id?.slice(-6) || 'N/A'}</span>
                      </td>
                      <td className="col-invoice-id" data-label="Invoice ID">
                        <span className="invoice-val">{o.invoiceNumber || 'N/A'}</span>
                      </td>
                      <td className="col-customer" data-label="Customer">
                        <div className="customer-cell">
                          <strong className="customer-name">{o.userName || 'New Customer'}</strong>
                          <small className="customer-email">{o.userEmail || 'No Email'}</small>
                        </div>
                      </td>
                      <td className="col-product" data-label="Product">
                        <div className="product-cell">
                          <strong className="product-name-val">{o.productName || 'Unknown Product'}</strong>
                          {o.sku != null && (
                            <span className="order-sku-badge">
                              SKU: {o.sku}
                            </span>
                          )}
                          <small className="product-id-val">ID: {o.productId || 'N/A'}</small>
                        </div>
                      </td>
                      <td className="col-qty" data-label="Qty">
                        <span className="qty-val">{o.quantity || 0}</span>
                      </td>
                      <td className="col-price price" data-label="Price">
                        <span className="price-val">₹{o.totalAmount?.toFixed(2) || o.price || '0.00'}</span>
                      </td>
                      <td className="col-date" data-label="Date">
                        <span className="date-val">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </td>
                      <td className="col-status" data-label="Status">
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
                      <td className="col-details" data-label="Details">
                        <button className="details-btn" onClick={() => setSelectedOrder(o)} title="View Details">
                          <Eye size={16} /> <span className="details-btn-text">View Slip</span>
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
                    {selectedOrder.sku != null && (
                      <p>
                        <strong>SKU Number:</strong>{' '}
                        <span style={{ fontWeight: '700', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', border: '1px solid #fecaca' }}>
                          {selectedOrder.sku}
                        </span>
                      </p>
                    )}
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



