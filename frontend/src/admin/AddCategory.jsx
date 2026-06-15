import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AddCategory.css";

const ADMIN_EMAIL = "admin@gmail.com";

const AddCategory = () => {
  const [name, setName] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();

  // Fetch categories
  const fetchCategories = async () => {
    const res = await fetch(`${API_BASE_URL}/categories`);
    const data = await res.json();
    setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Add or remove subcategory tag locally
  const handleAddSubcategory = () => {
    const trimmed = newSubcategory.trim();
    if (trimmed && !subcategories.includes(trimmed)) {
      setSubcategories([...subcategories, trimmed]);
    }
    setNewSubcategory("");
  };

  const handleRemoveSubcategory = (subToRemove) => {
    setSubcategories(subcategories.filter((s) => s !== subToRemove));
  };

  // Add or Update category
  const handleSubmit = async () => {
    if (!name) return;
    const token = localStorage.getItem("token");

    if (editId) {
      await fetch(`${API_BASE_URL}/admin/category/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, subcategories, email: ADMIN_EMAIL }),
      });
      setEditId(null);
    } else {
      await fetch(`${API_BASE_URL}/admin/category`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, subcategories, email: ADMIN_EMAIL }),
      });
    }

    setName("");
    setSubcategories([]);
    setNewSubcategory("");
    fetchCategories();
  };

  // Edit
  const handleEdit = (cat) => {
    setName(cat.name);
    setEditId(cat._id);
    setSubcategories(cat.subcategories || []);
  };

  // Delete
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE_URL}/admin/category/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    fetchCategories();
  };

  return (
    <AdminLayout>
      <div className="add-category-container">
        <div className="form-header">
          <h1>Manage Categories</h1>
          <p>Add or edit product categories and their subcategories</p>
        </div>

        <div className="category-form-section">
          <div className="category-form">
            <label className="form-label">Category Name</label>
            <input
              type="text"
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="subcategory-section">
              <label className="form-label">Subcategories</label>
              <div className="subcategory-input-group">
                <input
                  type="text"
                  placeholder="Add a subcategory"
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubcategory();
                    }
                  }}
                />
                <button type="button" onClick={handleAddSubcategory} className="btn-add-sub">
                  Add
                </button>
              </div>
              <div className="subcategory-tags">
                {subcategories.map((sub, idx) => (
                  <span key={idx} className="sub-tag">
                    {sub}
                    <button type="button" onClick={() => handleRemoveSubcategory(sub)} className="btn-remove-sub">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} className="btn-add" style={{ marginTop: "10px" }}>
              <Plus size={18} /> {editId ? "Update" : "Add"} Category
            </button>
          </div>

          <div className="category-list-section">
            <h2>Existing Categories</h2>

            <ul className="category-list">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat._id} className="category-item" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "600", fontSize: "15px" }}>{cat.name}</span>

                      <div className="actions">
                        <button className="edit-btn" onClick={() => handleEdit(cat)}>
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(cat._id)}
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="category-sub-list-preview" style={{ display: "flex", flexWrap: "wrap", gap: "5px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                        {cat.subcategories.map((sub, idx) => (
                          <span key={idx} className="sub-badge" style={{ backgroundColor: "#e2e8f0", color: "#475569", fontSize: "11px", padding: "2px 8px", borderRadius: "12px", fontWeight: "500" }}>
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <p className="empty-message">No categories yet</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddCategory;



