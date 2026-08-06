import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { WishlistProvider } from "./context/WishlistContext";
import { CartProvider } from "./context/CartContext";
import FloatingChat from "./components/FloatingChat";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

import CategoryProducts from "./pages/CategoryProducts";
import EditProductPage from "./admin/EditProductPage";

import HomePage from "./pages/HomePage";
import WishlistPage from "./pages/WishlistPage";
import CartPage from "./pages/CartPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess"; // ✅ Import Success Page
import AuthPage from "./pages/AuthPage";         // ✅ Import Login/Signup Page
import ForgotPasswordPage from "./pages/ForgotPasswordPage"; // ✅ Import Forgot Password
import ResetPasswordPage from "./pages/ResetPasswordPage"; // ✅ Import Reset Password
import AdminDashboard from "./admin/AdminDashboard"; // ✅ Import Admin Dashboard
import AddCategory from "./admin/AddCategory";
import AddProduct from "./admin/AddProduct";
import RemoveProductPage from "./admin/RemoveProductPage";
import AdminOrdersPage from "./admin/AdminOrdersPage";
import AdminSupportPage from "./admin/AdminSupportPage"; // ✅ Import Admin Support
import AdminReviewsPage from "./admin/AdminReviewsPage";
import AdminSettings from "./admin/AdminSettings"; // ✅ Import Admin Settings
import OrdersPage from "./pages/OrdersPage"; // ✅ Import Orders Page
import CustomerService from "./pages/CustomerService"; // ✅ Import Customer Service Page
import Profile from "./pages/Profile";
import AboutPage from "./pages/AboutPage";
import Contact from "./pages/Contact";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

import AllProductsPage from "./pages/AllProductsPage";

function App() {
  return (
    <WishlistProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <FloatingChat />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/all-products" element={<AllProductsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/category/:category" element={<CategoryProducts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/customer-service" element={<CustomerService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/add-category" element={<AddCategory />} />
            <Route path="/admin/add-product" element={<AddProduct />} />
            <Route path="/admin/remove-product" element={<RemoveProductPage />} />
            <Route path="/admin/edit-product/:id" element={<EditProductPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/support" element={<AdminSupportPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Routes>
        </Router>
      </CartProvider>
    </WishlistProvider>
  );
}


export default App;