import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, CheckCircle2, FileText, Hash, Database, Download, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
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
      invoiceSequence: local?.invoiceSequence || 1,
      invoicePadding: local?.invoicePadding || 4,
      creditNotePrefix: local?.creditNotePrefix || "CN",
      creditNoteSequence: local?.creditNoteSequence || 1,
      creditNotePadding: local?.creditNotePadding || 4,
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
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  // BUG-020: Database Backup & Recovery State
  const [backupsList, setBackupsList] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBackupsList();
  }, []);

  const fetchBackupsList = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setLoadingBackups(true);
      const res = await fetch(`${API_BASE_URL}/admin/backup/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackupsList(Array.isArray(data.backups) ? data.backups : []);
      }
    } catch (err) {
      console.error("Failed to fetch backups list:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleCreateBackup = async () => {
    const token = localStorage.getItem("token");
    setCreatingBackup(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { message: res.statusText || `HTTP ${res.status}` };
      }
      if (res.ok) {
        const fname = data.backup?.filename || data.filename || "etosm_backup.json";
        setMessage(`Success: Backup snapshot created successfully (${fname})!`);
        fetchBackupsList();
      } else {
        if (res.status === 404) {
          setMessage("Backend server restart required: Please restart your Node.js backend server terminal (Ctrl+C then npm start) to load the newly added backup routes.");
        } else {
          setMessage(`Error: ${data.message || "Failed to create backup"}`);
        }
      }
    } catch (err) {
      setMessage("Error: Network failure while creating backup. Ensure backend server is running.");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/download/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download backup file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  };

  const handleRestoreBackup = async (filename) => {
    const confirmInput = window.prompt(
      `CRITICAL DATABASE RECOVERY WARNING:\n\nRestoring backup "${filename}" will overwrite current Invoices, Credit Notes, Quotations, Orders, Products, and Settings with the backup snapshot data.\n\nType RESTORE in capital letters to confirm this action:`
    );
    if (confirmInput !== "RESTORE") {
      alert("Restore cancelled. Confirmation did not match 'RESTORE'.");
      return;
    }

    const token = localStorage.getItem("token");
    setRestoringBackup(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/backup/restore/${filename}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { message: res.statusText || `HTTP ${res.status}` };
      }
      if (res.ok) {
        alert(`Success: Database restored successfully from ${filename}!\n\nCollections restored: ${JSON.stringify(data.restoredCounts || {})}`);
        fetchSettings();
        fetchBackupsList();
      } else {
        if (res.status === 404) {
          alert("Backend server restart required: Please restart your Node.js backend server terminal to activate backup restore routes.");
        } else {
          alert("Restore failed: " + (data.message || "Unknown error"));
        }
      }
    } catch (err) {
      alert("Restore network error: " + err.message);
    } finally {
      setRestoringBackup(false);
    }
  };

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
          invoiceSequence: data.invoiceSequence !== undefined ? data.invoiceSequence : (local.invoiceSequence || 1),
          invoicePadding: data.invoicePadding !== undefined ? data.invoicePadding : (local.invoicePadding || 4),
          creditNotePrefix: data.creditNotePrefix || local.creditNotePrefix || "CN",
          creditNoteSequence: data.creditNoteSequence !== undefined ? data.creditNoteSequence : (local.creditNoteSequence || 1),
          creditNotePadding: data.creditNotePadding !== undefined ? data.creditNotePadding : (local.creditNotePadding || 4),
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

  const handleSyncSequences = async () => {
    const token = localStorage.getItem("token");
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings/sync-sequences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings((prev) => ({
          ...prev,
          invoiceSequence: data.settings.invoiceSequence,
          creditNoteSequence: data.settings.creditNoteSequence,
        }));
        setMessage("Sequences synchronized successfully with existing documents!");
      } else {
        setMessage(data.message || "Failed to sync sequences");
      }
    } catch (err) {
      setMessage("Error syncing sequence numbers with database");
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      companyName: settings.companyName || "ETOSM TECHNOLOGY",
      companyEmail: (settings.companyEmail || "").trim(),
      invoicePrefix: (settings.invoicePrefix || "INV").trim().toUpperCase(),
      invoiceSequence: Math.max(1, parseInt(settings.invoiceSequence, 10) || 1),
      invoicePadding: Math.max(1, Math.min(10, parseInt(settings.invoicePadding, 10) || 4)),
      creditNotePrefix: (settings.creditNotePrefix || "CN").trim().toUpperCase(),
      creditNoteSequence: Math.max(1, parseInt(settings.creditNoteSequence, 10) || 1),
      creditNotePadding: Math.max(1, Math.min(10, parseInt(settings.creditNotePadding, 10) || 4)),
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
        setMessage("Settings and sequence configuration saved successfully!");
      } else {
        setMessage("Failed to save settings to server.");
      }
    } catch (err) {
      console.error(err);
      setMessage("An error occurred while saving settings.");
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
            
            <div className="settings-grid-2">
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
          </div>

          {/* 2. Document Numbering Configuration (BUG-001 & BUG-002) */}
          <div className="settings-section" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, paddingBottom: 0, borderBottom: "none" }}>Document Numbering Configuration</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                  Configure invoice and credit note prefixes, starting sequence counters, and digit padding.
                </p>
              </div>
              <button
                type="button"
                className="seq-sync-btn"
                onClick={handleSyncSequences}
                disabled={syncing}
                title="Detect highest existing documents and sync sequence counter"
              >
                <RefreshCw size={14} className={syncing ? "spin" : ""} />
                <span>{syncing ? "Syncing..." : "Sync Sequences from DB"}</span>
              </button>
            </div>

            {/* BUG-001: Invoice Number Sequence Configuration */}
            <div className="seq-config-card">
              <h4>
                <FileText size={18} color="#e3000f" />
                <span>Invoice Number Sequence Configuration</span>
              </h4>

              <div className="seq-grid-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Prefix</label>
                  <input
                    type="text"
                    name="invoicePrefix"
                    placeholder="e.g. INV"
                    value={settings.invoicePrefix || ""}
                    onChange={handleChange}
                    required
                  />
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    e.g. INV, ETOSM
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Next Sequence Number</label>
                  <input
                    type="number"
                    name="invoiceSequence"
                    min="1"
                    placeholder="e.g. 1 or 1001"
                    value={settings.invoiceSequence || 1}
                    onChange={handleChange}
                    required
                  />
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    Starting / next number (e.g. 1, 1001)
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Digit Padding</label>
                  <select
                    name="invoicePadding"
                    value={settings.invoicePadding || 4}
                    onChange={handleChange}
                    className="seq-select-input"
                  >
                    <option value="3">3 Digits (e.g. 001)</option>
                    <option value="4">4 Digits (e.g. 0001)</option>
                    <option value="5">5 Digits (e.g. 00001)</option>
                    <option value="6">6 Digits (e.g. 000001)</option>
                  </select>
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    Leading zeros length
                  </small>
                </div>
              </div>

              <div className="seq-preview-box">
                <div className="seq-preview-left">
                  <span className="seq-preview-label">Live Next Invoice Format:</span>
                </div>
                <div className="seq-preview-badge">
                  {(settings.invoicePrefix || "INV").trim().toUpperCase()}-{new Date().getFullYear()}-{String(settings.invoiceSequence || 1).padStart(Number(settings.invoicePadding) || 4, "0")}
                </div>
              </div>
            </div>

            {/* BUG-002: Credit Note Number Sequence Configuration */}
            <div className="seq-config-card">
              <h4>
                <Hash size={18} color="#e3000f" />
                <span>Credit Note Number Sequence Configuration</span>
              </h4>

              <div className="seq-grid-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Prefix</label>
                  <input
                    type="text"
                    name="creditNotePrefix"
                    placeholder="e.g. CN"
                    value={settings.creditNotePrefix || ""}
                    onChange={handleChange}
                    required
                  />
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    e.g. CN, CRN
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Next Sequence Number</label>
                  <input
                    type="number"
                    name="creditNoteSequence"
                    min="1"
                    placeholder="e.g. 1 or 1001"
                    value={settings.creditNoteSequence || 1}
                    onChange={handleChange}
                    required
                  />
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    Starting / next number (e.g. 1, 1001)
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Digit Padding</label>
                  <select
                    name="creditNotePadding"
                    value={settings.creditNotePadding || 4}
                    onChange={handleChange}
                    className="seq-select-input"
                  >
                    <option value="3">3 Digits (e.g. 001)</option>
                    <option value="4">4 Digits (e.g. 0001)</option>
                    <option value="5">5 Digits (e.g. 00001)</option>
                    <option value="6">6 Digits (e.g. 000001)</option>
                  </select>
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    Leading zeros length
                  </small>
                </div>
              </div>

              <div className="seq-preview-box">
                <div className="seq-preview-left">
                  <span className="seq-preview-label">Live Next Credit Note Format:</span>
                </div>
                <div className="seq-preview-badge">
                  {(settings.creditNotePrefix || "CN").trim().toUpperCase()}-{new Date().getFullYear()}-{String(settings.creditNoteSequence || 1).padStart(Number(settings.creditNotePadding) || 4, "0")}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Payment Settlement & Bank Details */}
          <div className="settings-section" style={{ marginTop: "24px" }}>
            <h3>Payment Settlement & Bank Info</h3>
            
            <div className="settings-grid-2">
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
          </div>

          {/* 4. Data Protection & Automated Database Backups (BUG-020) */}
          <div className="settings-section" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Database size={18} color="#e3000f" />
                  Database Protection & Automated Recovery (BUG-020)
                </h3>
                <small style={{ color: "#64748b" }}>
                  Scheduled 24h automatic backups • 30-day retention • On-demand snapshots & point-in-time restore
                </small>
              </div>

              <button
                type="button"
                className="seq-sync-btn"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                style={{ background: "#059669" }}
              >
                <ShieldCheck size={14} />
                {creatingBackup ? "Creating Snapshot..." : "Create Backup Snapshot Now"}
              </button>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155" }}>
                <Clock size={16} color="#059669" />
                <span>
                  <strong>Schedule:</strong> Daily Automated Cron (Every 24h at 02:00 AM) • <strong>Retention:</strong> 30 Days Auto-Purge
                </span>
              </div>
              <span style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>
                Active & Protected
              </span>
            </div>

            {loadingBackups ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "13px" }}>
                Loading available backups...
              </div>
            ) : backupsList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "13px" }}>
                No backup snapshots found. Click "Create Backup Snapshot Now" above to generate your first backup.
              </div>
            ) : (
              <div className="backup-table-wrap" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                      <th style={{ padding: "8px 10px", borderRadius: "6px 0 0 6px" }}>Backup Filename</th>
                      <th style={{ padding: "8px 10px" }}>Timestamp</th>
                      <th style={{ padding: "8px 10px" }}>Size</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", borderRadius: "0 6px 6px 0" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupsList.map((b) => (
                      <tr key={b.filename} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: "600", color: "#0f172a" }}>
                          {b.filename}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>
                          {b.createdAt ? new Date(b.createdAt).toLocaleString("en-IN") : "N/A"}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#334155" }}>
                          {b.sizeKb ? `${b.sizeKb} KB` : "—"}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="seq-sync-btn"
                            style={{ padding: "4px 8px", fontSize: "11px", marginRight: "6px" }}
                            onClick={() => handleDownloadBackup(b.filename)}
                            title="Download backup archive (.json.gz)"
                          >
                            <Download size={12} /> Download
                          </button>
                          <button
                            type="button"
                            className="seq-sync-btn"
                            style={{ padding: "4px 8px", fontSize: "11px", background: "#dc2626" }}
                            onClick={() => handleRestoreBackup(b.filename)}
                            disabled={restoringBackup}
                            title="Restore database to this snapshot"
                          >
                            <AlertTriangle size={12} /> Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
