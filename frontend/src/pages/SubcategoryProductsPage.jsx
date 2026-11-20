import API_BASE_URL from "../apiConfig";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronRight,
  Package
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { cacheGet, cacheSet } from "../utils/dataCache";
import "./AllProductsPage.css";
import "./SubcategoryProductsPage.css";

const SUBCATEGORY_METADATA = {
  "lithium-ion": {
    canonicalSub: "lithium-ion-battery",
    title: "Lithium-Ion Battery",
    eyebrow: "BATTERY PACKS • RECHARGEABLE POWER",
    parentCategoryName: "Battery Packs",
    parentCategorySlug: "battery-packs",
    description:
      "Explore high-performance Lithium-Ion rechargeable battery packs and cylindrical cells. Designed with stable voltage output, high energy density, and built-in BMS safety for DIY electronics, IoT hardware, robotics, and portable power applications.",
    features: [
      "3.7V & 7.4V 2S Configurations",
      "Built-in BMS Protection",
      "High Energy Density Cells",
      "Reliable Cycle Life"
    ],
    otherSubcategories: [
      {
        title: "LiFePO4 (LFP) Battery",
        slug: "lifepo4-battery",
        image: "/lifepo4-battery.jpg",
        description: "2000+ cycle life, safe iron phosphate chemistry for solar & backup."
      },
      {
        title: "Battery Accessories",
        slug: "battery-accessories",
        image: "/battery-accessories.webp",
        description: "Cell holders, active balancers, and modular assembly hardware."
      }
    ]
  },
  "lithium-ion-battery": {
    canonicalSub: "lithium-ion-battery",
    title: "Lithium-Ion Battery",
    eyebrow: "BATTERY PACKS • RECHARGEABLE POWER",
    parentCategoryName: "Battery Packs",
    parentCategorySlug: "battery-packs",
    description:
      "Explore high-performance Lithium-Ion rechargeable battery packs and cylindrical cells. Designed with stable voltage output, high energy density, and built-in BMS safety for DIY electronics, IoT hardware, robotics, and portable power applications.",
    features: [
      "3.7V & 7.4V 2S Configurations",
      "Built-in BMS Protection",
      "High Energy Density Cells",
      "Reliable Cycle Life"
    ],
    otherSubcategories: [
      {
        title: "LiFePO4 (LFP) Battery",
        slug: "lifepo4-battery",
        image: "/lifepo4-battery.jpg",
        description: "2000+ cycle life, safe iron phosphate chemistry for solar & backup."
      },
      {
        title: "Battery Accessories",
        slug: "battery-accessories",
        image: "/battery-accessories.webp",
        description: "Cell holders, active balancers, and modular assembly hardware."
      }
    ]
  },
  "lifepo4": {
    canonicalSub: "lifepo4-battery",
    title: "LiFePO4 (LFP) Battery",
    eyebrow: "BATTERY PACKS • HIGH CYCLE LIFE",
    parentCategoryName: "Battery Packs",
    parentCategorySlug: "battery-packs",
    description:
      "Engineered for deep-cycle reliability, our Lithium Iron Phosphate (LiFePO4) battery packs offer 2000+ charge cycles, superior thermal safety, and integrated smart BMS for solar storage, UPS systems, and electric mobility.",
    features: [
      "12V & 12.8V High Capacity",
      "2000+ Long Cycle Life",
      "Smart BMS with Balancer",
      "Deep Discharge Recovery"
    ],
    otherSubcategories: [
      {
        title: "Lithium-Ion Battery",
        slug: "lithium-ion-battery",
        image: "/lithium-ion-battery.webp",
        description: "Compact 3.7V & 7.4V packs for DIY electronics and portable devices."
      },
      {
        title: "Battery Accessories",
        slug: "battery-accessories",
        image: "/battery-accessories.webp",
        description: "Cell holders, active balancers, and modular assembly hardware."
      }
    ]
  },
  "lifepo4-battery": {
    canonicalSub: "lifepo4-battery",
    title: "LiFePO4 (LFP) Battery",
    eyebrow: "BATTERY PACKS • HIGH CYCLE LIFE",
    parentCategoryName: "Battery Packs",
    parentCategorySlug: "battery-packs",
    description:
      "Engineered for deep-cycle reliability, our Lithium Iron Phosphate (LiFePO4) battery packs offer 2000+ charge cycles, superior thermal safety, and integrated smart BMS for solar storage, UPS systems, and electric mobility.",
    features: [
      "12V & 12.8V High Capacity",
      "2000+ Long Cycle Life",
      "Smart BMS with Balancer",
      "Deep Discharge Recovery"
    ],
    otherSubcategories: [
      {
        title: "Lithium-Ion Battery",
        slug: "lithium-ion-battery",
        image: "/lithium-ion-battery.webp",
        description: "Compact 3.7V & 7.4V packs for DIY electronics and portable devices."
      },
      {
        title: "Battery Accessories",
        slug: "battery-accessories",
        image: "/battery-accessories.webp",
        description: "Cell holders, active balancers, and modular assembly hardware."
      }
    ]
  },
  "accessories": {
    canonicalSub: "battery-accessories",
    title: "Battery Accessories",
    eyebrow: "BATTERY PACKS • HARDWARE & ACCESSORIES",
    parentCategoryName: "Battery Packs",
    parentCategorySlug: "battery-packs",
    description:
      "Professional battery assembly accessories, modular cylindrical cell holders, active battery balancers, and connection accessories designed for safe custom battery building and maintenance.",
    features: [
      "32650 & 33140 Cell Brackets",
      "Active Cell Balancers",
      "Standard 18650 Battery Holders",
      "Modular Flame-Retardant ABS"
    ],
    otherSubcategories: [
      {
        title: "Lithium-Ion Battery",
        slug: "lithium-ion-battery",
        image: "/lithium-ion-battery.webp",
        description: "Compact 3.7V & 7.4V packs for DIY electronics and portable devices."
      },
      {
        title: "LiFePO4 (LFP) Battery",
        slug: "lifepo4-battery",
        image: "/lifepo4-battery.jpg",
        description: "2000+ cycle life, safe iron phosphate chemistry for solar & backup."
      }
    ]
  },
  "battery-accessories": {
    canonicalSub: "battery-accessories",
    title: "Battery Accessories",
    eyebrow: "BATTERY PACKS • HARDWARE & ACCESSORIES",
    parentCategoryName: "Battery Packs",
    parentCategorySlug: "battery-packs",
    description:
      "Professional battery assembly accessories, modular cylindrical cell holders, active battery balancers, and connection accessories designed for safe custom battery building and maintenance.",
    features: [
      "32650 & 33140 Cell Brackets",
      "Active Cell Balancers",
      "Standard 18650 Battery Holders",
      "Modular Flame-Retardant ABS"
    ],
    otherSubcategories: [
      {
        title: "Lithium-Ion Battery",
        slug: "lithium-ion-battery",
        image: "/lithium-ion-battery.webp",
        description: "Compact 3.7V & 7.4V packs for DIY electronics and portable devices."
      },
      {
        title: "LiFePO4 (LFP) Battery",
        slug: "lifepo4-battery",
        image: "/lifepo4-battery.jpg",
        description: "2000+ cycle life, safe iron phosphate chemistry for solar & backup."
      }
    ]
  }
};

const normalizeKey = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

const SubcategoryProductsPage = () => {
  const { category, subcategory } = useParams();
  const navigate = useNavigate();

  const subKey = (subcategory || "").toLowerCase().trim();
  const meta = SUBCATEGORY_METADATA[subKey] || {
    title: subcategory ? subcategory.replace(/-/g, " ") : "Products",
    eyebrow: "CATEGORY COLLECTION",
    parentCategoryName: category ? category.replace(/-/g, " ") : "Category",
    parentCategorySlug: category || "battery-packs",
    description: "Explore our specialized hardware products and engineered solutions.",
    features: ["Genuine Grade Components", "Tested Quality", "Fast Dispatch", "Technical Support"],
    otherSubcategories: []
  };

  const [products, setProducts] = useState(() => {
    const cachedAll = cacheGet("all_products_catalog");
    if (Array.isArray(cachedAll) && cachedAll.length > 0) return cachedAll;
    const cachedCat = cacheGet("cat_products_battery-packs") || cacheGet("cat_products_batterypacks");
    if (Array.isArray(cachedCat) && cachedCat.length > 0) return cachedCat;
    return [];
  });
  const [loading, setLoading] = useState(() => {
    const cachedAll = cacheGet("all_products_catalog");
    const cachedCat = cacheGet("cat_products_battery-packs") || cacheGet("cat_products_batterypacks");
    return !((Array.isArray(cachedAll) && cachedAll.length > 0) || (Array.isArray(cachedCat) && cachedCat.length > 0));
  });

  // Dynamic document title & meta tags for SEO
  useEffect(() => {
    document.title = `${meta.title} | EToSM Technology`;
    window.scrollTo(0, 0);
  }, [meta.title]);

  // Load products data
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        let loaded = [];

        // 1. Try category-specific endpoint
        try {
          const catRes = await fetch(`${API_BASE_URL}/products/category/${encodeURIComponent("Battery Packs")}`);
          if (catRes.ok) {
            const catData = await catRes.json();
            if (Array.isArray(catData) && catData.length > 0) {
              loaded = catData;
            }
          }
        } catch (e) {
          // fallback to all
        }

        // 2. Fallback to /products/all
        if (loaded.length === 0) {
          const res = await fetch(`${API_BASE_URL}/products/all`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              loaded = data;
            }
          }
        }

        if (isMounted && loaded.length > 0) {
          setProducts(loaded);
          cacheSet("all_products_catalog", loaded);
        }
      } catch (err) {
        console.error("Failed to load products for subcategory:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products specifically for this subcategory
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const normSubKey = normalizeKey(subKey);

    return products.filter((product) => {
      const prodSubNorm = normalizeKey(product.subcategory);
      const prodNameNorm = normalizeKey(product.name);
      const prodCatNorm = normalizeKey(product.category);

      // Verify parent category is Battery Packs
      const isBatteryCat =
        !prodCatNorm ||
        prodCatNorm.includes("battery") ||
        prodCatNorm.includes("pack");
      if (!isBatteryCat) return false;

      // 1. Lithium-Ion Battery
      if (normSubKey.includes("lithiumion") || normSubKey === "lithiumion") {
        return (
          prodSubNorm === "lithiumionbattery" ||
          prodSubNorm.includes("lithiumion") ||
          (prodNameNorm.includes("liion") && !prodSubNorm.includes("lifepo4"))
        );
      }

      // 2. LiFePO4 (LFP) Battery
      if (normSubKey.includes("lifepo4") || normSubKey.includes("lfp")) {
        return (
          prodSubNorm.includes("lifepo4") ||
          prodSubNorm.includes("lfp") ||
          prodNameNorm.includes("lifepo4") ||
          prodNameNorm.includes("lfp")
        );
      }

      // 3. Battery Accessories
      if (normSubKey.includes("accessori") || normSubKey.includes("accessory")) {
        return (
          prodSubNorm.includes("accessori") ||
          prodSubNorm.includes("accessory") ||
          prodNameNorm.includes("holder") ||
          prodNameNorm.includes("balancer")
        );
      }

      // Generic fallback match
      return prodSubNorm.includes(normSubKey) || normSubKey.includes(prodSubNorm);
    });
  }, [products, subKey]);

  // Products for display
  const sortedProducts = filteredProducts;

  return (
    <div className="subcat-page-wrapper">
      <Header />

      {/* Breadcrumb Navigation Bar */}
      <nav className="subcat-breadcrumb-nav" aria-label="Breadcrumb">
        <div className="subcat-container">
          <div className="subcat-breadcrumb-content">
            <ol className="subcat-breadcrumb-trail">
              <li>
                <Link to="/">Home</Link>
                <ChevronRight size={13} className="breadcrumb-separator" />
              </li>
              <li>
                <Link to="/all-products">Products</Link>
                <ChevronRight size={13} className="breadcrumb-separator" />
              </li>
              <li>
                <Link to={`/category/${meta.parentCategorySlug}`}>
                  {meta.parentCategoryName}
                </Link>
                <ChevronRight size={13} className="breadcrumb-separator" />
              </li>
              <li className="active" aria-current="page">
                {meta.title}
              </li>
            </ol>
          </div>
        </div>
      </nav>

      {/* Products Section */}
      <section className="subcat-catalog-section">
        <div className="subcat-container">
          {/* Product Grid */}
          <main className="subcat-products-container">
            {loading ? (
              <div className="subcat-loading-box">
                <div className="subcat-spinner"></div>
                <p>Loading {meta.title} products...</p>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="subcat-empty-box">
                <Package size={52} className="empty-icon" />
                <h3>No products found</h3>
                <p>No products currently match this subcategory filter.</p>
                <button
                  type="button"
                  className="subcat-back-home-btn"
                  onClick={() => navigate(`/category/${meta.parentCategorySlug}`)}
                >
                  Back to {meta.parentCategoryName}
                </button>
              </div>
            ) : (
              <div className="subcat-grid">
                {sortedProducts.map((product, idx) => (
                  <ProductCard
                    key={product._id || idx}
                    product={product}
                    variant="catalog"
                    index={idx}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SubcategoryProductsPage;
