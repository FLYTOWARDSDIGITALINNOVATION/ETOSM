import API_BASE_URL from "../apiConfig";
import React, { useEffect, useState, useMemo } from "react";
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
  Clock,
  Plus,
  Edit3,
  Trash2,
  Building,
  FileSpreadsheet,
  Receipt,
  FileCheck,
  MessageCircle,
  ExternalLink,
  Check,
  AlertCircle
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AdminCustomersPage.css";

const AdminCustomersPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all", "custom", "registered", "guest"
  const [sortBy, setSortBy] = useState("spent-desc");

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState(null); // View modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false); // Add/Edit modal
  const [editingCustomer, setEditingCustomer] = useState(null); // Null for add, object for edit

  // Form State for Add / Edit Customer
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
    gstin: "",
    notes: ""
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth Verification
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
    } else {
      fetchCustomers();
    }
  }, [navigate]);

  // Fetch Customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`Failed to load customers (${res.status})`);
      const data = await res.json();
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (err) {
      console.error("Error loading customers:", err);
      showToast("Error loading customers data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      company: "",
      address: "",
      city: "",
      state: "Tamil Nadu",
      pincode: "",
      gstin: "",
      notes: ""
    });
    setCustomerModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (c) => {
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      company: c.company || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "Tamil Nadu",
      pincode: c.pincode || "",
      gstin: c.gstin || "",
      notes: c.notes || ""
    });
    setCustomerModalOpen(true);
  };

  // Save Customer (Create or Update)
  const handleSaveCustomer = async (e) => {
    e.preventDefault();

    if (!customerForm.name.trim()) {
      showToast("Please enter customer name", "error");
      return;
    }
    if (!customerForm.phone.trim()) {
      showToast("Please enter mobile number", "error");
      return;
    }

    setFormSubmitting(true);
    try {
      const url = editingCustomer
        ? `${API_BASE_URL}/admin/customers/${editingCustomer._id}`
        : `${API_BASE_URL}/admin/customers`;
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(customerForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save customer");

      showToast(
        editingCustomer
          ? `Customer "${customerForm.name}" updated successfully!`
          : `Customer "${customerForm.name}" added to directory!`
      );
      setCustomerModalOpen(false);
      fetchCustomers();
    } catch (err) {
      console.error("Save customer error:", err);
      showToast(err.message || "Failed to save customer", "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (c) => {
    if (!window.confirm(`Are you sure you want to remove customer "${c.name}" from directory?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/customers/${c._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        showToast(`Customer ${c.name} deleted successfully`);
        fetchCustomers();
        if (selectedCustomer && selectedCustomer._id === c._id) {
          setSelectedCustomer(null);
        }
      } else {
        throw new Error("Failed to delete customer");
      }
    } catch (err) {
      console.error("Delete customer error:", err);
      showToast(err.message || "Failed to delete customer", "error");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      showToast("No customers available to export", "error");
      return;
    }

    const headers = [
      "Customer Name",
      "Company",
      "Mobile Number",
      "Email Address",
      "Address",
      "City",
      "State",
      "Pincode",
      "GSTIN",
      "Total Orders",
      "Total Spent (INR)",
      "Account Type",
      "Notes"
    ];

    const csvRows = [headers.join(",")];
    filteredCustomers.forEach((c) => {
      const row = [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${(c.company || "").replace(/"/g, '""')}"`,
        `"${c.phone || ""}"`,
        `"${c.email || ""}"`,
        `"${(c.address || "").replace(/"/g, '""')}"`,
        `"${c.city || ""}"`,
        `"${c.state || ""}"`,
        `"${c.pincode || ""}"`,
        `"${c.gstin || ""}"`,
        c.orderCount || 0,
        Number(c.totalSpent || 0).toFixed(2),
        c.isCustom ? "Saved Client" : c.isRegistered ? "Registered" : "Guest",
        `"${(c.notes || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ETOSM_Customers_Directory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredCustomers.length} customer records to CSV`);
  };

  // Filter & Sort
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
          (c.name || "").toLowerCase().includes(q) ||
          (c.phone || "").includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.company || "").toLowerCase().includes(q) ||
          (c.address || "").toLowerCase().includes(q) ||
          (c.city || "").toLowerCase().includes(q);

        if (!matchSearch) return false;

        if (typeFilter === "custom") return c.isCustom;
        if (typeFilter === "registered") return c.isRegistered;
        if (typeFilter === "guest") return !c.isRegistered && !c.isCustom;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "spent-desc") return (b.totalSpent || 0) - (a.totalSpent || 0);
        if (sortBy === "spent-asc") return (a.totalSpent || 0) - (b.totalSpent || 0);
        if (sortBy === "orders-desc") return (b.orderCount || 0) - (a.orderCount || 0);
        if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return 0;
      });
  }, [customers, searchTerm, typeFilter, sortBy]);

  // Overall Stats
  const stats = useMemo(() => {
    const totalCount = customers.length;
    const directSaved = customers.filter((c) => c.isCustom).length;
    const registered = customers.filter((c) => c.isRegistered).length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const avgValue = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
    return { totalCount, directSaved, registered, totalRevenue: Math.round(totalRevenue), avgValue };
  }, [customers]);

  const getInitials = (name) => {
    if (!name) return "C";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <AdminLayout>
      <div className="admin-customers-page">
        {/* Toast */}
        {toast && (
          <div className={`customers-toast ${toast.type}`}>
            {toast.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="customers-page-header">
          <div className="header-title-box">
            <span className="customers-eyebrow">ACCOUNTS & DIRECTORY</span>
            <h1>6. Customer Management</h1>
            <p>
              Add, view, and manage customer details. Store customer name, mobile number, and address. Select saved customers while creating invoices and quotations.
            </p>
          </div>

          <div className="header-actions-box">
            <button className="c-btn primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              <span>Add Customer</span>
            </button>
            <button className="c-btn secondary" onClick={handleExportCSV}>
              <FileSpreadsheet size={16} />
              <span>Export CSV</span>
            </button>
            <button className="c-btn icon-only" onClick={fetchCustomers} title="Refresh List">
              <Clock size={16} />
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="customer-kpis-grid">
          <div className="kpi-card">
            <div className="kpi-icon-box primary">
              <Users size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">TOTAL CUSTOMERS</span>
              <h2 className="kpi-val">{stats.totalCount}</h2>
              <span className="kpi-sub">Across directory & orders</span>
            </div>
          </div>

          <div className="kpi-card highlight">
            <div className="kpi-icon-box success">
              <UserCheck size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">DIRECT / SAVED CLIENTS</span>
              <h2 className="kpi-val success">{stats.directSaved}</h2>
              <span className="kpi-sub">Available for invoice & quote auto-fill</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box info">
              <IndianRupee size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">TOTAL REVENUE</span>
              <h2 className="kpi-val">₹{stats.totalRevenue.toLocaleString("en-IN")}</h2>
              <span className="kpi-sub">Cumulative order value</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box warning">
              <ShoppingBag size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">AVG CUSTOMER VALUE</span>
              <h2 className="kpi-val">₹{stats.avgValue.toLocaleString("en-IN")}</h2>
              <span className="kpi-sub">Lifetime customer average</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="customers-filter-card">
          <div className="filter-top-row">
            <div className="search-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by customer name, mobile number, address, company, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-btn" onClick={() => setSearchTerm("")}>
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="type-tabs">
              <button
                className={`type-tab ${typeFilter === "all" ? "active" : ""}`}
                onClick={() => setTypeFilter("all")}
              >
                All ({stats.totalCount})
              </button>
              <button
                className={`type-tab ${typeFilter === "custom" ? "active" : ""}`}
                onClick={() => setTypeFilter("custom")}
              >
                Saved Clients ({stats.directSaved})
              </button>
              <button
                className={`type-tab ${typeFilter === "registered" ? "active" : ""}`}
                onClick={() => setTypeFilter("registered")}
              >
                Registered ({stats.registered})
              </button>
              <button
                className={`type-tab ${typeFilter === "guest" ? "active" : ""}`}
                onClick={() => setTypeFilter("guest")}
              >
                Guest Orders
              </button>
            </div>
          </div>

          <div className="filter-bottom-row">
            <div className="sort-group">
              <label>Sort Directory By:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name-asc">Customer Name (A-Z)</option>
                <option value="spent-desc">Highest Total Spent</option>
                <option value="spent-asc">Lowest Total Spent</option>
                <option value="orders-desc">Most Orders</option>
                <option value="newest">Recently Added First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="customers-table-container">
          {loading ? (
            <div className="customers-loading">
              <div className="c-spinner"></div>
              <p>Loading customer accounts & addresses...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="customers-empty">
              <Users size={52} color="#94a3b8" />
              <h3>No Customers Found</h3>
              <p>
                {searchTerm || typeFilter !== "all"
                  ? "No customer matches your search criteria."
                  : "Start building your customer directory by adding your first client."}
              </p>
              <button className="c-btn primary" onClick={handleOpenAddModal}>
                <Plus size={16} />
                <span>Add New Customer</span>
              </button>
            </div>
          ) : (
            <div className="customers-table-scroll">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>CUSTOMER & COMPANY</th>
                    <th>MOBILE NUMBER</th>
                    <th>FULL ADDRESS & LOCATION</th>
                    <th>EMAIL & GSTIN</th>
                    <th style={{ textAlign: "right" }}>PURCHASES</th>
                    <th>ACCOUNT TYPE</th>
                    <th style={{ textAlign: "center" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => {
                    const cleanPhone = (c.phone || "").replace(/\D/g, "");
                    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

                    return (
                      <tr key={c._id || c.email}>
                        {/* Name & Company */}
                        <td>
                          <div className="customer-name-block">
                            <div className={`cust-avatar ${c.isCustom ? "custom-client" : c.isRegistered ? "registered-client" : "guest-client"}`}>
                              {getInitials(c.name)}
                            </div>
                            <div className="cust-text">
                              <strong className="name-bold">{c.name}</strong>
                              {c.company && (
                                <span className="company-text">
                                  <Building size={12} /> {c.company}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Mobile Number */}
                        <td>
                          <div className="mobile-cell">
                            {c.phone && c.phone !== "N/A" ? (
                              <>
                                <a href={`tel:${c.phone}`} className="phone-link">
                                  <Phone size={13} /> {c.phone}
                                </a>
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/${waPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="whatsapp-quick-btn"
                                    title="Chat on WhatsApp"
                                  >
                                    <MessageCircle size={14} />
                                  </a>
                                )}
                              </>
                            ) : (
                              <span className="empty-text">No mobile</span>
                            )}
                          </div>
                        </td>

                        {/* Address */}
                        <td>
                          <div className="address-cell">
                            {c.address ? (
                              <span className="address-text" title={c.address}>
                                <MapPin size={13} className="pin-icon" />
                                {c.address}
                                {c.city && `, ${c.city}`}
                                {c.pincode && ` - ${c.pincode}`}
                              </span>
                            ) : (
                              <span className="empty-text">No address stored</span>
                            )}
                          </div>
                        </td>

                        {/* Email & GSTIN */}
                        <td>
                          <div className="meta-email-cell">
                            {c.email ? (
                              <a href={`mailto:${c.email}`} className="email-link">
                                <Mail size={12} /> {c.email}
                              </a>
                            ) : (
                              <span className="empty-text">No email</span>
                            )}
                            {c.gstin && (
                              <span className="gstin-badge">GST: {c.gstin}</span>
                            )}
                          </div>
                        </td>

                        {/* Purchases */}
                        <td style={{ textAlign: "right" }}>
                          <div className="purchases-cell">
                            <strong className="spent-text">
                              ₹{Number(c.totalSpent || 0).toLocaleString("en-IN")}
                            </strong>
                            <span className="order-count-pill">
                              {c.orderCount || 0} order{c.orderCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td>
                          <span className={`type-badge ${c.isCustom ? "saved" : c.isRegistered ? "registered" : "guest"}`}>
                            {c.isCustom ? "Saved Client" : c.isRegistered ? "Registered" : "Guest"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="table-actions-row">
                            {/* Create Invoice Shortcut */}
                            <button
                              className="action-pill-btn invoice"
                              onClick={() => navigate("/admin/create-invoice")}
                              title="Create Invoice for this Customer"
                            >
                              <Receipt size={13} />
                              <span>Invoice</span>
                            </button>

                            {/* Create Quotation Shortcut */}
                            <button
                              className="action-pill-btn quote"
                              onClick={() => navigate("/admin/quotations")}
                              title="Create Quotation for this Customer"
                            >
                              <FileCheck size={13} />
                              <span>Quote</span>
                            </button>

                            {/* Edit Customer */}
                            <button
                              className="action-icon edit"
                              onClick={() => handleOpenEditModal(c)}
                              title="Edit Customer Details"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* View Profile */}
                            <button
                              className="action-icon view"
                              onClick={() => setSelectedCustomer(c)}
                              title="View Customer Profile"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Delete */}
                            <button
                              className="action-icon delete"
                              onClick={() => handleDeleteCustomer(c)}
                              title="Delete Customer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: ADD OR EDIT CUSTOMER MODAL */}
        {customerModalOpen && (
          <div className="modal-backdrop" onClick={() => setCustomerModalOpen(false)}>
            <div className="customer-form-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">CUSTOMER DIRECTORY</span>
                  <h2>{editingCustomer ? "Edit Customer Details" : "Add New Customer"}</h2>
                  <p className="modal-subtitle">
                    Store customer name, mobile number, and address for automatic selection in invoices & quotes.
                  </p>
                </div>
                <button className="modal-close" onClick={() => setCustomerModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="customer-modal-form">
                <div className="form-grid-2">
                  <div className="c-form-group">
                    <label>Customer Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Anandha Kumar"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="c-form-group">
                    <label>Mobile Number * (Phone)</label>
                    <input
                      type="tel"
                      placeholder="+91 88070 80216"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="c-form-group">
                    <label>Company / Organization Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Power Systems Ltd"
                      value={customerForm.company}
                      onChange={(e) => setCustomerForm({ ...customerForm, company: e.target.value })}
                    />
                  </div>

                  <div className="c-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. anand@apexpower.in"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="c-form-group">
                  <label>Full Street Address *</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 2/167, Merkukadu, Ramapuram, Tiruchengodu"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-3">
                  <div className="c-form-group">
                    <label>City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Namakkal"
                      value={customerForm.city}
                      onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                    />
                  </div>

                  <div className="c-form-group">
                    <label>State</label>
                    <input
                      type="text"
                      placeholder="Tamil Nadu"
                      value={customerForm.state}
                      onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                    />
                  </div>

                  <div className="c-form-group">
                    <label>Pincode</label>
                    <input
                      type="text"
                      placeholder="637202"
                      value={customerForm.pincode}
                      onChange={(e) => setCustomerForm({ ...customerForm, pincode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="c-form-group">
                    <label>GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="33AAAAA0000A1Z5"
                      value={customerForm.gstin}
                      onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value })}
                    />
                  </div>

                  <div className="c-form-group">
                    <label>Notes & Requirements</label>
                    <input
                      type="text"
                      placeholder="e.g. EV Battery pack client..."
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-form-actions">
                  <button
                    type="button"
                    className="c-btn secondary"
                    onClick={() => setCustomerModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="c-btn primary" disabled={formSubmitting}>
                    {formSubmitting
                      ? "Saving Customer..."
                      : editingCustomer
                      ? "Update Customer Details"
                      : "Save Customer to Directory"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CUSTOMER PROFILE & ORDER HISTORY */}
        {selectedCustomer && (
          <div className="modal-backdrop" onClick={() => setSelectedCustomer(null)}>
            <div className="customer-profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-top-header">
                <div className="profile-user-info">
                  <div className={`cust-avatar large ${selectedCustomer.isCustom ? "custom-client" : selectedCustomer.isRegistered ? "registered-client" : "guest-client"}`}>
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div>
                    <h2>{selectedCustomer.name}</h2>
                    <span className="profile-type">
                      {selectedCustomer.isCustom ? "Direct Saved Client" : selectedCustomer.isRegistered ? "Registered Website Account" : "Guest Buyer"}
                    </span>
                  </div>
                </div>
                <button className="modal-close" onClick={() => setSelectedCustomer(null)}>
                  <X size={20} />
                </button>
              </div>

              {/* Contact Information Grid */}
              <div className="profile-details-strip">
                <div className="detail-item">
                  <Phone size={16} />
                  <div>
                    <label>Mobile Number</label>
                    <strong>{selectedCustomer.phone || "N/A"}</strong>
                  </div>
                </div>
                <div className="detail-item">
                  <Mail size={16} />
                  <div>
                    <label>Email Address</label>
                    <strong>{selectedCustomer.email || "N/A"}</strong>
                  </div>
                </div>
                <div className="detail-item">
                  <Building size={16} />
                  <div>
                    <label>Company</label>
                    <strong>{selectedCustomer.company || "Individual"}</strong>
                  </div>
                </div>
                <div className="detail-item">
                  <MapPin size={16} />
                  <div>
                    <label>Full Address</label>
                    <strong>{selectedCustomer.address || "No address stored"}</strong>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="profile-actions-strip">
                <button
                  className="c-btn primary small"
                  onClick={() => {
                    setSelectedCustomer(null);
                    navigate("/admin/create-invoice");
                  }}
                >
                  <Receipt size={14} />
                  <span>Create Invoice</span>
                </button>
                <button
                  className="c-btn secondary small"
                  onClick={() => {
                    setSelectedCustomer(null);
                    navigate("/admin/quotations");
                  }}
                >
                  <FileCheck size={14} />
                  <span>Create Quotation</span>
                </button>
                <button
                  className="c-btn secondary small"
                  onClick={() => {
                    const c = selectedCustomer;
                    setSelectedCustomer(null);
                    handleOpenEditModal(c);
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* Order History */}
              <div className="profile-orders-section">
                <h3>Order & Transaction History ({Array.isArray(selectedCustomer.orders) ? selectedCustomer.orders.length : 0})</h3>
                {Array.isArray(selectedCustomer.orders) && selectedCustomer.orders.length > 0 ? (
                  <div className="profile-orders-table-wrap">
                    <table className="profile-orders-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice / Order</th>
                          <th>Product Name</th>
                          <th>Qty</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCustomer.orders.map((ord, i) => (
                          <tr key={i}>
                            <td>{ord.createdAt ? new Date(ord.createdAt).toLocaleDateString("en-IN") : "N/A"}</td>
                            <td><strong>{ord.invoiceNumber || String(ord._id).slice(-8)}</strong></td>
                            <td>{ord.productName || "Product Item"}</td>
                            <td>{ord.quantity || 1}</td>
                            <td style={{ textAlign: "right" }}>₹{Number(ord.totalAmount || ord.price || 0).toLocaleString("en-IN")}</td>
                            <td><span className="order-status-badge">{ord.status || "Completed"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-orders-text">No direct web orders recorded yet for this customer profile.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCustomersPage;