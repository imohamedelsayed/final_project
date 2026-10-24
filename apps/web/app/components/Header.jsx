'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { cart, user, logout } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand Logo - Original Stitch Logo Asset */}
        <Link href="/" className="brand-logo" aria-label="Pixel Store Home">
          <img
            src="/pixel-store-logo.png"
            alt="Pixel Store - Tech For A Better You"
            className="brand-logo-img"
            width={140}
            height={40}
            priority="true"
          />
        </Link>

        {/* Center: Desktop Navigation & Compact Search */}
        <div className="header-center">
          <nav className="header-nav" aria-label="Main Navigation">
            <Link href="/products" className="nav-link">
              All Hardware
            </Link>
            <Link href="/products?condition=new" className="nav-link">
              New Parts
            </Link>
            <Link href="/products?condition=used" className="nav-link">
              Certified Used
            </Link>
            <Link href="/#deals" className="nav-link">
              Deals
            </Link>
          </nav>

          <form className="header-search" onSubmit={handleSearchSubmit} role="search">
            <svg
              className="header-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search GPUs, CPUs, RAM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search hardware catalog"
            />
          </form>
        </div>

        {/* Right: Account & Cart Actions */}
        <div className="header-actions">
          {user ? (
            <div className="header-auth-user">
              <span className="user-greeting">Hi, {user.name.split(' ')[0]}</span>
              <Link href="/orders" className="auth-link">
                My Orders
              </Link>
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <Link href="/admin" className="auth-link admin-link">
                  Admin
                </Link>
              )}
              <button type="button" onClick={logout} className="auth-link auth-signout-btn">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="header-auth-guest">
              <Link href="/login" className="auth-link">
                Sign In
              </Link>
              <span className="auth-divider">|</span>
              <Link href="/register" className="auth-link">
                Register
              </Link>
            </div>
          )}

          {/* Cart Button with Count and Price */}
          <Link href="/cart" className="cart-button" aria-label="View Shopping Cart">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="cart-amount">{cart.subtotal} EGP</span>
            <span className="cart-badge">{cart.items_count}</span>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" id="mobile-nav">
          <form className="mobile-search-form" onSubmit={handleSearchSubmit} role="search">
            <input
              type="search"
              placeholder="Search GPUs, CPUs, RAM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search hardware catalog"
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 0.9rem' }}>
              Search
            </button>
          </form>

          <nav className="mobile-nav-links" aria-label="Mobile Navigation Links">
            <Link
              href="/products"
              className="mobile-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              All Hardware
            </Link>
            <Link
              href="/products?condition=new"
              className="mobile-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              New Parts
            </Link>
            <Link
              href="/products?condition=used"
              className="mobile-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              Certified Used
            </Link>
            <Link
              href="/#deals"
              className="mobile-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              Deals
            </Link>
          </nav>

          <div className="mobile-auth-links">
            {user ? (
              <div className="mobile-user-box">
                <span className="mobile-user-greeting">Signed in as {user.name}</span>
                <Link
                  href="/orders"
                  className="mobile-nav-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Orders
                </Link>
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <Link
                    href="/admin/orders"
                    className="mobile-nav-item admin-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Orders
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="mobile-nav-item"
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '0.5rem 0',
                    color: 'inherit'
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="mobile-guest-auth">
                <Link
                  href="/login"
                  className="btn btn-secondary"
                  style={{ textAlign: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary"
                  style={{ textAlign: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
