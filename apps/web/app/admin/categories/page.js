'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'true' | 'false'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Unique accessible IDs for form fields
  const nameInputId = useId();
  const slugInputId = useId();
  const parentSelectId = useId();
  const sortOrderInputId = useId();
  const activeCheckboxId = useId();

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadCategories() {
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.is_active = statusFilter;

        const res = await api.getAdminCategories(params);
        if (!ignore) {
          setCategories(res.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load categories.');
          setLoading(false);
        }
      }
    }

    loadCategories();
    return () => {
      ignore = true;
    };
  }, [search, statusFilter, refreshKey]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setParentId('');
    setSortOrder('0');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setSlug(cat.slug || '');
    setParentId(cat.parent_id || '');
    setSortOrder(String(cat.sort_order ?? 0));
    setIsActive(cat.is_active ?? true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!editingCategory && (!slug || slug === generateSlug(name))) {
      setSlug(generateSlug(val));
    }
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload = {
        name: name.trim(),
        slug: slug.trim() ? slug.trim() : undefined,
        parent_id: parentId ? parentId : null,
        sort_order: parseInt(sortOrder, 10) || 0,
        is_active: Boolean(isActive)
      };

      if (editingCategory) {
        if (payload.parent_id === editingCategory.id) {
          setFormError('A category cannot be its own parent.');
          setFormSubmitting(false);
          return;
        }
        await api.updateAdminCategory(editingCategory.id, payload);
        setActionSuccess(`Category "${payload.name}" updated successfully.`);
      } else {
        await api.createAdminCategory(payload);
        setActionSuccess(`Category "${payload.name}" created successfully.`);
      }

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(err.message || 'Failed to save category.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    const confirmMsg = `Are you sure you want to delete or deactivate category "${cat.name}"?\nIf it has subcategories or products, it will be safely deactivated to preserve data integrity.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setError(null);
      const res = await api.deleteAdminCategory(cat.id);
      setActionSuccess(res?.message || `Category "${cat.name}" was processed successfully.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
    }
  };

  // Build parent lookup map
  const categoryMap = {};
  categories.forEach((c) => {
    categoryMap[c.id] = c.name;
  });

  return (
    <div className="admin-categories-page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb-nav">
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Categories</span>
          </div>
          <h1>Category Taxonomy</h1>
          <p>Organize PC hardware categories, parent-child hierarchies, and display sort order.</p>
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
          <span>Add Category</span>
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
            placeholder="Search categories by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-search">
            Search
          </button>
        </form>

        <div className="filter-tabs">
          {[
            { id: '', label: 'All Categories' },
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

      {/* Categories Table */}
      <div className="table-card">
        {loading ? (
          <div className="table-loading">
            <div className="spinner" />
            <p>Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="empty-table-state">
            <p>No categories found matching your criteria.</p>
            <button type="button" className="btn-secondary" onClick={openCreateModal}>
              Create First Category
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>URL Slug</th>
                  <th>Parent Category</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <div className="category-name-cell">
                        <strong>{cat.name}</strong>
                      </div>
                    </td>
                    <td>
                      <code className="slug-tag">/{cat.slug}</code>
                    </td>
                    <td>
                      {cat.parent_id ? (
                        <span className="parent-tag">
                          {cat.parent?.name || categoryMap[cat.parent_id] || 'Parent'}
                        </span>
                      ) : (
                        <span className="root-tag">Root</span>
                      )}
                    </td>
                    <td>
                      <span className="sort-order-text">{cat.sort_order ?? 0}</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${cat.is_active ? 'pill-active' : 'pill-inactive'}`}
                      >
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-action edit"
                          onClick={() => openEditModal(cat)}
                          title="Edit Category"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action danger"
                          onClick={() => handleDelete(cat)}
                          title="Delete or Deactivate Category"
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
              <h3>{editingCategory ? 'Edit Category' : 'Create New Category'}</h3>
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
                <label htmlFor={nameInputId}>
                  Category Name <span className="req">*</span>
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  required
                  placeholder="e.g. Graphics Cards, Processors"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="form-group">
                <label htmlFor={slugInputId}>
                  URL Slug <span className="opt">(auto-generated if empty)</span>
                </label>
                <input
                  id={slugInputId}
                  type="text"
                  placeholder="e.g. graphics-cards"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  maxLength={150}
                />
              </div>

              <div className="form-group">
                <label htmlFor={parentSelectId}>
                  Parent Category <span className="opt">(optional for subcategories)</span>
                </label>
                <select
                  id={parentSelectId}
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (/{c.slug})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={sortOrderInputId}>Sort Order</label>
                  <input
                    id={sortOrderInputId}
                    type="number"
                    min="0"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label htmlFor={activeCheckboxId} className="checkbox-label">
                    <input
                      id={activeCheckboxId}
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Category is Active</span>
                  </label>
                </div>
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
                  {formSubmitting
                    ? 'Saving...'
                    : editingCategory
                      ? 'Save Changes'
                      : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-categories-page {
          max-width: 1300px;
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
          border-radius: 8px;
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

        .categories-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .categories-table th {
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

        .categories-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .categories-table tr:hover td {
          background: #fbfcfe;
        }

        .category-name-cell strong {
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

        .parent-tag {
          font-size: 0.75rem;
          color: #0369a1;
          background: #e0f2fe;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
        }

        .root-tag {
          font-size: 0.75rem;
          color: #64748b;
          font-style: italic;
        }

        .sort-order-text {
          font-weight: 600;
          color: #334155;
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
          max-width: 500px;
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

        .form-group input[type='text'],
        .form-group input[type='number'],
        .form-group select {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #1e293b;
          outline: none;
        }

        .form-group input:focus,
        .form-group select:focus {
          border-color: #153f3a;
          box-shadow: 0 0 0 2px rgba(21, 63, 58, 0.15);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          align-items: center;
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
