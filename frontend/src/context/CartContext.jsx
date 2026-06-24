import API_BASE_URL from '../apiConfig';
// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    return JSON.parse(localStorage.getItem("cart")) || [];
  });

  const user = JSON.parse(localStorage.getItem("user"));
  const userEmail = user?.email;

  // Persistence to localStorage
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Initial fetch from backend if user is logged in
  useEffect(() => {
    if (userEmail) {
      fetch(`${API_BASE_URL}/cart/${userEmail}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setCart(data);
          }
        })
        .catch(err => console.error("Failed to fetch cart:", err));
    }
  }, [userEmail]);

  // ✅ ADDED: clearCart function
  const clearCart = async () => {
    // 1. Clear Local State immediately for a fast UI
    setCart([]);

    // 2. Sync with Backend (Delete the entire cart for this user)
    if (userEmail) {
      try {
        await fetch(`${API_BASE_URL}/cart/${userEmail}`, {
          method: "DELETE",
        });
        console.log("Backend cart cleared successfully");
      } catch (err) {
        console.error("Failed to sync clear cart:", err);
      }
    }
  };

  const addToCart = async (product) => {
    const pid = product._id || product.id;
    const addedQty = product.qty || 1;
    const maxStock = product.stock !== undefined ? product.stock : 999;
    
    const existingItem = cart.find(p => p.productId === pid);
    const currentQty = existingItem ? existingItem.qty : 0;
    
    if (currentQty >= maxStock) {
      alert(`You cannot add more than the available stock (${maxStock}).`);
      return false;
    }
    
    const finalQty = Math.min(currentQty + addedQty, maxStock);
    const qtyToAdd = finalQty - currentQty;

    setCart(prev => {
      const exists = prev.find(p => p.productId === pid);
      if (exists) {
        const safeFinalQty = Math.min(exists.qty + addedQty, maxStock);
        return prev.map(p => p.productId === pid ? { ...p, qty: safeFinalQty, stock: maxStock } : p);
      }
      return [...prev, { ...product, productId: pid, qty: finalQty, stock: maxStock }];
    });

    if (userEmail) {
      try {
        await fetch(`${API_BASE_URL}/cart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail,
            productId: pid,
            name: product.name,
            price: product.price,
            img: product.image || product.img,
            qty: qtyToAdd,
            variation: product.size,
            gstPercent: product.gstPercent !== undefined ? product.gstPercent : 18,
            stock: maxStock
          })
        });
      } catch (err) {
        console.error("Failed to sync add to cart:", err);
      }
    }
    return true;
  };

  const removeFromCart = async (id) => {
    setCart(prev => prev.filter(p => p.productId !== id));
    if (userEmail) {
      try {
        await fetch(`${API_BASE_URL}/cart/${userEmail}/${id}`, {
          method: "DELETE"
        });
      } catch (err) {
        console.error("Failed to sync remove from cart:", err);
      }
    }
  };

  const updateQty = async (id, newQty) => {
    const existingItem = cart.find(p => String(p.productId) === String(id));
    if (existingItem && existingItem.stock !== undefined && newQty > existingItem.stock) {
      alert(`You cannot add more than the available stock (${existingItem.stock}).`);
      return;
    }

    if (newQty < 1) {
      removeFromCart(id);
      return;
    }
    setCart(prev =>
      prev.map(p => String(p.productId) === String(id) ? { ...p, qty: Number(newQty) } : p)
    );

    if (userEmail) {
      try {
        await fetch(`${API_BASE_URL}/cart/update-qty`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail, productId: id, qty: newQty })
        });
      } catch (err) {
        console.error("Failed to sync update qty:", err);
      }
    }
  };

  return (
    // ✅ ADDED: clearCart to the Provider value
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);


