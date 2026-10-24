'use client';

import React, { useState, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [filterPublished, setFilterPublished] = useState(''); // '' | 'true' | 'false'
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form Fields
  const [imagePath, setImagePath] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fileInputRef = useRef(null);

  // Unique accessible IDs
  const linkUrlInputId = useId();
  const sortOrderInputId = useId();
  const publishedCheckboxId = useId();
  const fileInputId = useId();

  useEffect(() => {
    let ignore = false;
    async function loadBanners() {
      try {
        setLoading(true);
        setError(null);
        const params = { pageSize: 50 };
        if (filterPublished) {
          params.is_published = filterPublished;
        }

        const res = await api.getAdminBanners(params);
        if (!ignore) {
          setBanners(res.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load promotional banners.');
          setLoading(false);
        }
      }
    }

    loadBanners();
    return () => {
      ignore = true;
    };
  }, [filterPublished, refreshKey]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setImagePath('');
    setLinkUrl('');
    setSortOrder('0');
    setIsPublished(true);
    setSelectedFile(null);
    setFilePreview('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setImagePath(banner.image_path || '');
    setLinkUrl(banner.link_url || '');
    setSortOrder(banner.sort_order !== undefined ? String(banner.sort_order) : '0');
    setIsPublished(Boolean(banner.is_published));
    setSelectedFile(null);
    setFilePreview(banner.image_path || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormError('Only JPG, PNG, and WebP images are supported.');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setFilePreview(url);
      setFormError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    try {
      setFormSubmitting(true);
      let uploadedImagePath = imagePath;

      // If a new file is selected, upload it via standalone media upload
      if (selectedFile) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('directory', 'banners');

        const uploadRes = await api.uploadStandaloneMedia(formData);
        if (!uploadRes?.image_path) {
          throw new Error('Image upload failed: no file path returned.');
        }
        uploadedImagePath = uploadRes.image_path;
      }

      if (!uploadedImagePath) {
        setFormError('Please select a promotional banner image.');
        setFormSubmitting(false);
        return;
      }

      const numOrder = parseInt(sortOrder, 10) || 0;

      if (editingBanner) {
        await api.updateAdminBanner(editingBanner.id, {
          image_path: uploadedImagePath,
          link_url: linkUrl.trim() || null,
          sort_order: numOrder,
          is_published: Boolean(isPublished)
        });
        setActionSuccess('Promotional banner updated successfully.');
      } else {
        await api.createAdminBanner({
          image_path: uploadedImagePath,
          link_url: linkUrl.trim() || null,
          sort_order: numOrder,
          is_published: Boolean(isPublished)
        });
        setActionSuccess('Promotional banner created successfully.');
      }

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFormError(err.message || 'Failed to save promotional banner.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTogglePublish = async (banner) => {
    try {
      await api.updateAdminBanner(banner.id, { is_published: !banner.is_published });
      setActionSuccess(`Banner ${banner.is_published ? 'unpublished' : 'published'} successfully.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Failed to update banner publish state.');
    }
  };

  const openDeleteModal = (banner) => {
    setDeletingBanner(banner);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBanner) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await api.deleteAdminBanner(deletingBanner.id);
      setActionSuccess('Promotional banner deleted successfully.');
      setDeleteModalOpen(false);
      setDeletingBanner(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete banner.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="banners-management">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-text">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span className="separator">/</span>
            <span className="current">Banners</span>
          </nav>
          <h1 className="page-title">Hero & Promotional Banners</h1>
          <p className="page-subtitle">
            Configure homepage slider banners, destination promotional landing pages, and display
            priority.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            id="create-banner-btn"
            onClick={openCreateModal}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Banner
          </button>
        </div>
      </div>

      {/* Action Banners */}
      {actionSuccess && (
        <div className="alert alert-success" role="status">
          <span>{actionSuccess}</span>
          <button
            type="button"
            className="close-btn"
            onClick={() => setActionSuccess(null)}
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

      {/* Filter Bar */}
      <div className="controls-card">
        <div className="filter-group">
          <label htmlFor="banner-status-filter" className="filter-label">
            Visibility:
          </label>
          <select
            id="banner-status-filter"
            className="select-input"
            value={filterPublished}
            onChange={(e) => setFilterPublished(e.target.value)}
          >
            <option value="">All Banners</option>
            <option value="true">Published Only</option>
            <option value="false">Draft / Unpublished</option>
          </select>
        </div>
        <span className="text-muted small">
          Display order: Lower sort order numbers appear first on the homepage.
        </span>
      </div>

      {/* Banners List / Grid */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3>No promotional banners found</h3>
            <p>Upload a banner image to showcase hardware deals on the storefront hero section.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Banner Preview</th>
                  <th>Destination URL</th>
                  <th>Sort Order</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id}>
                    <td>
                      <div className="banner-preview-cell">
                        {banner.image_path ? (
                          <img
                            src={banner.image_path}
                            alt="Banner preview"
                            className="banner-thumbnail"
                          />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        <span className="image-filename" title={banner.image_path}>
                          {banner.image_path ? banner.image_path.split('/').pop() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {banner.link_url ? (
                        <a
                          href={banner.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-badge"
                        >
                          {banner.link_url} ↗
                        </a>
                      ) : (
                        <span className="text-muted">None (Static Display)</span>
                      )}
                    </td>
                    <td>
                      <span className="order-pill">{banner.sort_order}</span>
                    </td>
                    <td>
                      {banner.is_published ? (
                        <span className="badge badge-active">Published</span>
                      ) : (
                        <span className="badge badge-inactive">Draft</span>
                      )}
                    </td>
                    <td>
                      <span className="small text-muted">
                        {banner.created_at
                          ? new Date(banner.created_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn-icon"
                          title={banner.is_published ? 'Unpublish Banner' : 'Publish Banner'}
                          onClick={() => handleTogglePublish(banner)}
                          aria-label={banner.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {banner.is_published ? (
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          ) : (
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Edit Banner"
                          onClick={() => openEditModal(banner)}
                          aria-label="Edit Banner"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          title="Delete Banner"
                          onClick={() => openDeleteModal(banner)}
                          aria-label="Delete Banner"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingBanner ? 'Edit Promotional Banner' : 'Add Promotional Banner'}</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                  </div>
                )}

                {/* Image Selection / Preview */}
                <div className="form-group">
                  <label className="form-label">Banner Image *</label>
                  <div className="image-upload-zone">
                    {filePreview ? (
                      <div className="preview-container">
                        <img src={filePreview} alt="Preview" className="modal-preview-img" />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedFile(null);
                            setFilePreview('');
                            setImagePath('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          Change Image
                        </button>
                      </div>
                    ) : (
                      <div
                        className="upload-dropzone"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <p>Click to select banner graphic</p>
                        <span className="small text-muted">
                          Supports WebP, PNG, JPG (1920x600 recommended)
                        </span>
                      </div>
                    )}
                    <input
                      id={fileInputId}
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor={linkUrlInputId} className="form-label">
                    Destination Link URL (Optional)
                  </label>
                  <input
                    id={linkUrlInputId}
                    type="text"
                    className="form-input"
                    placeholder="e.g. /products?category=gpus or /products/rtx-4070-super"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                  <small className="form-help">
                    Where customers are directed when clicking the banner.
                  </small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={sortOrderInputId} className="form-label">
                      Sort Order
                    </label>
                    <input
                      id={sortOrderInputId}
                      type="number"
                      step="1"
                      className="form-input"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    />
                    <small className="form-help">0 is first, higher numbers display later.</small>
                  </div>
                  <div
                    className="form-group"
                    style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}
                  >
                    <div className="form-checkbox">
                      <input
                        id={publishedCheckboxId}
                        type="checkbox"
                        checked={isPublished}
                        onChange={(e) => setIsPublished(e.target.checked)}
                      />
                      <label htmlFor={publishedCheckboxId}>Published on Storefront</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="submit-banner-btn"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? 'Uploading & Saving...'
                    : editingBanner
                      ? 'Update Banner'
                      : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingBanner && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h2>Confirm Deletion</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setDeleteModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {deleteError ? (
                <div className="alert alert-danger" role="alert">
                  {deleteError}
                </div>
              ) : (
                <p>Are you sure you want to permanently delete this promotional banner?</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                id="confirm-delete-banner-btn"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete Banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .banners-management {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
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
          color: #0d9488;
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

        .controls-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .filter-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #475569;
        }

        .select-input {
          padding: 0.55rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          font-size: 0.88rem;
          color: #0f172a;
          cursor: pointer;
        }

        .select-input:focus {
          outline: none;
          border-color: #0d9488;
        }

        .table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .data-table th {
          background: #f8fafc;
          padding: 0.85rem 1rem;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          color: #1e293b;
        }

        .data-table tr:hover td {
          background: #f8fafc;
        }

        .banner-preview-cell {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .banner-thumbnail {
          width: 140px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
        }

        .no-image {
          width: 140px;
          height: 60px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: #94a3b8;
          border-radius: 4px;
        }

        .image-filename {
          font-size: 0.8rem;
          color: #64748b;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .link-badge {
          display: inline-block;
          font-size: 0.82rem;
          color: #0d9488;
          text-decoration: none;
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .link-badge:hover {
          text-decoration: underline;
        }

        .order-pill {
          background: #f1f5f9;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.82rem;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-active {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
        }

        .btn-icon {
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.35rem 0.5rem;
          cursor: pointer;
          font-size: 0.95rem;
          color: #475569;
          transition: all 0.15s;
        }

        .btn-icon:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .btn-icon-danger:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .text-right {
          text-align: right;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 6px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }

        .btn-sm {
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
        }

        .btn-primary {
          background: #0d9488;
          color: #ffffff;
        }

        .btn-primary:hover {
          background: #0f766e;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .btn-danger {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-danger:hover {
          background: #b91c1c;
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

        .close-btn:hover {
          opacity: 1;
        }

        .loading-state,
        .empty-state {
          padding: 3.5rem 1.5rem;
          text-align: center;
          color: #64748b;
        }

        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }

        .empty-state h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
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

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(18, 30, 27, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }

        .modal-card {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
        }

        .modal-sm {
          max-width: 440px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.35rem;
        }

        .form-input {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #ffffff;
        }

        .form-input:focus {
          outline: none;
          border-color: #0d9488;
        }

        .form-help {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.3rem;
        }

        .image-upload-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 1rem;
          background: #f8fafc;
        }

        .upload-dropzone {
          text-align: center;
          padding: 1.5rem;
          cursor: pointer;
          color: #475569;
        }

        .upload-dropzone svg {
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .preview-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .modal-preview-img {
          width: 100%;
          max-height: 180px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: #1e293b;
        }

        .form-checkbox input {
          width: 17px;
          height: 17px;
          cursor: pointer;
        }

        .form-checkbox label {
          cursor: pointer;
        }

        .small {
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
