import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import AdminLayout from "./AdminLayout";
import "./AdminSettings.css";

const getSavedLocalSettings = () => {
  try {
    const raw = localStorage.getItem("etosm_store_settings");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => {
    const local = getSavedLocalSettings();
    return {
      companyName: local?.companyName || "ETOSM TECHNOLOGY",
      companyEmail: local?.companyEmail || "",
      invoicePrefix: local?.invoicePrefix || "INV",
      creditNotePrefix: local?.creditNotePrefix || "CN",
      expressShippingPrice: local?.expressShippingPrice ?? 190,
      standardShippingPrice: local?.standardShippingPrice ?? 80,
      bankName: local?.bankName || "INDIAN BANK",
      accountNumber: local?.accountNumber || "7776386819",
      ifscCode: local?.ifscCode || "IDIB000T038",
      upiId: local?.upiId || "etosm@indianbk",
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
      const local = getSavedLocalSettings() || {};
      if (data) {
        const merged = {
          companyName: data.companyName || local.companyName || "ETOSM TECHNOLOGY",
          companyEmail: (data.companyEmail !== undefined && data.companyEmail !== null && data.companyEmail !== "")
            ? data.companyEmail
            : (local.companyEmail || ""),
          invoicePrefix: data.invoicePrefix || local.invoicePrefix || "INV",
          creditNotePrefix: data.creditNotePrefix || local.creditNotePrefix || "CN",
          expressShippingPrice: data.expressShippingPrice ?? local.expressShippingPrice ?? 190,
          standardShippingPrice: data.standardShippingPrice ?? local.standardShippingPrice ?? 80,
          bankName: data.bankName || local.bankName || "INDIAN BANK",
          accountNumber: data.accountNumber || local.accountNumber || "7776386819",
          ifscCode: data.ifscCode || local.ifscCode || "IDIB000T038",
          upiId: data.upiId || local.upiId || "etosm@indianbk",
        };
        setSettings(merged);
        localStorage.setItem("etosm_store_settings", JSON.stringify(merged));
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
      companyName: settings.companyName || "ETOSM TECHNOLOGY",
      companyEmail: (settings.companyEmail || "").trim(),
      invoicePrefix: (settings.invoicePrefix || "INV").trim().toUpperCase(),
      creditNotePrefix: (settings.creditNotePrefix || "CN").trim().toUpperCase(),
      standardShippingPrice: parseFloat(settings.standardShippingPrice) || 0,
      expressShippingPrice: parseFloat(settings.expressShippingPrice) || 0,
      bankName: settings.bankName || "",
      accountNumber: settings.accountNumber || "",
      ifscCode: settings.ifscCode || "",
      upiId: settings.upiId || "",
    };

    // Immediately persist to localStorage
    localStorage.setItem("etosm_store_settings", JSON.stringify(payload));

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
            ...payload,
            ...savedData,
            companyEmail: savedData.companyEmail || payload.companyEmail,
          };
          setSettings(finalMerged);
          localStorage.setItem("etosm_store_settings", JSON.stringify(finalMerged));
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
        <h2>Settings</h2>
        {message && (
          <div className={`settings-msg ${message.includes("success") ? "success" : "error"}`}>
            {message}
          </div>
        )}

        <form className="settings-form" onSubmit={handleSave}>
          {/* 1. Company Profile & Email */}
          <div className="settings-section">
            <h3>Company Information</h3>
            
            <div className="form-group">
              <label>Company / Store Name</label>
              <input
                type="text"
                name="companyName"
                placeholder="e.g. ETOSM TECHNOLOGY"
                value={settings.companyName || ""}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Official Mail (Email Address)</label>
              <input
                type="email"
                name="companyEmail"
                placeholder="e.g. contact@etosm.in"
                value={settings.companyEmail || ""}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* 2. Document Numbering Configuration */}
          <div className="settings-section" style={{ marginTop: "24px" }}>
            <h3>Document Numbering Configuration</h3>
            
            <div className="form-group">
              <label>Invoice Number Prefix</label>
              <input
                type="text"
                name="invoicePrefix"
                placeholder="e.g. INV"
                value={settings.invoicePrefix || ""}
                onChange={handleChange}
                required
              />
              <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                Invoices will be formatted as: <strong>{(settings.invoicePrefix || "INV")}-{new Date().getFullYear()}-0001</strong>
              </small>
            </div>

            <div className="form-group">
              <label>Credit Note Number Prefix</label>
              <input
                type="text"
                name="creditNotePrefix"
                placeholder="e.g. CN"
                value={settings.creditNotePrefix || ""}
                onChange={handleChange}
                required
              />
              <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                Credit notes will be formatted as: <strong>{(settings.creditNotePrefix || "CN")}-{new Date().getFullYear()}-0001</strong>
              </small>
            </div>
          </div>

          {/* 3. Payment Settlement & Bank Details */}
          <div className="settings-section" style={{ marginTop: "24px" }}>
            <h3>Payment Settlement & Bank Info</h3>
            
            <div className="form-group">
              <label>Bank Name</label>
              <input
                type="text"
                name="bankName"
                placeholder="e.g. INDIAN BANK"
                value={settings.bankName || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Account Number</label>
              <input
                type="text"
                name="accountNumber"
                placeholder="e.g. 7776386819"
                value={settings.accountNumber || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>IFSC Code</label>
              <input
                type="text"
                name="ifscCode"
                placeholder="e.g. IDIB000T038"
                value={settings.ifscCode || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>UPI ID (VPA)</label>
              <input
                type="text"
                name="upiId"
                placeholder="e.g. etosm@indianbk"
                value={settings.upiId || ""}
                onChange={handleChange}
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

export default AdminSettings;
