import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import "./AdminSettings.css";

const AdminSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    expressShippingPrice: 9.99,
    standardShippingPrice: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`);
      const data = await res.json();
      if (data) {
        setSettings({
          expressShippingPrice: data.expressShippingPrice ?? 9.99,
          standardShippingPrice: data.standardShippingPrice ?? 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      standardShippingPrice: parseFloat(settings.standardShippingPrice) || 0,
      expressShippingPrice: parseFloat(settings.expressShippingPrice) || 0,
    };

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("Settings saved successfully!");
      } else {
        setMessage("Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) return <div className="settings-loading">Loading settings...</div>;

  return (
    <div className="admin-settings-container">
      <button 
        onClick={() => navigate(-1)} 
        style={{ background: "#fff1f2", color: "#e3000f", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", marginBottom: "20px" }}
      >
        ← Back
      </button>
      <h2>Store Settings</h2>
      {message && (
        <div className={`settings-msg ${message.includes("success") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h3>Shipping Configuration</h3>
          
          <div className="form-group">
            <label>Standard Shipping Price (₹)</label>
            <input
              type="number"
              step="0.01"
              name="standardShippingPrice"
              value={settings.standardShippingPrice}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Express Shipping Price (₹)</label>
            <input
              type="number"
              step="0.01"
              name="expressShippingPrice"
              value={settings.expressShippingPrice}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button type="submit" className="save-settings-btn" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
};

export default AdminSettings;
