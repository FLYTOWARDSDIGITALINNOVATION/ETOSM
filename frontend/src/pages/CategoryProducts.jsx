import API_BASE_URL from '../apiConfig';
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  BatteryCharging,
  ShieldCheck,
  Package,
  LayoutGrid,
  ArrowRight,
  ChevronRight,
  Zap,
  Gauge,
  Cpu,
  Box,
  Car,
  Factory,
  Sun,
  Radio,
  X
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { cacheGet, cacheSet } from "../utils/dataCache";
import { categoryToSlug, findMatchingCategory, getCategoryDisplayTitle, resolveCategoryQueryName, normalizeCategoryKey, getCategorySeoContent } from "../utils/categorySlug";
import "./CategoryProducts.css";

const PRODUCTS_PER_PAGE = 30;

const renderCardIcon = (iconName, size = 26) => {
  switch (iconName) {
    case "battery-charging":
      return <BatteryCharging size={size} />;
    case "shield-check":
      return <ShieldCheck size={size} />;
    case "package":
      return <Package size={size} />;
    case "layout-grid":
      return <LayoutGrid size={size} />;
    case "zap":
      return <Zap size={size} />;
    case "gauge":
      return <Gauge size={size} />;
    case "cpu":
      return <Cpu size={size} />;
    case "box":
      return <Box size={size} />;
    case "car":
      return <Car size={size} />;
    case "factory":
      return <Factory size={size} />;
    case "sun":
      return <Sun size={size} />;
    case "radio":
      return <Radio size={size} />;
    default:
      return <Package size={size} />;
  }
};

const CategoryProducts = () => {
  const { category } = useParams();
  const canonicalSlug = categoryToSlug(category);
  const navigate = useNavigate();
  const [categories, setCategories] = useState(() => cacheGet("all_categories_catalog") || []);

  // Seamlessly update URL if user navigated to unslugified URL (e.g. /category/Battery%20Packs)
  useEffect(() => {
    if (category && canonicalSlug && category !== canonicalSlug) {
      navigate(`/category/${canonicalSlug}`, { replace: true });
    }
  }, [category, canonicalSlug, navigate]);

  const targetCategoryParam = canonicalSlug || category || "";
  const cacheKey = `cat_products_${targetCategoryParam.toLowerCase()}`;
  const [products, setProducts] = useState(() => {
    const cached = cacheGet(cacheKey);
    return Array.isArray(cached) && cached.length > 0 ? cached : [];
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [loading, setLoading] = useState(() => {
    const cached = cacheGet(cacheKey);
    return !(Array.isArray(cached) && cached.length > 0);
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all categories to get subcategories for the current category
  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then(res => res.json())
      .then(data => {
        const catList = data || [];
        setCategories(catList);
        cacheSet("all_categories_catalog", catList);
      })
      .catch(err => console.error("Failed to fetch categories:", err));
  }, []);

  // Fetch products for the active category with multi-tier fallback (resolves slug to DB category name)
  useEffect(() => {
    if (!targetCategoryParam) return;
    const queryName = resolveCategoryQueryName(targetCategoryParam, categories);
    if (!queryName) return;

    if (!cacheGet(cacheKey)) setLoading(true);
    setSelectedSubcategory(""); // Reset subcategory filter on category change
    setCurrentPage(1);          // Reset to page 1 on category change

    const loadCategoryProducts = async () => {
      try {
        let loadedProducts = [];

        // 1. Primary: fetch with resolved category name (e.g. "Battery Packs" or "BATTERY PACKS")
        try {
          const res = await fetch(`${API_BASE_URL}/products/category/${encodeURIComponent(queryName)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              loadedProducts = data;
            }
          }
        } catch (e) {
          console.warn("Primary category fetch failed, trying alternate:", e);
        }

        // 2. If empty and targetCategoryParam differs from queryName, try targetCategoryParam directly
        if (loadedProducts.length === 0 && targetCategoryParam !== queryName) {
          try {
            const res = await fetch(`${API_BASE_URL}/products/category/${encodeURIComponent(targetCategoryParam)}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                loadedProducts = data;
              }
            }
          } catch (e) {
            console.warn("Slug category fetch failed:", e);
          }
        }

        // 3. Resilient Fallback: If still empty, fetch from /products/all and filter client-side
        if (loadedProducts.length === 0) {
          try {
            const allRes = await fetch(`${API_BASE_URL}/products/all`);
            if (allRes.ok) {
              const allProducts = await allRes.json();
              const targetKey = normalizeCategoryKey(targetCategoryParam);
              loadedProducts = (allProducts || []).filter(p => {
                const pKey = normalizeCategoryKey(p.category);
                return pKey === targetKey;
              });
            }
          } catch (e) {
            console.warn("Fallback all-products filter failed:", e);
          }
        }

        setProducts(loadedProducts);
        if (loadedProducts.length > 0) {
          cacheSet(cacheKey, loadedProducts);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching category products:", err);
        setLoading(false);
      }
    };

    loadCategoryProducts();
  }, [targetCategoryParam, categories, cacheKey]);

  // Reset to page 1 whenever subcategory changes
  const handleSubcategoryChange = (sub) => {
    setSelectedSubcategory(sub);
    setCurrentPage(1);
  };

  const handleBack = () => {
    navigate("/all-products");
  };

  const activeCategoryObj = findMatchingCategory(targetCategoryParam, categories);
  const displayTitle = getCategoryDisplayTitle(targetCategoryParam, categories);
  const seoContent = getCategorySeoContent(targetCategoryParam, displayTitle);

  // Dynamic SEO Meta Title, Description & Canonical URL
  useEffect(() => {
    const metaTitle =
      seoContent?.metaTitle ||
      `${displayTitle || "Products"} | EToSM Technology`;
    document.title = metaTitle;

    // Meta description
    const metaDescription =
      seoContent?.metaDescription ||
      seoContent?.section1?.description ||
      `Explore high quality ${displayTitle || "electronics"} products, modules, and accessories at EToSM Technology.`;

    let metaDescEl = document.querySelector('meta[name="description"]');
    if (!metaDescEl) {
      metaDescEl = document.createElement("meta");
      metaDescEl.name = "description";
      document.head.appendChild(metaDescEl);
    }
    metaDescEl.content = metaDescription;

    // OpenGraph Title & Description
    let ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (!ogTitleEl) {
      ogTitleEl = document.createElement("meta");
      ogTitleEl.setAttribute("property", "og:title");
      document.head.appendChild(ogTitleEl);
    }
    ogTitleEl.content = metaTitle;

    let ogDescEl = document.querySelector('meta[property="og:description"]');
    if (!ogDescEl) {
      ogDescEl = document.createElement("meta");
      ogDescEl.setAttribute("property", "og:description");
      document.head.appendChild(ogDescEl);
    }
    ogDescEl.content = metaDescription;

    // Canonical Link
    const canonicalHref =
      seoContent?.canonicalUrl ||
      `https://etosmtechnology.in/category/${canonicalSlug || targetCategoryParam}`;
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonicalHref;
  }, [seoContent, displayTitle, canonicalSlug, targetCategoryParam]);

  const handleScrollToProducts = () => {
    const el = document.querySelector('.category-layout') || document.querySelector('.category-main-content');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCtaClick = () => {
    const rangeEl = document.querySelector('.category-range-block');
    if (rangeEl) {
      rangeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (seoContent?.hideProducts) {
      navigate(`/all-products?category=${encodeURIComponent(activeCategoryObj?.name || "Battery Packs")}`);
    } else {
      handleScrollToProducts();
    }
  };

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  // Scroll to top of product grid on page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    const grid = document.querySelector('.category-page');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Render pagination bar
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    return (
      <div className="pagination-bar">
        {/* Prev */}
        <button
          className="pg-btn pg-nav"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </button>

        {/* First page shortcut */}
        {startPage > 1 && (
          <>
            <button className="pg-btn" onClick={() => handlePageChange(1)}>1</button>
            {startPage > 2 && <span className="pg-ellipsis">…</span>}
          </>
        )}

        {/* Page numbers */}
        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
          <button
            key={page}
            className={`pg-btn ${page === currentPage ? 'pg-active' : ''}`}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </button>
        ))}

        {/* Last page shortcut */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pg-ellipsis">…</span>}
            <button className="pg-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
          </>
        )}

        {/* Next */}
        <button
          className="pg-btn pg-nav"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className={`category-page container ${seoContent?.hideProducts ? 'content-only' : ''}`}>
        <nav className="category-breadcrumb-nav" aria-label="Breadcrumb">
          <ol className="category-breadcrumb-trail">
            <li>
              <Link to="/">Home</Link>
              <ChevronRight size={13} className="breadcrumb-separator" />
            </li>
            <li>
              <Link to="/all-products">Products</Link>
              <ChevronRight size={13} className="breadcrumb-separator" />
            </li>
            {selectedSubcategory ? (
              <>
                <li>
                  <Link
                    to={`/category/${targetCategoryParam}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubcategoryChange("");
                    }}
                  >
                    {displayTitle || "Category"}
                  </Link>
                  <ChevronRight size={13} className="breadcrumb-separator" />
                </li>
                <li className="active" aria-current="page">
                  {selectedSubcategory}
                </li>
              </>
            ) : (
              <li className="active" aria-current="page">
                {displayTitle || "Category"}
              </li>
            )}
          </ol>
        </nav>

        <div className="category-header-intro">
          <div className="category-hero-text">
            <h1 className="category-hero-h1">{seoContent?.section1?.h1 || seoContent?.h1}</h1>
            <p className="category-hero-desc">{seoContent?.section1?.description || seoContent?.description}</p>
            <button
              type="button"
              className="category-hero-cta"
              onClick={handleCtaClick}
              title={seoContent?.section1?.cta || seoContent?.cta}
            >
              {seoContent?.section1?.cta || seoContent?.cta}
            </button>
          </div>

          {seoContent?.section1?.image && (
            <div className="category-hero-visual">
              <img
                src={seoContent.section1.image}
                alt={seoContent?.section1?.h1 || "Battery Packs"}
                className="category-hero-img"
                loading="eager"
              />
            </div>
          )}
        </div>

          {/* Section 2: Directly Below Explore Our Products */}
          {seoContent?.section2 && (
            <div className={`category-about-block ${seoContent.section2.image ? 'has-image' : ''}`}>
              {seoContent.section2.image && (
                <div className="category-about-visual">
                  <img
                    src={seoContent.section2.image}
                    alt={seoContent.section2.h2}
                    className="category-about-img"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="category-about-text">
                <span className="category-about-eyebrow">{seoContent.section2.eyebrow}</span>
                <h2 className="category-about-h2">{seoContent.section2.h2}</h2>
                <p className="category-about-desc">{seoContent.section2.description}</p>
              </div>
            </div>
          )}

          {/* Section 3: Product Range */}
          {seoContent?.section3 && (
            <div className="category-range-block">
              <span className="category-range-eyebrow">{seoContent.section3.eyebrow}</span>
              <h3 className="category-range-h3">{seoContent.section3.h3}</h3>
              <p className="category-range-desc">{seoContent.section3.description}</p>

              {Array.isArray(seoContent.section3.cards) && seoContent.section3.cards.length > 0 && (
                <div className="category-range-grid">
                  {seoContent.section3.cards.map((card) => (
                    <div
                      key={card.id || card.title}
                      className="category-range-card"
                      onClick={() => navigate(card.link || "/all-products")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate(card.link || "/all-products");
                        }
                      }}
                    >
                      {card.image ? (
                        <div className="category-card-img-wrap">
                          <img
                            src={card.image}
                            alt={card.title}
                            className="category-card-img"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="category-card-icon-wrap">
                          {renderCardIcon(card.icon)}
                        </div>
                      )}
                      <h4 className="category-card-title">{card.title}</h4>
                      {card.description && (
                        <p className="category-card-desc">{card.description}</p>
                      )}
                      <span className="category-card-cta">
                        Explore <ArrowRight size={15} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        {!seoContent?.hideProducts && (
          activeSubcategories.length > 0 ? (
            <div className="category-layout">
              <div className="category-sidebar-wrap">
                <aside className="category-sidebar">
                  <h3 className="sidebar-title">Subcategories</h3>
                  <ul className="sidebar-list">
                    <li
                      className={`sidebar-item ${selectedSubcategory === "" ? "active" : ""}`}
                      onClick={() => handleSubcategoryChange("")}
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
                          onClick={() => handleSubcategoryChange(sub)}
                        >
                          {sub} {count > 0 && <span style={{ fontSize: '0.8em', opacity: 0.75, marginLeft: '4px' }}>({count})</span>}
                        </li>
                      );
                    })}
                    {products.some(p => !(p.subcategory || "").trim()) && (
                      <li
                        className={`sidebar-item ${selectedSubcategory === "Uncategorized" ? "active" : ""}`}
                        onClick={() => handleSubcategoryChange("Uncategorized")}
                      >
                        Uncategorized ({products.filter(p => !(p.subcategory || "").trim()).length})
                      </li>
                    )}
                  </ul>
                </aside>
              </div>
              <main className="category-main-content">
                <div className="product-grid">
                  {loading ? (
                    <p>Loading products...</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="no-products-message">No products found in this subcategory</p>
                  ) : (
                    paginatedProducts.map((product, idx) => (
                      <ProductCard key={product._id} product={product} variant="catalog" index={idx} />
                    ))
                  )}
                </div>
                {renderPagination()}
              </main>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {loading ? (
                  <p>Loading products...</p>
                ) : products.length === 0 ? (
                  <p>No products found</p>
                ) : (
                  paginatedProducts.map((product, idx) => (
                    <ProductCard key={product._id} product={product} variant="catalog" index={idx} />
                  ))
                )}
              </div>
              {renderPagination()}
            </>
          )
        )}
      </div>

      {/* Section 4: Choosing the Right Battery (Full-Width Edge-to-Edge Dark High-Tech Section) */}
      {seoContent?.section4 && (
        <section className="category-criteria-dark-section">
          <div className="category-criteria-dark-container">
            <div className="criteria-dark-header">
              <span className="criteria-dark-eyebrow">{seoContent.section4.eyebrow}</span>
              <h2 className="criteria-dark-h2">{seoContent.section4.h2}</h2>
              <p className="criteria-dark-desc">{seoContent.section4.description}</p>
            </div>

            {Array.isArray(seoContent.section4.points) && seoContent.section4.points.length > 0 && (
              <div className="criteria-dark-grid">
                {seoContent.section4.points.map((pt, idx) => (
                  <div key={idx} className="criteria-dark-card">
                    <div className="criteria-dark-icon">
                      {renderCardIcon(pt.icon, 22)}
                    </div>
                    <div className="criteria-dark-content">
                      <div className="criteria-dark-card-head">
                        <span className="criteria-dark-num">0{idx + 1}</span>
                        <h4 className="criteria-dark-title">{pt.title}</h4>
                      </div>
                      <p className="criteria-dark-card-desc">{pt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Section 5: Applications & Industries (Inside Container) */}
      {seoContent?.section5 && (
        <div className={`category-page container ${seoContent?.hideProducts ? 'content-only' : ''} category-section5-wrap`}>
          <div className="category-industries-block">
            {seoContent.section5.eyebrow && (
              <span className="category-industries-eyebrow">{seoContent.section5.eyebrow}</span>
            )}
            <h2 className="category-industries-h2">{seoContent.section5.h2}</h2>
            <p className="category-industries-desc">{seoContent.section5.description}</p>

            {Array.isArray(seoContent.section5.industries) && seoContent.section5.industries.length > 0 && (
              <div className="category-industries-grid">
                {seoContent.section5.industries.map((ind, idx) => (
                  <div key={idx} className="category-industry-card">
                    <div className="industry-icon-wrap">
                      {renderCardIcon(ind.icon, 22)}
                    </div>
                    <div className="industry-content">
                      <h4 className="industry-title">{ind.title}</h4>
                      <p className="industry-desc">{ind.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 6: EToSM Signature CTA Banner (Full Width Outside Narrow Content Container) */}
      {seoContent?.section6 && (
        <section className="category-cta-section">
          <div className="category-cta-container">
            {/* Left: Heading & Eyebrow */}
            <div className="category-cta-left">
              {seoContent.section6.eyebrow && (
                <span className="category-cta-eyebrow">
                  {seoContent.section6.eyebrow}
                </span>
              )}
              <h2 className="category-cta-h2">{seoContent.section6.h2}</h2>
            </div>

            {/* Center Divider */}
            <div className="category-cta-divider"></div>

            {/* Middle: Description & Action Button */}
            <div className="category-cta-middle">
              <p className="category-cta-desc">{seoContent.section6.description}</p>
              {seoContent.section6.cta && (
                <button
                  type="button"
                  className="category-cta-btn"
                  onClick={() => navigate(seoContent.section6.ctaLink || "/contact")}
                  title={seoContent.section6.cta}
                >
                  <span>{seoContent.section6.cta}</span>
                  <ArrowRight size={16} className="category-cta-btn-arrow" />
                </button>
              )}
            </div>

            {/* Right / Background: Circuit Traces Graphic */}
            <div className="category-cta-circuit-wrap">
              <svg className="category-cta-circuit-svg" viewBox="0 0 320 160" fill="none">
                <path d="M 40 160 L 110 90 L 180 90 L 220 50 L 290 50" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.3" />
                <circle cx="180" cy="90" r="3.5" fill="#ffffff" fillOpacity="0.55" />
                <circle cx="290" cy="50" r="3.5" fill="#ffffff" fillOpacity="0.65" />
                <path d="M 90 160 L 150 100 L 230 100 L 260 70 L 320 70" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.38" />
                <circle cx="230" cy="100" r="3.5" fill="#ffffff" fillOpacity="0.6" />
                <path d="M 140 160 L 190 110 L 270 110" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.25" />
                <circle cx="270" cy="110" r="3.5" fill="#ffffff" fillOpacity="0.5" />
                <path d="M 10 160 L 80 90 L 150 90 L 190 50 L 260 50 L 280 30 L 320 30" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.3" />
                <circle cx="150" cy="90" r="3.5" fill="#ffffff" fillOpacity="0.55" />
                <circle cx="260" cy="50" r="3.5" fill="#ffffff" fillOpacity="0.55" />
                <circle cx="320" cy="30" r="3.5" fill="#ffffff" fillOpacity="0.7" />
              </svg>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
};

export default CategoryProducts;
