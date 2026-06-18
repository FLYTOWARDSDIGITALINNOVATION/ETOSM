import API_BASE_URL from '../apiConfig';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import './AuthPage.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to send reset link");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <button className="back-btn-auth" onClick={() => navigate("/auth")}>
        <FaArrowLeft /> Back to Login
      </button>

      <div className="auth-form-card" style={{ maxWidth: '400px', margin: '0 auto', marginTop: '50px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Reset Password</h2>
        <p className="form-subtitle" style={{ textAlign: 'center', marginBottom: '20px' }}>
          Enter your email to receive a password reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="error-text" style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>{error}</p>}
          {message && <p className="success-text" style={{ color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>{message}</p>}

          <button
            type="submit"
            className="submit-btn"
            style={{ marginTop: '20px' }}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
