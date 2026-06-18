import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
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
    subcategory: "",
    price: "",
    gstPercent: 18,
    pdfUrl: "",
    description: "",
    discountPercent: 0,
    salesPrice: "",
    discountStart: "",
    discountEnd: "",
    image: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [specifications, setSpecifications] = useState([]);

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
          gstPercent: data.gstPercent !== undefined ? data.gstPercent : 18,
          salesPrice: salesPriceValue,
          discountStart: data.discountStart ? data.discountStart.slice(0, 16) : "",
          discountEnd: data.discountEnd ? data.discountEnd.slice(0, 16) : "",
        });
        setSpecifications(data.specifications || []);
      });
  }, [id]);

  const handleChange = (e) => {
    if (e.target.name === "category") {
      setForm({ ...form, category: e.target.value, subcategory: "" });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
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
      formData.append("subcategory", form.subcategory || "");
      formData.append("price", form.price);
      formData.append("gstPercent", form.gstPercent !== undefined && form.gstPercent !== "" ? form.gstPercent : 18);
      formData.append("description", form.description);
      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }
      const validSpecs = specifications.filter(spec => spec.label.trim() || spec.value.trim());
      formData.append("specifications", JSON.stringify(validSpecs));
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

            {form.category && categories.find(c => c.name === form.category)?.subcategories?.length > 0 && (
              <>
                <label>Subcategory</label>
                <select
                  name="subcategory"
                  value={form.subcategory || ""}
                  onChange={handleChange}
                >
                  <option value="">Select Subcategory (Optional)</option>
                  {categories.find(c => c.name === form.category).subcategories.map((sub, idx) => (
                    <option key={idx} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label>Price (Excl. GST)</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
            />

            <label>GST %</label>
            <input
              type="number"
              name="gstPercent"
              value={form.gstPercent}
              onChange={handleChange}
              required
            />

            <label>Product Image</label>
            <div className="image-edit-section">
              {preview ? (
                <img src={preview} alt="New Preview" className="edit-preview" />
              ) : form.image ? (
                <img src={`${API_BASE_URL}${form.image}`} alt="Current" className="edit-preview" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
            </div>

            <label>Product PDF Brochure (Optional)</label>
            <div className="pdf-edit-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
              {form.pdfUrl && (
                <a href={`${API_BASE_URL}${form.pdfUrl}`} target="_blank" rel="noreferrer" style={{ color: '#c71585', textDecoration: 'underline', fontSize: '14px', fontWeight: '500' }}>
                  View Current PDF Brochure
                </a>
              )}
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
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

            <div className="form-section-specs">
              <div className="specs-header">
                <label>Product Specifications (Optional)</label>
                <button
                  type="button"
                  className="btn-add-spec"
                  onClick={() => setSpecifications([...specifications, { label: "", value: "" }])}
                >
                  <Plus size={16} /> Add Row
                </button>
              </div>

              {specifications.length > 0 ? (
                <div className="specs-table-edit">
                  <div className="spec-row-header">
                    <span>Category / Label</span>
                    <span>Specification / Value</span>
                    <span>Action</span>
                  </div>
                  {specifications.map((spec, index) => (
                    <div key={index} className="spec-row-edit">
                      <input
                        type="text"
                        placeholder="e.g. Brand & Model, Nominal Voltage"
                        value={spec.label}
                        onChange={(e) => {
                          const newSpecs = [...specifications];
                          newSpecs[index].label = e.target.value;
                          setSpecifications(newSpecs);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="e.g. ETOSM & ET-LFP-1286S, 12.8V"
                        value={spec.value}
                        onChange={(e) => {
                          const newSpecs = [...specifications];
                          newSpecs[index].value = e.target.value;
                          setSpecifications(newSpecs);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-delete-spec"
                        onClick={() => {
                          const newSpecs = specifications.filter((_, i) => i !== index);
                          setSpecifications(newSpecs);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-specs-text">No specifications added yet. Click "Add Row" to add technical details in a table format.</p>
              )}
            </div>
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



