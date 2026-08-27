import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Image as ImageIcon } from "lucide-react";
import AdminLayout from "./AdminLayout";
import "./AddProduct.css";

const AddProduct = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    price: "",
    gstPercent: "18",
    stock: "",
    sku: "",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [specifications, setSpecifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const adminEmail = "admin@gmail.com";
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data));
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.price || !image) {
      alert("Please fill in all required fields");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("category", form.category);
    formData.append("subcategory", form.subcategory || "");
    formData.append("price", form.price);
    formData.append("gstPercent", form.gstPercent !== undefined && form.gstPercent !== "" ? form.gstPercent : "18");
    formData.append("stock", form.stock !== "" ? form.stock : "0");
    if (form.sku !== "" && form.sku !== undefined) {
      formData.append("sku", form.sku);
    }
    formData.append("description", form.description);
    formData.append("isVisible", "true");
    formData.append("email", adminEmail);
    formData.append("image", image);
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }

    const validSpecs = specifications.filter(spec => spec.label.trim() || spec.value.trim());
    formData.append("specifications", JSON.stringify(validSpecs));

    for (let i = 0; i < galleryImages.length; i++) {
      formData.append("galleryImages", galleryImages[i]);
    }

    const token = localStorage.getItem("token");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/product`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        alert("Product Added Successfully!");
        navigate("/admin");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to add product");
      }
    } catch (error) {
      alert("Error adding product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="add-product-container">
        <div className="form-header">
          <h1>Add New Product</h1>
          <p>Create a new product for your store</p>
        </div>

        <div className="form-card">
          <div className="form-section">
            <h3>Product Information</h3>
            
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                placeholder="Enter product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: "" })}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Price * (Excl. GST)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>GST % *</label>
                <input
                  type="number"
                  placeholder="18"
                  value={form.gstPercent}
                  onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Initial Stock Quantity *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>SKU Number</label>
                <input
                  type="number"
                  placeholder="e.g. 10012"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
            </div>

            {form.category && categories.find(c => c.name === form.category)?.subcategories?.length > 0 && (
              <div className="form-group">
                <label>Subcategory</label>
                <select
                  value={form.subcategory || ""}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                >
                  <option value="">Select subcategory (optional)</option>
                  {categories.find(c => c.name === form.category).subcategories.map((sub, idx) => (
                    <option key={idx} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Enter product description"
                rows="4"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="form-section-specs">
              <div className="specs-header">
                <h3>Product Specifications (Optional)</h3>
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
          </div>

          <div className="form-section">
            <h3>Product Images</h3>

            <div className="form-group">
              <label>Main Image *</label>
              <div
                className="file-input-wrapper"
                onClick={() =>
                  document.getElementById("main-image").click()
                }
              >
                {image ? (
                  <div className="image-preview">
                    <ImageIcon size={24} />
                    <span>{image.name}</span>
                  </div>
                ) : (
                  <div className="file-input-placeholder">
                    <ImageIcon size={32} />
                    <p>Click to upload main product image</p>
                  </div>
                )}
              </div>
              <input
                id="main-image"
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                style={{ display: "none" }}
              />
            </div>

            <div className="form-group">
              <label>Gallery Images</label>
              <div
                className="file-input-wrapper"
                onClick={() =>
                  document.getElementById("gallery-images").click()
                }
              >
                <div className="file-input-placeholder">
                  <ImageIcon size={32} />
                  <p>Click to upload gallery images</p>
                  {galleryImages.length > 0 && (
                    <p className="file-count">
                      {galleryImages.length} image(s) selected
                    </p>
                  )}
                </div>
              </div>
              <input
                id="gallery-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setGalleryImages(e.target.files)}
                style={{ display: "none" }}
              />
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Product PDF Brochure (Optional)</label>
              <div
                className="file-input-wrapper"
                onClick={() =>
                  document.getElementById("product-pdf").click()
                }
              >
                {pdfFile ? (
                  <div className="image-preview">
                    <ImageIcon size={24} />
                    <span>{pdfFile.name}</span>
                  </div>
                ) : (
                  <div className="file-input-placeholder">
                    <ImageIcon size={32} />
                    <p>Click to upload product PDF specifications</p>
                  </div>
                )}
              </div>
              <input
                id="product-pdf"
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
                style={{ display: "none" }}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-cancel"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={18} /> Add Product
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddProduct;



