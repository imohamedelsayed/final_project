'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ lines: [], subtotal: '0.00', items_count: 0, is_valid: true });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const data = await api.getCart();
      setCart(data);
    } catch {
      setCart({ lines: [], subtotal: '0.00', items_count: 0, is_valid: true });
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const currentUser = await refreshUser();
      if (currentUser) {
        await refreshCart();
      }
      setLoading(false);
    }
    init();
  }, [refreshUser, refreshCart]);

  const handleAddToCart = async (variantId, quantity = 1) => {
    try {
      if (!user) {
        showToast('Please sign in to add items to your cart.', 'error');
        return false;
      }
      const updated = await api.addToCart(variantId, quantity);
      setCart(updated);
      showToast('Item added to cart successfully!');
      return true;
    } catch (err) {
      showToast(err.message || 'Failed to add item to cart', 'error');
      return false;
    }
  };

  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      const updated = await api.updateCartItem(itemId, quantity);
      setCart(updated);
      return true;
    } catch (err) {
      showToast(err.message || 'Failed to update quantity', 'error');
      return false;
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const updated = await api.removeCartItem(itemId);
      setCart(updated);
      showToast('Item removed from cart');
      return true;
    } catch (err) {
      showToast(err.message || 'Failed to remove item', 'error');
      return false;
    }
  };

  const handleClearCart = async () => {
    try {
      const updated = await api.clearCart();
      setCart(updated);
      showToast('Cart cleared');
      return true;
    } catch (err) {
      showToast(err.message || 'Failed to clear cart', 'error');
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      setCart({ lines: [], subtotal: '0.00', items_count: 0, is_valid: true });
      showToast('Logged out successfully');
    } catch {
      setUser(null);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        user,
        loading,
        toast,
        showToast,
        refreshCart,
        refreshUser,
        addToCart: handleAddToCart,
        updateQuantity: handleUpdateQuantity,
        removeItem: handleRemoveItem,
        clearCart: handleClearCart,
        logout: handleLogout
      }}
    >
      {children}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`} role="alert">
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
