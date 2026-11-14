import React, { useState, useEffect } from "react";
import API_BASE_URL from "../apiConfig";
import AdminLayout from "./AdminLayout";
import "./AdminSettings.css";

const getSavedShippingSettings = () => {
  try {
    const raw = localStorage.getItem("etosm_shipping_settings");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
};

const AdminShippingSettings = () => {
  const [settings, setSettings] = useState(() => {
    const local = getSavedShippingSettings();
    return {
      expressShippingPrice: local?.expressShippingPrice ?? 190,
      standardShippingPrice: local?.standardShippingPrice ?? 80,
    };
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
      const local = getSavedShippingSettings() || {};
      if (data) {
        const merged = {
          expressShippingPrice: data.expressShippingPrice ?? local.expressShippingPrice ?? 190,
          standardShippingPrice: data.standardShippingPrice ?? local.standardShippingPrice ?? 80,
        };
        setSettings(merged);
        localStorage.setItem("etosm_shipping_settings", JSON.stringify(merged));
      }
    } catch (err) {
      console.error("Failed to fetch shipping settings:", err);
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

    localStorage.setItem("etosm_shipping_settings", JSON.stringify(payload));

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
        const savedData = await res.json();
        if (savedData) {
          const finalMerged = {
            standardShippingPrice: savedData.standardShippingPrice ?? payload.standardShippingPrice,
            expressShippingPrice: savedData.expressShippingPrice ?? payload.expressShippingPrice,
          };
          setSettings(finalMerged);
          localStorage.setItem("etosm_shipping_settings", JSON.stringify(finalMerged));
        }
        setMessage("Settings saved successfully!");
      } else {
        setMessage("Saved locally, but server update failed.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Saved locally, but server connection error.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3500);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="settings-loading">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-settings-container">
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
    </AdminLayout>
  );
};

export default AdminShippingSettings;
