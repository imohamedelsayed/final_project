'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const { cart, user, loading, updateQuantity, removeItem, clearCart } = useCart();

  if (loading) {
    return (
      <div style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="container">
          <p style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>Loading your cart...</p>
        </div>
      </div>
    );
  }

  // Not signed in state
  if (!user) {
    return (
      <div style={{ padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: '640px', textAlign: 'center' }}>
          <div
            style={{
              background: 'var(--color-surface)',
              padding: '3.5rem 2rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ marginBottom: '1.25rem', color: 'var(--color-primary)' }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: '0 auto', display: 'block' }}
                aria-hidden="true"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: '800',
                color: 'var(--color-primary-dark)',
                marginBottom: '0.75rem'
              }}
            >
              Sign in to view your cart
            </h1>
            <p
              style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}
            >
              Pixel Store securely persists your hardware selections across sessions so you can
              easily review and order them from any device.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link
                href="/login?redirect=/cart"
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.75rem' }}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1.75rem' }}
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (!cart?.lines || cart.lines.length === 0) {
    return (
      <div style={{ padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: '640px', textAlign: 'center' }}>
          <div
            style={{
              background: 'var(--color-surface)',
              padding: '3.5rem 2rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ marginBottom: '1.25rem', color: 'var(--color-primary)' }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: '0 auto', display: 'block' }}
                aria-hidden="true"
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: '800',
                color: 'var(--color-primary-dark)',
                marginBottom: '0.75rem'
              }}
            >
              Your cart is empty
            </h1>
            <p
              style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}
            >
              Explore certified graphics cards, high-throughput processors, and bespoke enthusiast
              components ready for delivery.
            </p>
            <Link href="/products" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
              Browse Hardware Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* Header Breadcrumb */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.88rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.5rem'
            }}
          >
            <Link href="/" style={{ color: 'var(--color-primary)' }}>
              Home
            </Link>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <span>Shopping Cart</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
              Shopping Cart ({cart.items_count} {cart.items_count === 1 ? 'item' : 'items'})
            </h1>
            <button
              type="button"
              onClick={clearCart}
              className="btn btn-danger"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* Cart Layout */}
        <div className="cart-layout">
          {/* Cart Items List */}
          <div className="cart-items-card">
            {cart.lines.map((item) => {
              const isAvailable = Boolean(item.is_available);
              const imageUrl = item.product?.primary_image?.image_path || '/hero-showcase.png';

              return (
                <div key={item.id} className="cart-item-row">
                  {/* Thumbnail */}
                  <div className="cart-item-img">
                    <img src={imageUrl} alt={item.product?.name || 'Hardware component'} />
                  </div>

                  {/* Info */}
                  <div>
                    <Link
                      href={`/products/${item.product?.slug || ''}`}
                      style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-text)' }}
                    >
                      {item.product?.name}
                    </Link>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--color-text-muted)',
                        marginTop: '0.2rem'
                      }}
                    >
                      {item.variant?.variant_label || item.variant?.sku}
                    </div>

                    {/* Stock Alert if Unavailable */}
                    {!isAvailable && (
                      <span className="badge badge-unavailable" style={{ marginTop: '0.4rem' }}>
                        Unavailable / Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Unit Price */}
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      Unit Price
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{item.price} EGP</div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="qty-control">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= 100}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div
                      style={{
                        fontWeight: '800',
                        fontSize: '1.15rem',
                        color: 'var(--color-primary-dark)'
                      }}
                    >
                      {item.line_total} EGP
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-discount-red)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        marginTop: '0.35rem',
                        textDecoration: 'underline'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary */}
          <aside className="cart-summary-card">
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: 'var(--color-primary-dark)',
                marginBottom: '1.25rem'
              }}
            >
              Order Summary
            </h3>

            <div className="summary-row">
              <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
              <span style={{ fontWeight: '700' }}>{cart.subtotal} EGP</span>
            </div>

            <div className="summary-row">
              <span style={{ color: 'var(--color-text-muted)' }}>Shipping (Egypt)</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-primary)' }}>
                Agreed on WhatsApp
              </span>
            </div>

            <div className="summary-row total">
              <span>Total in EGP</span>
              <span>{cart.subtotal} EGP</span>
            </div>

            {/* Non-reservation notice */}
            <div
              style={{
                background: 'var(--color-surface-dim)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem',
                margin: '1.25rem 0',
                fontSize: '0.82rem',
                color: 'var(--color-text-muted)',
                lineHeight: '1.4'
              }}
            >
              <strong>Stock Reservation:</strong> Hardware components in your cart are verified and
              reserved upon WhatsApp order confirmation.
            </div>

            {/* Checkout Action Button */}
            <Link
              href="/checkout"
              className="btn btn-primary"
              style={{
                display: 'block',
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                textAlign: 'center',
                textDecoration: 'none',
                opacity: !cart.is_valid || cart.lines.length === 0 ? 0.5 : 1,
                pointerEvents: !cart.is_valid || cart.lines.length === 0 ? 'none' : 'auto'
              }}
            >
              Proceed to Checkout
            </Link>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link
                href="/products"
                style={{ fontSize: '0.88rem', color: 'var(--color-primary)', fontWeight: '600' }}
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
