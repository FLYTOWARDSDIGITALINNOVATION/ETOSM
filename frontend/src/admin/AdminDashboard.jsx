import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  Percent,
  TrendingUp,
  Users,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  FileCheck,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AdminDashboard.css";

const CACHE_KEY = "admin_dashboard_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authCheckDone = useRef(false);

  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    discounts: 0,
    categories: 0,
  });

  const getInitialData = () => {
    try {
      const c = localStorage.getItem(CACHE_KEY);
      if (!c) return null;
      const { data, timestamp } = JSON.parse(c);
      if (Date.now() - timestamp > CACHE_DURATION) return null;
      return data;
    } catch(e) { return null; }
  };
  const initDash = getInitialData();
  const [loading, setLoading] = useState(() => !initDash);
  const [recentOrders, setRecentOrders] = useState(() => initDash?.recentOrders || []);

  useEffect(() => {
    // Skip auth check if already done
    if (authCheckDone.current) return;
    authCheckDone.current = true;

    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
      return;
    }
    
    fetchStats();
  }, [navigate, token]);

  const getCachedStats = () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  };

  const setCachedStats = (data) => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  };

  const fetchStats = async (isManual = false) => {
    try {
      if (isManual || !getInitialData()) setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setCachedStats(data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Welcome back! Here's your store overview</p>
        </div>
        <button className="refresh-btn" onClick={() => fetchStats(true)}>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <Package />
          </div>
          <div className="stat-content">
            <h3>{stats.products}</h3>
            <p>Total Products</p>
          </div>
          <TrendingUp className="trend-icon" />
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <ShoppingBag />
          </div>
          <div className="stat-content">
            <h3>{stats.orders}</h3>
            <p>Total Orders</p>
          </div>
          <TrendingUp className="trend-icon" />
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Percent />
          </div>
          <div className="stat-content">
            <h3>{stats.discounts}</h3>
            <p>Active Discounts</p>
          </div>
          <TrendingUp className="trend-icon" />
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <Package />
          </div>
          <div className="stat-content">
            <h3>{stats.categories}</h3>
            <p>Categories</p>
          </div>
          <TrendingUp className="trend-icon" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button
            className="action-btn"
            onClick={() => navigate("/admin/add-product")}
          >
            <Package size={24} />
            <span>Add Product</span>
          </button>
          <button
            className="action-btn"
            onClick={() => navigate("/admin/add-category")}
          >
            <Package size={24} />
            <span>Add Category</span>
          </button>
          <button
            className="action-btn"
            onClick={() => navigate("/admin/products")}
          >
            <Package size={24} />
            <span>Product Management</span>
          </button>
          <button
            className="action-btn"
            onClick={() => navigate("/admin/create-invoice")}
          >
            <FileText size={24} />
            <span>Create Invoice</span>
          </button>
          <button
            className="action-btn"
            onClick={() => navigate("/admin/paid-invoices")}
          >
            <CheckCircle2 size={24} />
            <span>Paid Invoices</span>
          </button>
          <button
            className="action-btn"
            onClick={() => navigate("/admin/pending-invoices")}
          >
            <Clock size={24} />
            <span>Pending Invoices</span>
          </button>
          <button
            className="action-btn"
            onClick={() => navigate("/admin/quotations")}
          >
            <FileCheck size={24} />
            <span>Quotations</span>
          </button>
          <button
            className="action-btn"
            onClick={() => navigate("/admin/orders")}
          >
            <ShoppingBag size={24} />
            <span>View Orders</span>
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="recent-section">
          <h2>Recent Orders</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "20%", textAlign: "left" }}>Order ID</th>
                  <th style={{ width: "30%", textAlign: "left" }}>Customer</th>
                  <th style={{ width: "18%", textAlign: "left" }}>Total</th>
                  <th style={{ width: "16%", textAlign: "left" }}>Status</th>
                  <th style={{ width: "16%", textAlign: "left" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="order-id" style={{ textAlign: "left" }}>#{order._id?.slice(-8)}</td>
                    <td style={{ textAlign: "left" }}>{order.userName || "Customer"}</td>
                    <td className="price" style={{ textAlign: "left" }}>₹{order.totalAmount?.toFixed(2) || "0.00"}</td>
                    <td style={{ textAlign: "left" }}>
                      <span className={`status ${order.status || "pending"}`}>
                        {order.status || "Pending"}
                      </span>
                    </td>
                    <td style={{ textAlign: "left" }}>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-IN")
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;



