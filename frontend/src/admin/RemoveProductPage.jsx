import API_BASE_URL from '../apiConfig';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ArrowLeft, Search, Edit } from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./RemoveProductPage.css";

const RemoveProductPage = () => {

    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        if (!user || !user.isAdmin) {
            navigate("/login");
            return;
        }
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/admin/products-stats`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json();
            setProducts(data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch products", err);
            setLoading(false);
        }
    };

    const handleDelete = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;

        const token = localStorage.getItem("token");

        try {
            const res = await fetch(`${API_BASE_URL}/admin/product/${productId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                localStorage.removeItem("admin_dashboard_cache");
                setProducts(products.filter((p) => p._id !== productId));
                alert("Product deleted successfully");
            } else {
                alert("Failed to delete product");
            }
        } catch (err) {
            console.error("Error deleting product:", err);
        }
    };

    const handleToggleVisibility = async (productId, currentVisibility) => {
        const token = localStorage.getItem("token");
        const newVisibility = !(currentVisibility !== false);

        try {
            const res = await fetch(`${API_BASE_URL}/admin/product/${productId}/toggle-visibility`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ isVisible: newVisibility })
            });

            if (res.ok) {
                setProducts(prev =>
                    prev.map(p => p._id === productId ? { ...p, isVisible: newVisibility } : p)
                );
            } else {
                alert("Failed to update visibility");
            }
        } catch (err) {
            console.error("Error toggling product visibility:", err);
        }
    };

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="manage-products-container">
                <div className="page-header">
                    <h1>Manage Products</h1>
                    <p>Toggle Home Page visibility (ON/OFF), edit, discount, view stats, or delete products</p>
                </div>

                <div className="search-section">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {loading ? (
                    <div className="loading">Loading products...</div>
                ) : (
                    <div className="products-grid">
                        {filteredProducts.length === 0 ? (
                            <p className="no-results">No products found.</p>
                        ) : (
                            filteredProducts.map((product) => (
                                <div key={product._id} className={`product-card ${product.isVisible === false ? 'visibility-off' : ''}`}>
                                    <div className="product-image">
                                        <img
                                            src={`${API_BASE_URL}${product.image}`}
                                            alt={product.name}
                                            onError={(e) => (e.target.src = "https://via.placeholder.com/100")}
                                        />
                                    </div>
                                    <div className="product-info">
                                        <h3>{product.name}</h3>
                                        <p className="price">₹{product.price}</p>
                                        <p className="category">{product.category}</p>
                                        <div className="product-stats" style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                            <span style={{ color: product.stock > 0 ? '#10b981' : '#ef4444' }}>📦 Stock: {product.stock || 0}</span>
                                            <span style={{ color: '#3b82f6' }}>🛒 Orders: {product.orderCount || 0}</span>
                                        </div>

                                        {/* 🔘 Home Page On/Off Toggle */}
                                        <div className="visibility-toggle-row">
                                            <span className={`status-badge ${product.isVisible !== false ? 'on' : 'off'}`}>
                                                {product.isVisible !== false ? '🟢 Visible on Home' : '🔴 Hidden from Home'}
                                            </span>
                                            <label className="switch-toggle" title="Toggle Home Page Visibility">
                                                <input
                                                    type="checkbox"
                                                    checked={product.isVisible !== false}
                                                    onChange={() => handleToggleVisibility(product._id, product.isVisible)}
                                                />
                                                <span className="slider-round"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="product-actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => navigate(`/admin/edit-product/${product._id}`)}
                                        >
                                            <Edit size={16} /> Edit
                                        </button>

                                        <button
                                            className="btn-discount"
                                            onClick={() => navigate(`/admin/edit-product/${product._id}?tab=discount`)}
                                        >
                                            💸 Discount
                                        </button>

                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(product._id)}
                                        >
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default RemoveProductPage;



