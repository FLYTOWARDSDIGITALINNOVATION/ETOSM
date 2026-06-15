import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Header from "../components/Header";
import "./CategoryProducts.css";

const CategoryProducts = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch all categories to get subcategories for the current category
  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data || []))
      .catch(err => console.error("Failed to fetch categories:", err));
  }, []);

  // Fetch products for the active category
  useEffect(() => {
    setLoading(true);
    setSelectedSubcategory(""); // Reset subcategory filter on category change
    fetch(`${API_BASE_URL}/products/category/${category}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [category]);

  const activeCategoryObj = categories.find(
    c => c.name.toLowerCase() === category.toLowerCase()
  );
  const activeSubcategories = activeCategoryObj?.subcategories || [];

  // Filter products client-side
  const filteredProducts = products.filter(product => {
    if (!selectedSubcategory) return true;
    if (selectedSubcategory === "Uncategorized") return !product.subcategory;
    return product.subcategory === selectedSubcategory;
  });

  return (
    <>
      <Header />
      <div className="category-page container">

        {/* 🔙 BACK BUTTON */}
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <h2 className="category-title">
          {category.toUpperCase()} PRODUCTS
        </h2>

        {activeSubcategories.length > 0 ? (
          <div className="category-layout">
            <aside className="category-sidebar">
              <h3 className="sidebar-title">Subcategories</h3>
              <ul className="sidebar-list">
                <li
                  className={`sidebar-item ${selectedSubcategory === "" ? "active" : ""}`}
                  onClick={() => setSelectedSubcategory("")}
                >
                  All Products
                </li>
                {activeSubcategories.map((sub, idx) => (
                  <li
                    key={idx}
                    className={`sidebar-item ${selectedSubcategory === sub ? "active" : ""}`}
                    onClick={() => setSelectedSubcategory(sub)}
                  >
                    {sub}
                  </li>
                ))}
                <li
                  className={`sidebar-item ${selectedSubcategory === "Uncategorized" ? "active" : ""}`}
                  onClick={() => setSelectedSubcategory("Uncategorized")}
                >
                  Uncategorized
                </li>
              </ul>
            </aside>
            <main className="category-main-content">
              <div className="product-grid">
                {loading ? (
                  <p>Loading products...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="no-products-message">No products found in this subcategory</p>
                ) : (
                  filteredProducts.map(product => (
                    <ProductCard key={product._id} product={product} />
                  ))
                )}
              </div>
            </main>
          </div>
        ) : (
          <div className="product-grid">
            {loading ? (
              <p>Loading products...</p>
            ) : products.length === 0 ? (
              <p>No products found</p>
            ) : (
              products.map(product => (
                <ProductCard key={product._id} product={product} />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CategoryProducts;



