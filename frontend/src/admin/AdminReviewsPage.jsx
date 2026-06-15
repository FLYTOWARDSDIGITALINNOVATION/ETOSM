import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  Star,
  Clock,
  ThumbsUp,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AdminReviewsPage.css";

const AdminReviewsPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user || !user.isAdmin) {
      navigate("/login");
      return;
    }
    fetchReviews();
  }, [token, navigate]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/google-reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setReviews(data);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/google-reviews/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setReviews(reviews.map(rev => rev._id === id ? { ...rev, isApproved: true } : rev));
      } else {
        alert("Failed to approve review.");
      }
    } catch (err) {
      console.error("Error approving review:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete/reject this review?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/google-reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setReviews(reviews.filter(rev => rev._id !== id));
      } else {
        alert("Failed to delete review.");
      }
    } catch (err) {
      console.error("Error deleting review:", err);
    }
  };

  const pendingCount = reviews.filter(r => !r.isApproved).length;
  const approvedCount = reviews.filter(r => r.isApproved).length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading reviews...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="dashboard-header">
        <div>
          <h1>Reviews Moderation</h1>
          <p className="subtitle">Approve or reject Google Customer Reviews displaying on the home page</p>
        </div>
        <button className="refresh-btn" onClick={fetchReviews}>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <MessageSquare />
          </div>
          <div className="stat-content">
            <h3>{reviews.length}</h3>
            <p>Total Reviews</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <h3>{pendingCount}</h3>
            <p>Pending Approval</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <ThumbsUp />
          </div>
          <div className="stat-content">
            <h3>{approvedCount}</h3>
            <p>Active on Home Page</p>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="recent-section">
        <h2>Moderation Queue</h2>
        {reviews.length === 0 ? (
          <div className="empty-reviews-state" style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>No reviews found in the queue.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reviewer</th>
                  <th>Designation</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => (
                  <tr key={rev._id}>
                    <td>{new Date(rev.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '700' }}>{rev.name}</td>
                    <td style={{ color: '#475569' }}>{rev.role}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '2px', color: '#ffb800' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < rev.rating ? "#ffb800" : "none"}
                            stroke={i < rev.rating ? "#ffb800" : "#cbd5e1"}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="comment-td" style={{ maxWidth: '300px', fontSize: '0.88rem', lineHeight: '1.4', color: '#1e293b' }}>
                      {rev.text}
                    </td>
                    <td>
                      <span className={`status ${rev.isApproved ? "Delivered" : "Ordered"}`}>
                        {rev.isApproved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell" style={{ display: 'flex', gap: '8px' }}>
                        {!rev.isApproved && (
                          <button
                            className="action-icon-btn approve"
                            onClick={() => handleApprove(rev._id)}
                            title="Approve Review"
                            style={{
                              background: '#dcfce7',
                              border: 'none',
                              color: '#156534',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: '0.2s'
                            }}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          className="action-icon-btn reject"
                          onClick={() => handleDelete(rev._id)}
                          title={rev.isApproved ? "Delete Review" : "Reject Review"}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            color: '#991b1b',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: '0.2s'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReviewsPage;
