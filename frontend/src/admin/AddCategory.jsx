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
        body: JSON.stringify({ name, email: ADMIN_EMAIL }),
      });
      setEditId(null);
    } else {
      await fetch(`${API_BASE_URL}/admin/category`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, email: ADMIN_EMAIL }),
      });
    }

    setName("");
    fetchCategories();
  };

  // Edit
  const handleEdit = (cat) => {
    setName(cat.name);
    setEditId(cat._id);
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
          <p>Add or edit product categories</p>
        </div>

        <div className="category-form-section">
          <div className="category-form">
            <input
              type="text"
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={handleSubmit} className="btn-add">
              <Plus size={18} /> {editId ? "Update" : "Add"} Category
            </button>
          </div>

          <div className="category-list-section">
            <h2>Existing Categories</h2>

            <ul className="category-list">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat._id} className="category-item">
                    <span>{cat.name}</span>

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



