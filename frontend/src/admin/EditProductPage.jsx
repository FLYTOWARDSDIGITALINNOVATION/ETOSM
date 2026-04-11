import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./EditProductPage.css";

const EditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  const location = useLocation();
  const isDiscountTab = new URLSearchParams(location.search).get("tab") === "discount";

  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    discountPercent: 0,
    salesPrice: "",
    discountStart: "",
    discountEnd: "",
    image: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Failed to fetch categories", err));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/products/${id}`)
      .then(res => res.json())
      .then(data => {
        const salesPriceValue = data.price && data.discountPercent
          ? (data.price - (data.price * data.discountPercent / 100)).toFixed(2)
          : data.price;

        setForm({
          ...data,
          salesPrice: salesPriceValue,
          discountStart: data.discountStart ? data.discountStart.slice(0, 16) : "",
          discountEnd: data.discountEnd ? data.discountEnd.slice(0, 16) : "",
        });
      });
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    if (isDiscountTab) {
      formData.append("salesPrice", form.salesPrice);
      formData.append("price", form.price);
      formData.append("discountStart", form.discountStart);
      formData.append("discountEnd", form.discountEnd);
    } else {
      formData.append("name", form.name);
      formData.append("category", form.category);
      formData.append("price", form.price);
      formData.append("description", form.description);
      if (imageFile) {
        formData.append("image", imageFile);
      }
    }

    const res = await fetch(`${API_BASE_URL}/admin/product/${id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData,
    });

    if (res.ok) {
      alert(isDiscountTab ? "Discount updated" : "Product updated");
      navigate("/admin/remove-product");
    }
  };

  return (
    <div className="edit-container">
      <h1 className="heading">{isDiscountTab ? "Manage Discount" : "Edit Product"}</h1>
      <button className="back-btn" onClick={() => navigate(-1)}> ← Back </button>

      <form className="edit-form" onSubmit={handleSubmit}>
        {!isDiscountTab && (
          <>
            <label>Product Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <label>Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <label>Price</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
            />

            <label>Product Image</label>
            <div className="image-edit-section">
              {preview ? (
                <img src={preview} alt="New Preview" className="edit-preview" />
              ) : form.image ? (
                <img src={`http://localhost:5000${form.image}`} alt="Current" className="edit-preview" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
            </div>

            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="5"
            />
          </>
        )}

        {isDiscountTab && (
          <>
            <label>Original Price</label>
            <input
              type="number"
              value={form.price}
              disabled
            />

            <label>Sales Price (Direct Amount)</label>
            <input
              type="number"
              name="salesPrice"
              value={form.salesPrice}
              onChange={handleChange}
              placeholder="Enter final sales price"
              required
            />

            <label>Discount Start</label>
            <input
              type="datetime-local"
              name="discountStart"
              value={form.discountStart}
              onChange={handleChange}
            />

            <label>Discount End</label>
            <input
              type="datetime-local"
              name="discountEnd"
              value={form.discountEnd}
              onChange={handleChange}
            />
          </>
        )}

        <button type="submit" className="save-btn">Save Changes</button>
      </form>
    </div>
  );
};

export default EditProductPage;



