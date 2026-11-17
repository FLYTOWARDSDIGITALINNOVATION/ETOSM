import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  LogOut,
  ChevronDown,
  Star,
  Settings,
  FileText,
  CheckCircle2,
  Clock,
  FileCheck,
  BarChart3,
  RotateCcw,
  Printer,
  Receipt,
  Truck,
  AlertTriangle,
} from "lucide-react";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Sidebar defaults to closed on mobile (<=768px), open on desktop (>768px)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > 768;
    }
    return false;
  });
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Automatically close sidebar on mobile when navigating routes
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle ESC key to dismiss logout modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showLogoutModal) {
        setShowLogoutModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogoutModal]);

  const handleNavigate = (path) => {
    navigate(path);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin_dashboard_cache");
    localStorage.removeItem("cart");
    window.location.href = "/";
  };

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/admin/products") {
      return location.pathname === "/admin/products" || location.pathname === "/admin/remove-product";
    }
    if (path === "/admin/bestsellers") {
      return location.pathname === "/admin/bestsellers";
    }
    if (path === "/admin/create-invoice") {
      return location.pathname === "/admin/create-invoice" || location.pathname === "/admin/invoices";
    }
    if (path === "/admin/paid-invoices") {
      return location.pathname === "/admin/paid-invoices";
    }
    if (path === "/admin/pending-invoices") {
      return location.pathname === "/admin/pending-invoices";
    }
    if (path === "/admin/quotations") {
      return location.pathname === "/admin/quotations";
    }
    if (path === "/admin/billing-reports") {
      return location.pathname === "/admin/billing-reports";
    }
    if (path === "/admin/credit-notes") {
      return location.pathname === "/admin/credit-notes";
    }
    if (path === "/admin/shipping-labels") {
      return location.pathname === "/admin/shipping-labels";
    }
    if (path === "/admin/orders") {
      return location.pathname === "/admin/orders";
    }
    if (path === "/admin/customers") {
      return location.pathname === "/admin/customers";
    }
    if (path === "/admin/support") {
      return location.pathname === "/admin/support";
    }
    if (path === "/admin/reviews") {
      return location.pathname === "/admin/reviews";
    }
    if (path === "/admin/store-settings") {
      return location.pathname === "/admin/store-settings" || location.pathname === "/admin/shipping-settings";
    }
    if (path === "/admin/settings") {
      return location.pathname === "/admin/settings";
    }
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname === path;
  };

  const isParentActive = (item) => {
    if (!item.submenu) return isActive(item.path);
    return item.submenu.some((sub) => isActive(sub.path));
  };

  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin",
      submenu: null,
    },
    {
      title: "Products",
      icon: Package,
      submenu: [
        { title: "Product Management", path: "/admin/products" },
        { title: "Add Product", path: "/admin/add-product" },
        { title: "Add Category", path: "/admin/add-category" },
        { title: "Bestsellers", path: "/admin/bestsellers" },
      ],
    },
    {
      title: "Invoices & Billing",
      icon: Receipt,
      submenu: [
        { title: "Create Invoice", path: "/admin/create-invoice" },
        { title: "Paid Invoices", path: "/admin/paid-invoices" },
        { title: "Pending Invoices", path: "/admin/pending-invoices" },
        { title: "Quotation Management", path: "/admin/quotations" },
        { title: "Credit Notes", path: "/admin/credit-notes" },
        { title: "Billing Reports", path: "/admin/billing-reports" },
      ],
    },
    {
      title: "Orders & Shipping",
      icon: Truck,
      submenu: [
        { title: "Orders Management", path: "/admin/orders" },
        { title: "Shipping Labels", path: "/admin/shipping-labels" },
        { title: "Store Settings", path: "/admin/store-settings" },
      ],
    },
    {
      title: "Customer Management",
      icon: Users,
      path: "/admin/customers",
      submenu: null,
    },
    {
      title: "Support & Reviews",
      icon: MessageSquare,
      submenu: [
        { title: "Customer Support", path: "/admin/support" },
        { title: "Product Reviews", path: "/admin/reviews" },
      ],
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/admin/settings",
      submenu: null,
    },
  ];

  // Automatically expand the submenu containing the active route
  useEffect(() => {
    const parent = menuItems.find(
      (item) => item.submenu && item.submenu.some((sub) => isActive(sub.path))
    );
    if (parent) {
      setExpandedMenu(parent.title);
    }
  }, [location.pathname]);

  return (
    <div className="admin-layout" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <img
              src="/logo1.png"
              alt="Logo"
              className="sidebar-logo"
              onClick={() => handleNavigate("/")}
              style={{ cursor: 'pointer', height: '40px' }}
            />
          </div>
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse Menu" : "Extend Menu"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.submenu ? (
                <>
                  <button
                    className={`nav-item submenu-toggle ${
                      expandedMenu === item.title ? "expanded" : ""
                    } ${isParentActive(item) ? "has-active-child" : ""}`}
                    onClick={() => {
                      if (!sidebarOpen) {
                        setSidebarOpen(true);
                        setExpandedMenu(item.title);
                      } else {
                        toggleMenu(item.title);
                      }
                    }}
                    title={item.title}
                  >
                    <item.icon size={20} />
                    {sidebarOpen && (
                      <>
                        <span className="nav-text">{item.title}</span>
                        <ChevronDown size={16} className="chevron-icon" />
                      </>
                    )}
                  </button>
                  {expandedMenu === item.title && sidebarOpen && (
                    <div className="submenu">
                      {item.submenu.map((subitem, subindex) => (
                        <button
                          key={subindex}
                          className={`nav-subitem ${isActive(subitem.path) ? "active" : ""}`}
                          onClick={() => handleNavigate(subitem.path)}
                        >
                          <span>{subitem.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  className={`nav-item ${isActive(item.path) ? "active" : ""}`}
                  onClick={() => handleNavigate(item.path)}
                  title={item.title}
                >
                  <item.icon size={20} />
                  {sidebarOpen && <span className="nav-text">{item.title}</span>}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogoutClick} title="Logout">
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Topbar (Visible on <= 768px screens) */}
      <header className="admin-mobile-topbar">
        <div className="admin-mobile-brand" onClick={() => handleNavigate("/admin/create-invoice")}>
          <span className="admin-mobile-brand-name">
            ET<span style={{ color: "#e3000f" }}>O</span>SM
          </span>
          <span className="admin-mobile-brand-pill">Admin</span>
        </div>
        <button
          className="admin-mobile-menu-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? "Close Admin Menu" : "Open Admin Menu"}
        >
          {sidebarOpen ? <X size={20} color="#0f172a" /> : <Menu size={20} color="#0f172a" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className={`admin-main ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="admin-content">{children}</div>
      </main>

      {/* ⚠️ CENTERED LOGOUT CONFIRMATION WARNING MODAL */}
      {showLogoutModal && (
        <div 
          className="admin-logout-modal-overlay" 
          onClick={() => setShowLogoutModal(false)}
        >
          <div 
            className="admin-logout-modal-card" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <div className="admin-logout-icon-wrap">
              <AlertTriangle size={32} strokeWidth={2.2} />
            </div>

            <h3 id="logout-title" className="admin-logout-modal-title">
              Sign Out of Admin Portal?
            </h3>
            
            <p className="admin-logout-modal-desc">
              Are you sure you want to log out? Any unsaved edits will be discarded and you will need to sign in again to access admin controls.
            </p>

            <div className="admin-logout-modal-actions">
              <button 
                type="button" 
                className="admin-logout-btn-cancel" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="admin-logout-btn-confirm" 
                onClick={handleConfirmLogout}
              >
                <LogOut size={16} />
                <span>Yes, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
