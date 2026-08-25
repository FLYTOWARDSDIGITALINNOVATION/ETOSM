import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Header from "../components/Header";
import "./CategoryProducts.css";

const CategoryProducts = () => {
  const { category } = useParams();
  const decodedCategory = decodeURIComponent(category || "").trim();
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
    fetch(`${API_BASE_URL}/products/category/${encodeURIComponent(decodedCategory)}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching category products:", err);
        setLoading(false);
      });
  }, [category, decodedCategory]);

  const activeCategoryObj = categories.find(
    c => (c.name || "").toLowerCase().trim() === decodedCategory.toLowerCase()
  );
  
  // Combine defined category subcategories with subcategories actually present on products
  const definedSubcategories = activeCategoryObj?.subcategories || [];
  const productSubcategories = Array.from(
    new Set(
      products
        .map(p => (p.subcategory || "").trim())
        .filter(sub => sub.length > 0)
    )
  );

  // Create unique, case-preserving list of all available subcategories
  const activeSubcategoriesMap = new Map();
  [...definedSubcategories, ...productSubcategories].forEach(sub => {
    const key = sub.toLowerCase();
    if (!activeSubcategoriesMap.has(key)) {
      activeSubcategoriesMap.set(key, sub);
    }
  });
  const activeSubcategories = Array.from(activeSubcategoriesMap.values());

  // Filter products client-side with case-insensitive and trimmed comparison
  const filteredProducts = products.filter(product => {
    if (!selectedSubcategory) return true;
    const prodSub = (product.subcategory || "").trim();
    if (selectedSubcategory === "Uncategorized") return prodSub === "";
    return prodSub.toLowerCase() === selectedSubcategory.trim().toLowerCase();
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
          {decodedCategory.toUpperCase()} PRODUCTS
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
                  All Products ({products.length})
                </li>
                {activeSubcategories.map((sub, idx) => {
                  const count = products.filter(
                    p => (p.subcategory || "").trim().toLowerCase() === sub.toLowerCase()
                  ).length;
                  return (
                    <li
                      key={idx}
                      className={`sidebar-item ${selectedSubcategory.toLowerCase() === sub.toLowerCase() ? "active" : ""}`}
                      onClick={() => setSelectedSubcategory(sub)}
                    >
                      {sub} {count > 0 && <span style={{ fontSize: '0.8em', opacity: 0.75, marginLeft: '4px' }}>({count})</span>}
                    </li>
                  );
                })}
                {products.some(p => !(p.subcategory || "").trim()) && (
                  <li
                    className={`sidebar-item ${selectedSubcategory === "Uncategorized" ? "active" : ""}`}
                    onClick={() => setSelectedSubcategory("Uncategorized")}
                  >
                    Uncategorized ({products.filter(p => !(p.subcategory || "").trim()).length})
                  </li>
                )}
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



