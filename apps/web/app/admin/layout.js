'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';

const AdminContext = createContext(null);

export function useAdmin() {
  return useContext(AdminContext);
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshUser } = useCart();

  // If on a login or obscured portal route, render standalone without admin shell
  const isLoginPage =
    pathname?.includes('/login') ||
    (Boolean(pathname?.split('/')[2]) &&
      ![
        'orders',
        'products',
        'categories',
        'brands',
        'coupons',
        'inventory',
        'banners',
        'featured',
        'settings',
        'users'
      ].includes(pathname?.split('/')[2]));

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!isLoginPage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let ignore = false;
    async function checkAdminAuth() {
      try {
        const me = await api.getMe();
        if (!ignore) {
          if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) {
            router.replace('/login');
            return;
          }
          setUser(me);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          router.replace('/login');
        }
      }
    }

    checkAdminAuth();

    return () => {
      ignore = true;
    };
  }, [pathname, isLoginPage, router]);

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await api.logout();
      if (typeof refreshUser === 'function') {
        await refreshUser().catch(() => null);
      }
      router.push('/login');
    } catch (err) {
      console.error('Failed to sign out:', err);
      router.push('/login');
    } finally {
      setSigningOut(false);
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-loading-card">
          <div className="admin-spinner" />
          <p className="admin-loading-text">Verifying staff credentials...</p>
          <span className="admin-loading-subtext">Pixel Store Administration</span>
        </div>
        <style jsx>{`
          .admin-loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            padding: 2rem;
          }
          .admin-loading-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 2.5rem 3rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          .admin-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid #e2e8f0;
            border-top-color: #153f3a;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 1rem;
          }
          .admin-loading-text {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 600;
            color: #1e293b;
          }
          .admin-loading-subtext {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 0.25rem;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isSuperAdmin = user.role === 'super_admin';

  // Navigation Items
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        {
          label: 'Dashboard',
          href: '/admin',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
          ),
          exact: true
        },
        {
          label: 'Orders Queue',
          href: '/admin/orders',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'CATALOG & INVENTORY',
      items: [
        {
          label: 'Products',
          href: '/admin/products',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          )
        },
        {
          label: 'Categories',
          href: '/admin/categories',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          )
        },
        {
          label: 'Brands',
          href: '/admin/brands',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )
        },
        {
          label: 'Inventory',
          href: '/admin/inventory',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'MARKETING & CONTENT',
      items: [
        {
          label: 'Coupons',
          href: '/admin/coupons',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <circle cx="9.5" cy="14.5" r=".5" />
              <circle cx="14.5" cy="9.5" r=".5" />
            </svg>
          )
        },
        {
          label: 'Banners',
          href: '/admin/banners',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )
        },
        {
          label: 'Featured Products',
          href: '/admin/featured',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          label: 'Store Settings',
          href: '/admin/settings',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          )
        },
        ...(isSuperAdmin
          ? [
              {
                label: 'Staff Management',
                href: '/admin/users',
                badge: 'Super',
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                )
              }
            ]
          : [])
      ]
    }
  ];

  // Helper to determine active link
  const isLinkActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/admin');
  };

  const staffInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <AdminContext.Provider value={{ user, signOut: handleSignOut }}>
      <div className="admin-shell">
        {/* Mobile Header Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
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
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>

            <Link href="/admin" className="topbar-brand" aria-label="Pixel Store Admin Dashboard">
              <img
                src="/pixel-store-logo.png"
                alt="Pixel Store"
                className="topbar-logo-img"
                width={120}
                height={32}
              />
            </Link>
          </div>

          <div className="topbar-right">
            <Link href="/" className="btn-storefront-top" target="_blank" rel="noopener noreferrer">
              <span>View Storefront</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>

            <div className="staff-chip">
              <div className="staff-avatar">{staffInitials}</div>
              <div className="staff-meta desktop-only">
                <span className="staff-name">{user.name}</span>
                <span className={`role-badge ${isSuperAdmin ? 'super' : 'staff'}`}>
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-signout"
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign Out of Admin Portal"
            >
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="signout-label">{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </header>

        {/* Backdrop for Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            className="drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Navigation */}
        <aside className={`admin-sidebar ${mobileMenuOpen ? 'drawer-open' : ''}`}>
          <div className="sidebar-header">
            <Link
              href="/admin"
              className="sidebar-brand-logo-link"
              aria-label="Pixel Store Admin Dashboard"
            >
              <img
                src="/pixel-store-logo.png"
                alt="Pixel Store Administration"
                className="sidebar-brand-logo-img"
                width={140}
                height={38}
              />
            </Link>
            <span className="sidebar-portal-badge">Admin Portal</span>
          </div>

          {/* Staff Info Card in Sidebar */}
          <div className="sidebar-staff-card">
            <div className="staff-card-avatar">{staffInitials}</div>
            <div className="staff-card-info">
              <span className="staff-card-name" title={user.name}>
                {user.name}
              </span>
              <span className="staff-card-email" title={user.email}>
                {user.email}
              </span>
              <span className={`staff-card-role ${isSuperAdmin ? 'role-super' : 'role-admin'}`}>
                {isSuperAdmin ? 'SUPER ADMIN' : 'STAFF ADMIN'}
              </span>
            </div>
          </div>

          {/* Navigation Menus */}
          <nav className="sidebar-nav" aria-label="Admin Sections">
            {navSections.map((section) => (
              <div key={section.title} className="nav-section">
                <span className="section-title">{section.title}</span>
                <ul className="nav-list">
                  {section.items.map((item) => {
                    const active = isLinkActive(item);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`nav-link ${active ? 'active' : ''}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className="link-icon">{item.icon}</span>
                          <span className="link-label">{item.label}</span>
                          {item.badge && <span className="item-super-badge">{item.badge}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <Link
              href="/"
              className="sidebar-storefront-link"
              target="_blank"
              rel="noopener noreferrer"
            >
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
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>View Storefront</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ marginLeft: 'auto' }}
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>

            <button
              type="button"
              className="sidebar-signout-btn"
              onClick={handleSignOut}
              disabled={signingOut}
            >
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main-wrapper">{children}</main>
      </div>

      <style jsx global>{`
        /* Reset and layout base for admin shell */
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: #f6f0eb;
          color: #263330;
          font-family: var(
            --font-sans,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            Roboto,
            sans-serif
          );
        }

        /* Topbar Header */
        .admin-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: #ffffff;
          border-bottom: 1px solid #e2ddd7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          z-index: 40;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        @media (min-width: 1024px) {
          .admin-topbar {
            left: 260px;
          }
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .mobile-toggle-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: 1px solid #e2ddd7;
          border-radius: 6px;
          padding: 0.35rem;
          color: #153f3a;
          cursor: pointer;
        }

        @media (min-width: 1024px) {
          .mobile-toggle-btn {
            display: none;
          }
        }

        .topbar-brand {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .topbar-logo-img {
          height: 30px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        @media (min-width: 1024px) {
          .topbar-brand {
            display: none;
          }
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .btn-storefront-top {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #153f3a;
          background: #f6f0eb;
          border: 1px solid #e2ddd7;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .btn-storefront-top:hover {
          background: #ede6df;
          border-color: #cbd5e1;
        }

        .btn-storefront-top:focus-visible {
          outline: 2px solid #153f3a;
          outline-offset: 1px;
        }

        .staff-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .staff-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #153f3a;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .staff-meta {
          display: flex;
          flex-direction: column;
        }

        .staff-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #263330;
          line-height: 1.2;
        }

        .role-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .role-badge.super {
          color: #92400e;
        }

        .role-badge.staff {
          color: #153f3a;
        }

        .btn-signout {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-signout:hover:not(:disabled) {
          background: #fecaca;
        }

        .btn-signout:focus-visible {
          outline: 2px solid #ef4444;
          outline-offset: 1px;
        }

        .btn-signout:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .signout-label,
          .desktop-only {
            display: none !important;
          }
        }

        /* Sidebar Styling */
        .admin-sidebar {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          width: 260px;
          background: #153f3a;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          z-index: 50;
          transform: translateX(-100%);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .admin-sidebar::-webkit-scrollbar {
          width: 5px;
        }
        .admin-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-sidebar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        @media (min-width: 1024px) {
          .admin-sidebar {
            transform: translateX(0);
          }
        }

        .admin-sidebar.drawer-open {
          transform: translateX(0);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.25);
        }

        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(21, 63, 58, 0.45);
          z-index: 45;
        }

        @media (min-width: 1024px) {
          .drawer-backdrop {
            display: none;
          }
        }

        .sidebar-header {
          padding: 1.25rem 1.25rem 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          width: 100%;
          box-sizing: border-box;
        }

        .sidebar-brand-logo-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .sidebar-brand-logo-img {
          height: 36px;
          width: auto;
          max-width: 150px;
          object-fit: contain;
          display: block;
        }

        .sidebar-portal-badge {
          display: inline-block;
          align-self: flex-start;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #a3c2be;
          background: rgba(255, 255, 255, 0.08);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }

        /* Sidebar Staff Card */
        .sidebar-staff-card {
          margin: 0.75rem 0.75rem 0.4rem;
          padding: 0.65rem 0.75rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          box-sizing: border-box;
          min-width: 0;
        }

        .staff-card-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #254d48;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .staff-card-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
          flex: 1;
        }

        .staff-card-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .staff-card-email {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          margin-bottom: 0.2rem;
        }

        .staff-card-role {
          align-self: flex-start;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.12rem 0.4rem;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .staff-card-role.role-super {
          background: #78350f;
          color: #fde68a;
          border: 1px solid #b45309;
        }

        .staff-card-role.role-admin {
          background: rgba(255, 255, 255, 0.12);
          color: #e1f5ea;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Sidebar Navigation Menu */
        .sidebar-nav {
          flex: 1;
          padding: 0.75rem 0.6rem 1.5rem;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .nav-section {
          margin-bottom: 1.25rem;
          width: 100%;
          box-sizing: border-box;
        }

        .section-title {
          display: block;
          padding: 0 0.6rem 0.4rem;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.55);
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          width: 100%;
          box-sizing: border-box;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.65rem;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 500;
          transition: all 0.15s ease;
          position: relative;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .nav-link:focus-visible {
          outline: 2px solid #a3c2be;
          outline-offset: 1px;
        }

        .nav-link.active {
          background: #254d48;
          color: #ffffff;
          font-weight: 600;
          box-shadow: inset 3px 0 0 #f6f0eb;
        }

        .link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.85;
          flex-shrink: 0;
        }

        .nav-link.active .link-icon {
          opacity: 1;
          color: #ffffff;
        }

        .link-label {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-super-badge {
          font-size: 0.58rem;
          font-weight: 700;
          background: #78350f;
          color: #fde68a;
          border: 1px solid #b45309;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          flex-shrink: 0;
          white-space: nowrap;
        }

        /* Sidebar Footer */
        .sidebar-footer {
          padding: 0.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          background: rgba(0, 0, 0, 0.15);
          width: 100%;
          box-sizing: border-box;
        }

        .sidebar-storefront-link {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.55rem 0.75rem;
          border-radius: 6px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.15s ease;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .sidebar-storefront-link:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }

        .sidebar-storefront-link:focus-visible {
          outline: 2px solid #a3c2be;
          outline-offset: 1px;
        }

        .sidebar-signout-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.55rem 0.75rem;
          border-radius: 6px;
          border: none;
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
          box-sizing: border-box;
          text-align: left;
          min-width: 0;
        }

        .sidebar-signout-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          color: #ffffff;
        }

        .sidebar-signout-btn:focus-visible {
          outline: 2px solid #ef4444;
          outline-offset: 1px;
        }

        /* Main Content Wrapper */
        .admin-main-wrapper {
          flex: 1;
          padding-top: 60px;
          min-width: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        @media (min-width: 1024px) {
          .admin-main-wrapper {
            margin-left: 260px;
          }
        }
      `}</style>
    </AdminContext.Provider>
  );
}
