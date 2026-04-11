import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  LogOut,
  ChevronDown,
} from "lucide-react";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin_dashboard_cache");
    navigate("/", { replace: true });
  };

  const isActive = (path) => location.pathname === path;

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
      title: "Catalog",
      icon: Package,
      submenu: [
        { title: "Add Product", path: "/admin/add-product" },
        { title: "Manage Products", path: "/admin/remove-product" },
        { title: "Add Category", path: "/admin/add-category" },
      ],
    },
    {
      title: "Orders",
      icon: ShoppingCart,
      path: "/admin/orders",
      submenu: null,
    },
    {
      title: "Support",
      icon: MessageSquare,
      path: "/admin/support",
      submenu: null,
    },
  ];

  return (
    <div className="admin-layout" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <img
              src="/logoo.png"
              alt="Logo"
              className="sidebar-logo"
              onClick={() => navigate("/")}
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
                    className={`nav-item submenu-toggle ${expandedMenu === item.title ? "expanded" : ""
                      }`}
                    onClick={() => toggleMenu(item.title)}
                  >
                    <item.icon size={20} />
                    {sidebarOpen && (
                      <>
                        <span className="nav-text">{item.title}</span>
                        <ChevronDown size={16} />
                      </>
                    )}
                  </button>
                  {expandedMenu === item.title && sidebarOpen && (
                    <div className="submenu">
                      {item.submenu.map((subitem, subindex) => (
                        <button
                          key={subindex}
                          className={`nav-subitem ${isActive(subitem.path) ? "active" : ""
                            }`}
                          onClick={() => navigate(subitem.path)}
                        >
                          {subitem.title}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  className={`nav-item ${isActive(item.path) ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={20} />
                  {sidebarOpen && <span className="nav-text">{item.title}</span>}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`admin-main ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
