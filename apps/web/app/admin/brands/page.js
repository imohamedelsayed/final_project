'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'true' | 'false'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Unique accessible IDs for form fields
  const brandNameInputId = useId();
  const brandSlugInputId = useId();
  const brandActiveCheckboxId = useId();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadBrands() {
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.is_active = statusFilter;

        const res = await api.getAdminBrands(params);
        if (!ignore) {
          setBrands(res.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load brands.');
          setLoading(false);
        }
      }
    }

    loadBrands();
    return () => {
      ignore = true;
    };
  }, [search, statusFilter, refreshKey]);

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const openCreateModal = () => {
    setEditingBrand(null);
    setName('');
    setSlug('');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (brand) => {
    setEditingBrand(brand);
    setName(brand.name || '');
    setSlug(brand.slug || '');
    setIsActive(brand.is_active ?? true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!editingBrand && (!slug || slug === generateSlug(name))) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Brand name is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload = {
        name: name.trim(),
        slug: slug.trim() ? slug.trim() : undefined,
        is_active: Boolean(isActive)
      };

      if (editingBrand) {
        await api.updateAdminBrand(editingBrand.id, payload);
        setActionSuccess(`Brand "${payload.name}" updated successfully.`);
      } else {
        await api.createAdminBrand(payload);
        setActionSuccess(`Brand "${payload.name}" created successfully.`);
      }

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(err.message || 'Failed to save brand.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (brand) => {
    const confirmMsg = `Are you sure you want to delete or deactivate brand "${brand.name}"?\nIf products are associated, it will be safely deactivated to preserve historical data.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setError(null);
      const res = await api.deleteAdminBrand(brand.id);
      setActionSuccess(res?.message || `Brand "${brand.name}" was processed successfully.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to delete brand.');
    }
  };

  return (
    <div className="admin-brands-page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb-nav">
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Brands</span>
          </div>
          <h1>Hardware Brands</h1>
          <p>
            Manage hardware manufacturers and brand partners (e.g. ASUS, MSI, NVIDIA, AMD, Corsair).
          </p>
        </div>

        <button type="button" className="btn-primary" onClick={openCreateModal}>
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add Brand</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="alert-success">
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
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{actionSuccess}</span>
          <button type="button" className="alert-close-btn" onClick={() => setActionSuccess(null)}>
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert-error">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" className="alert-close-btn" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {/* Control Card */}
      <div className="controls-card">
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            setRefreshKey((k) => k + 1);
          }}
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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search brands by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-search">
            Search
          </button>
        </form>

        <div className="filter-tabs">
          {[
            { id: '', label: 'All Brands' },
            { id: 'true', label: 'Active Only' },
            { id: 'false', label: 'Inactive' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-tab ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brands Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading">
            <div className="spinner" />
            <p>Loading brands...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="empty-table-state">
            <p>No brands found matching your criteria.</p>
            <button type="button" className="btn-secondary" onClick={openCreateModal}>
              Create First Brand
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="brands-table">
              <thead>
                <tr>
                  <th>Brand Name</th>
                  <th>URL Slug</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="brand-name-cell">
                        <strong>{b.name}</strong>
                      </div>
                    </td>
                    <td>
                      <code className="slug-tag">/{b.slug}</code>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${b.is_active ? 'pill-active' : 'pill-inactive'}`}
                      >
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="date-text">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-action edit"
                          onClick={() => openEditModal(b)}
                          title="Edit Brand"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action danger"
                          onClick={() => handleDelete(b)}
                          title="Delete or Deactivate Brand"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBrand ? 'Edit Brand' : 'Create New Brand'}</h3>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {formError && (
                <div className="form-error-banner">
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor={brandNameInputId}>
                  Brand Name <span className="req">*</span>
                </label>
                <input
                  id={brandNameInputId}
                  type="text"
                  required
                  placeholder="e.g. ASUS, MSI, Gigabyte, Intel"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="form-group">
                <label htmlFor={brandSlugInputId}>
                  URL Slug <span className="opt">(auto-generated if empty)</span>
                </label>
                <input
                  id={brandSlugInputId}
                  type="text"
                  placeholder="e.g. asus, gigabyte"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  maxLength={150}
                />
              </div>

              <div className="form-group checkbox-group">
                <label htmlFor={brandActiveCheckboxId} className="checkbox-label">
                  <input
                    id={brandActiveCheckboxId}
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>Brand is Active (Visible on Storefront)</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : editingBrand ? 'Save Changes' : 'Create Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-brands-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
          width: 100%;
        }

        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .breadcrumb-nav a {
          color: #153f3a;
          text-decoration: none;
          font-weight: 600;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #153f3a;
          margin: 0 0 0.35rem;
          letter-spacing: -0.02em;
        }

        .page-header p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
          max-width: 600px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #153f3a;
          color: #ffffff;
          padding: 0.55rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-primary:hover {
          background: #1c524c;
        }

        .alert-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          padding: 0.85rem 1.25rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .alert-error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #9f1239;
          padding: 0.85rem 1.25rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .alert-close-btn {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: inherit;
        }

        .controls-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.35rem 0.75rem;
          flex: 1;
          max-width: 420px;
        }

        .search-box input {
          border: none;
          background: none;
          outline: none;
          width: 100%;
          font-size: 0.85rem;
          color: #1e293b;
        }

        .btn-search {
          background: #153f3a;
          color: #ffffff;
          border: none;
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .filter-tabs {
          display: flex;
          gap: 0.4rem;
        }

        .filter-tab {
          background: none;
          border: 1px solid #e2e8f0;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .filter-tab.active {
          background: #153f3a;
          color: #ffffff;
          border-color: #153f3a;
          font-weight: 600;
        }

        .table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        .table-loading,
        .empty-table-state {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #64748b;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #153f3a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .brands-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .brands-table th {
          text-align: left;
          padding: 0.85rem 1.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .brands-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .brands-table tr:hover td {
          background: #fbfcfe;
        }

        .brand-name-cell strong {
          color: #1e293b;
          font-size: 0.9rem;
        }

        .slug-tag {
          font-family: monospace;
          font-size: 0.75rem;
          background: #f1f5f9;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          color: #475569;
        }

        .date-text {
          font-size: 0.8rem;
          color: #64748b;
        }

        .status-pill {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pill-active {
          background: #dcfce7;
          color: #15803d;
        }

        .pill-inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .btn-action {
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
        }

        .btn-action.edit {
          background: #f1f5f9;
          color: #334155;
          border-color: #cbd5e1;
        }

        .btn-action.edit:hover {
          background: #e2e8f0;
        }

        .btn-action.danger {
          background: #fff1f2;
          color: #991b1b;
          border-color: #fecdd3;
        }

        .btn-action.danger:hover {
          background: #ffe4e6;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(18, 30, 27, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 60;
        }

        .modal-container {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: #153f3a;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #94a3b8;
          cursor: pointer;
          line-height: 1;
        }

        .modal-form {
          padding: 1.5rem;
        }

        .form-error-banner {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #9f1239;
          padding: 0.65rem 0.85rem;
          border-radius: 6px;
          font-size: 0.8rem;
          margin-bottom: 1.25rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.4rem;
        }

        .req {
          color: #ef4444;
        }

        .opt {
          font-weight: 400;
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .form-group input[type='text'] {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #1e293b;
          outline: none;
        }

        .form-group input:focus {
          border-color: #153f3a;
          box-shadow: 0 0 0 2px rgba(21, 63, 58, 0.15);
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          margin-top: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: #1e293b;
        }

        .modal-footer {
          margin-top: 1.75rem;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .btn-cancel {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit {
          background: #153f3a;
          border: none;
          color: #ffffff;
          padding: 0.5rem 1.25rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit:disabled,
        .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
