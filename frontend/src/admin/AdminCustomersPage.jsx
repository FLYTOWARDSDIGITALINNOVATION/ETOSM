import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  ShoppingBag,
  IndianRupee,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Filter,
  ArrowUpDown,
  CheckCircle,
  Clock
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AdminCustomersPage.css";

const AdminCustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [registeredFilter, setRegisteredFilter] = useState("all");
  const [sortBy, setSortBy] = useState("spent-desc");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // AUTH CHECK
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user || !user.isAdmin) {
      navigate("/login");
    } else {
      fetchCustomers();
    }
  }, [navigate]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/admin/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch customers: ${res.status}`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error("Error loading customers:", err);
      alert(`Error loading customers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // FILTER & SORT LOGIC
  const filteredCustomers = customers
    .filter((c) => {
      const matchSearch =
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (registeredFilter === "registered") return c.isRegistered;
      if (registeredFilter === "guest") return !c.isRegistered;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "spent-desc") return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (sortBy === "spent-asc") return (a.totalSpent || 0) - (b.totalSpent || 0);
      if (sortBy === "orders-desc") return (b.orderCount || 0) - (a.orderCount || 0);
      if (sortBy === "orders-asc") return (a.orderCount || 0) - (b.orderCount || 0);
      if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "date-desc")
        return new Date(b.lastOrderDate || 0) - new Date(a.lastOrderDate || 0);
      return 0;
    });

  // STATS CALCULATIONS
  const totalCustomers = customers.length;
  const registeredCount = customers.filter((c) => c.isRegistered).length;
  const guestCount = totalCustomers - registeredCount;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  const getInitials = (name) => {
    if (!name) return "C";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <AdminLayout>
      <div className="customers-container">
        <div className="page-header">
          <div>
            <h1>Customers Management</h1>
            <p>Search, filter, and analyze customer profiles & purchasing history</p>
          </div>
          <button className="refresh-btn" onClick={fetchCustomers}>
            Refresh List
          </button>
        </div>

        {/* SUMMARY STATS GRID */}
        <div className="customer-stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon-wrapper">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <h3>{totalCustomers}</h3>
              <p>Total Customers</p>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon-wrapper">
              <UserCheck size={24} />
            </div>
            <div className="stat-info">
              <h3>{registeredCount}</h3>
              <p>Registered Users</p>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon-wrapper">
              <UserX size={24} />
            </div>
            <div className="stat-info">
              <h3>{guestCount}</h3>
              <p>Guest Buyers</p>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon-wrapper">
              <IndianRupee size={24} />
            </div>
            <div className="stat-info">
              <h3>₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</h3>
              <p>Customer Revenue</p>
            </div>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH & FILTERS */}
        <div className="controls-bar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by customer name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm("")}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-group">
            <div className="select-wrapper">
              <Filter size={16} className="select-icon" />
              <select
                value={registeredFilter}
                onChange={(e) => setRegisteredFilter(e.target.value)}
              >
                <option value="all">All Account Types</option>
                <option value="registered">Registered Accounts</option>
                <option value="guest">Guest Buyers</option>
              </select>
            </div>

            <div className="select-wrapper">
              <ArrowUpDown size={16} className="select-icon" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="spent-desc">Highest Total Spent</option>
                <option value="spent-asc">Lowest Total Spent</option>
                <option value="orders-desc">Most Orders</option>
                <option value="orders-asc">Fewest Orders</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="date-desc">Most Recent Activity</option>
              </select>
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="loading-state">
            <Clock size={36} className="spin-icon" />
            <p>Loading customers data...</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredCustomers.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <h3>No Customers Found</h3>
            <p>No customer profiles match your search criteria.</p>
          </div>
        )}

        {/* CUSTOMERS DATA TABLE */}
        {!loading && filteredCustomers.length > 0 && (
          <div className="table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact Info</th>
                  <th>Account Type</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.email || c._id}>
                    <td>
                      <div className="customer-name-cell">
                        <div className={`avatar ${c.isRegistered ? "reg" : "guest"}`}>
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <strong>{c.name || "Customer"}</strong>
                          <div className="sub-text">ID: {String(c._id).slice(-8)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <div>
                          <Mail size={13} style={{ display: 'inline', marginRight: '5px' }} />
                          {c.email || "No Email"}
                        </div>
                        {c.phone && c.phone !== "N/A" && (
                          <div className="sub-text">
                            <Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {c.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.isRegistered ? "registered" : "guest"}`}>
                        {c.isRegistered ? (
                          <>
                            <UserCheck size={12} /> Registered
                          </>
                        ) : (
                          <>
                            <UserX size={12} /> Guest
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="orders-pill">
                        <ShoppingBag size={14} />
                        <span>{c.orderCount} order{c.orderCount !== 1 ? "s" : ""}</span>
                      </div>
                    </td>
                    <td className="price-cell">
                      ₹{(c.totalSpent || 0).toFixed(2)}
                    </td>
                    <td>
                      {c.lastOrderDate ? (
                        new Date(c.lastOrderDate).toLocaleDateString()
                      ) : (
                        <span style={{ color: "#94a3b8" }}>No activity</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="action-btn-view"
                        onClick={() => setSelectedCustomer(c)}
                        title="View Customer Profile"
                      >
                        <Eye size={16} /> View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CUSTOMER DETAILS MODAL */}
        {selectedCustomer && (
          <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
            <div className="customer-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="customer-modal-title">
                  <div className={`avatar modal-avatar ${selectedCustomer.isRegistered ? "reg" : "guest"}`}>
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div>
                    <h2>{selectedCustomer.name}</h2>
                    <span className={`badge ${selectedCustomer.isRegistered ? "registered" : "guest"}`}>
                      {selectedCustomer.isRegistered ? "Registered Customer" : "Guest Customer"}
                    </span>
                  </div>
                </div>
                <button className="close-btn" onClick={() => setSelectedCustomer(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                {/* CONTACT & STATS ROW */}
                <div className="customer-info-grid">
                  <div className="info-box">
                    <Mail size={16} className="info-icon" />
                    <div>
                      <label>Email Address</label>
                      <p>{selectedCustomer.email || "N/A"}</p>
                    </div>
                  </div>

                  <div className="info-box">
                    <Phone size={16} className="info-icon" />
                    <div>
                      <label>Phone Number</label>
                      <p>{selectedCustomer.phone || "N/A"}</p>
                    </div>
                  </div>

                  <div className="info-box">
                    <ShoppingBag size={16} className="info-icon" />
                    <div>
                      <label>Total Orders</label>
                      <p>{selectedCustomer.orderCount} placed</p>
                    </div>
                  </div>

                  <div className="info-box">
                    <IndianRupee size={16} className="info-icon" />
                    <div>
                      <label>Total Spent</label>
                      <p className="highlight-price">₹{(selectedCustomer.totalSpent || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* ADDRESSES SECTION */}
                {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                  <div className="modal-section">
                    <h3><MapPin size={18} style={{ display: 'inline', marginRight: '6px' }} /> Shipping Addresses</h3>
                    <div className="addresses-list">
                      {selectedCustomer.addresses.map((addr, idx) => (
                        <div key={idx} className="address-card">
                          {typeof addr === 'string' ? (
                            <p>{addr}</p>
                          ) : (
                            <>
                              <strong>{addr.label || addr.fullName || `Address ${idx + 1}`}</strong>
                              <p>{addr.address || addr.street || JSON.stringify(addr)}</p>
                              {addr.phone && <small>Phone: {addr.phone}</small>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PAST ORDERS SECTION */}
                <div className="modal-section">
                  <h3><ShoppingBag size={18} style={{ display: 'inline', marginRight: '6px' }} /> Order History ({selectedCustomer.orders?.length || 0})</h3>
                  {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) ? (
                    <p className="no-data">No order history found for this customer.</p>
                  ) : (
                    <div className="orders-mini-table-wrapper">
                      <table className="orders-mini-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomer.orders.map((ord) => (
                            <tr key={ord._id}>
                              <td className="order-id">#{ord._id?.slice(-6) || 'N/A'}</td>
                              <td>
                                <div>{ord.productName || "Product"}</div>
                                {ord.sku != null && (
                                  <span style={{ display: 'inline-block', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', border: '1px solid #fecaca', marginTop: '2px' }}>
                                    SKU: {ord.sku}
                                  </span>
                                )}
                              </td>
                              <td>{ord.quantity || 1}</td>
                              <td className="price">₹{(ord.totalAmount || ord.price || 0).toFixed(2)}</td>
                              <td>{ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'N/A'}</td>
                              <td>
                                <span className={`status-badge ${(ord.status || 'ordered').toLowerCase()}`}>
                                  {ord.status || "Ordered"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCustomersPage;
