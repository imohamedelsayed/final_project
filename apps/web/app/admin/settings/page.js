'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAdmin } from '../layout';

export default function AdminSettingsPage() {
  const adminContext = useAdmin();
  const currentUser = adminContext?.user;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const whatsappInputId = useId();

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getAdminWhatsappSetting();
        if (!ignore && res) {
          setWhatsappNumber(res.whatsapp_number || '+201000000000');
          setUpdatedAt(res.updated_at || '');
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load store settings.');
          setLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError('Only Super Administrators have permission to modify store settings.');
      return;
    }

    const clean = whatsappNumber.trim();
    if (!clean) {
      setError('WhatsApp contact number cannot be empty.');
      return;
    }

    if (!/^\+?[0-9\s-]+$/.test(clean) || clean.length < 8 || clean.length > 30) {
      setError('Please provide a valid phone number (8-30 digits, optional leading +).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.updateAdminWhatsappSetting(clean);
      setSuccess('Store WhatsApp number updated and persisted successfully.');
      if (res) {
        setWhatsappNumber(res.whatsapp_number);
        setUpdatedAt(res.updated_at);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to save store settings.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="settings-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-text">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span className="separator">/</span>
            <span className="current">Settings</span>
          </nav>
          <h1 className="page-title">Store Configuration & Settings</h1>
          <p className="page-subtitle">
            Manage store-wide fulfillment channels, customer communication parameters, and
            operational policies.
          </p>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {success && (
        <div className="alert alert-success" role="status">
          <span>{success}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setSuccess(null)}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setError(null)}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      <div className="settings-grid">
        {/* Primary Settings Form: WhatsApp & Communications */}
        <div className="settings-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Customer WhatsApp Contact</h2>
              <p className="card-description">
                Direct mobile line utilized for order placement confirmation messages, customer
                support links, and click-to-chat widgets across the storefront.
              </p>
            </div>
            {isSuperAdmin ? (
              <span className="badge badge-super">Super Admin Access</span>
            ) : (
              <span className="badge badge-readonly">Read-Only for Admin</span>
            )}
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading store settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="settings-form">
              <div className="form-group">
                <label htmlFor={whatsappInputId} className="form-label">
                  Official WhatsApp Contact Number *
                </label>
                <div className="input-group">
                  <span className="input-icon">
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
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </span>
                  <input
                    id={whatsappInputId}
                    type="text"
                    className="form-input"
                    placeholder="+201000000000"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    disabled={!isSuperAdmin || submitting}
                    required
                  />
                </div>
                <small className="form-help">
                  Include country code (e.g., +20 for Egypt). Used in automated pre-filled WhatsApp
                  click-to-chat links generated at checkout.
                </small>
              </div>

              {updatedAt && (
                <p className="timestamp-text">
                  Last updated: <strong>{new Date(updatedAt).toLocaleString()}</strong>
                </p>
              )}

              {isSuperAdmin ? (
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    id="save-settings-btn"
                    disabled={submitting}
                  >
                    {submitting ? 'Persisting Changes...' : 'Save Settings'}
                  </button>
                </div>
              ) : (
                <div className="role-restriction-note">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>
                    Your current account role is <strong>Administrator</strong>. Modifying primary
                    store communication endpoints requires <strong>Super Admin</strong> credentials.
                  </span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Operating Rules & Fulfillment Specifications (Static Business Configuration) */}
        <div className="settings-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Fulfillment & Policy Parameters</h2>
              <p className="card-description">
                Active business logic rules configured across checkout, catalog, and order
                verification pipelines.
              </p>
            </div>
            <span className="badge badge-system">Active System Rules</span>
          </div>

          <div className="policies-list">
            <div className="policy-item">
              <div className="policy-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="policy-content">
                <strong>Delivery Territory</strong>
                <p>
                  Door-to-door courier fulfillment strictly limited to Cairo and Giza Governorates.
                </p>
              </div>
              <span className="policy-status">Enforced</span>
            </div>

            <div className="policy-item">
              <div className="policy-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <div className="policy-content">
                <strong>Payment Terms</strong>
                <p>
                  Cash on Delivery (COD) in Egyptian Pounds (EGP). Customers inspect parcel seal
                  upon delivery.
                </p>
              </div>
              <span className="policy-status">Enforced</span>
            </div>

            <div className="policy-item">
              <div className="policy-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="policy-content">
                <strong>Order Reservation Window</strong>
                <p>
                  24-hour stock hold from checkout timestamp. Unconfirmed orders expire
                  automatically.
                </p>
              </div>
              <span className="policy-status">Enforced</span>
            </div>

            <div className="policy-item">
              <div className="policy-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <div className="policy-content">
                <strong>Discount Coupon Rule</strong>
                <p>
                  Maximum 1 coupon per order. Redemption count recorded upon Admin order
                  confirmation.
                </p>
              </div>
              <span className="policy-status">Enforced</span>
            </div>

            <div className="policy-item">
              <div className="policy-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="policy-content">
                <strong>Hardware Warranties</strong>
                <p>
                  14-day stress-testing warranty on certified used GPUs; official agency warranty on
                  new sealed components.
                </p>
              </div>
              <span className="policy-status">Enforced</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 1.75rem;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .breadcrumb a {
          color: #153f3a;
          text-decoration: none;
        }

        .separator {
          color: #cbd5e1;
        }

        .current {
          color: #0f172a;
          font-weight: 500;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
          gap: 1.5rem;
        }

        .settings-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .card-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
        }

        .card-description {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .badge-super {
          background: #e8f3ed;
          color: #1b7a48;
          border: 1px solid #c2e2d0;
        }

        .badge-readonly {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .badge-system {
          background: #f0f7f5;
          color: #153f3a;
          border: 1px solid #d4e5e1;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.4rem;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.85rem;
          font-size: 1rem;
        }

        .form-input {
          width: 100%;
          padding: 0.65rem 0.85rem 0.65rem 2.6rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.95rem;
          color: #0f172a;
          background: #ffffff;
          font-weight: 500;
        }

        .form-input:disabled {
          background: #f8fafc;
          color: #64748b;
          cursor: not-allowed;
        }

        .form-input:focus {
          outline: none;
          border-color: #0d9488;
        }

        .form-help {
          display: block;
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 0.4rem;
          line-height: 1.4;
        }

        .timestamp-text {
          font-size: 0.82rem;
          color: #94a3b8;
          margin-bottom: 1.25rem;
        }

        .timestamp-text strong {
          color: #475569;
        }

        .form-actions {
          margin-top: 1.5rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.4rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }

        .btn-primary {
          background: #0d9488;
          color: #ffffff;
        }

        .btn-primary:hover {
          background: #0f766e;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .role-restriction-note {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 6px;
          padding: 0.85rem 1rem;
          color: #92400e;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .role-restriction-note svg {
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        /* Policies List */
        .policies-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .policy-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 0.85rem 1rem;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
        }

        .policy-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .policy-content {
          flex: 1;
        }

        .policy-content strong {
          display: block;
          font-size: 0.9rem;
          color: #0f172a;
          margin-bottom: 0.2rem;
        }

        .policy-content p {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .policy-status {
          font-size: 0.75rem;
          font-weight: 600;
          color: #1b7a48;
          background: #e8f3ed;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #c2e2d0;
        }

        .alert {
          padding: 0.85rem 1.25rem;
          border-radius: 6px;
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .alert-success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert-danger {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.3rem;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
          line-height: 1;
        }

        .loading-state {
          padding: 2.5rem 1rem;
          text-align: center;
          color: #64748b;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #0d9488;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem auto;
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
