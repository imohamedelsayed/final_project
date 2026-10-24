'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAdmin } from '../layout';

export default function AdminStaffUsersPage() {
  const adminContext = useAdmin();
  const currentUser = adminContext?.user;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(Boolean(isSuperAdmin));
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'admin' | 'super_admin'

  // Create Staff Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit Staff Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('admin');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  // Reset TOTP Modal State
  const [resetTotpModalOpen, setResetTotpModalOpen] = useState(false);
  const [targetTotpUser, setTargetTotpUser] = useState(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState(null);

  // Form IDs
  const createNameId = useId();
  const createEmailId = useId();
  const createPasswordId = useId();
  const createRoleId = useId();
  const editNameId = useId();
  const editRoleId = useId();
  const editActiveCheckboxId = useId();

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    let ignore = false;
    async function loadStaffUsers() {
      try {
        setLoading(true);
        setError(null);
        const users = await api.getAdminStaffUsers();
        if (!ignore) {
          setStaffUsers(users || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load staff accounts.');
          setLoading(false);
        }
      }
    }

    loadStaffUsers();
    return () => {
      ignore = true;
    };
  }, [isSuperAdmin, refreshKey]);

  if (!isSuperAdmin) {
    return (
      <div className="access-denied-screen">
        <div className="access-denied-card">
          <div className="denied-icon">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2>Super Admin Authorization Required</h2>
          <p>
            Staff management and credential administration is strictly restricted to{' '}
            <strong>Super Administrators</strong>.
          </p>
          <div className="user-badge-info">
            <span>
              Signed in as: <strong>{currentUser?.name || currentUser?.email}</strong>
            </span>
            <span className="role-tag">Role: {currentUser?.role || 'admin'}</span>
          </div>
          <Link href="/admin" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
        <style jsx>{`
          .access-denied-screen {
            padding: 3rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
          }
          .access-denied-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 2.5rem;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .denied-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          h2 {
            font-size: 1.4rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 0.5rem 0;
          }
          p {
            color: #64748b;
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 1.5rem;
          }
          .user-badge-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 0.75rem 1rem;
            margin-bottom: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            font-size: 0.85rem;
            color: #475569;
          }
          .role-tag {
            text-transform: uppercase;
            font-weight: 600;
            color: #0d9488;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.65rem 1.5rem;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.9rem;
            text-decoration: none;
            background: #0d9488;
            color: #ffffff;
          }
        `}</style>
      </div>
    );
  }

  // Filter staff users
  const filteredUsers = staffUsers.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  const openCreateModal = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('admin');
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!newName.trim()) {
      setCreateError('Staff full name is required.');
      return;
    }
    if (!newEmail.trim()) {
      setCreateError('Email address is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setCreateError(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.'
      );
      return;
    }

    try {
      setCreateSubmitting(true);
      await api.createAdminStaffUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole
      });
      setActionSuccess(`Staff account for ${newEmail} created successfully.`);
      setCreateModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setCreateError(err.message || 'Failed to create staff account.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditRole(user.role || 'admin');
    setEditIsActive(Boolean(user.is_active));
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    // Self-lockout validation in UI
    const isSelf = currentUser?.id === editingUser.id;
    if (isSelf && !editIsActive) {
      setEditError('You cannot deactivate your own Super Admin account.');
      return;
    }
    if (isSelf && editRole !== 'super_admin') {
      setEditError('You cannot demote your own Super Admin role.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);
      await api.updateAdminStaffUser(editingUser.id, {
        name: editName.trim(),
        role: editRole,
        is_active: Boolean(editIsActive)
      });
      setActionSuccess(`Staff account "${editingUser.email}" updated successfully.`);
      setEditModalOpen(false);
      setEditingUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setEditError(err.message || 'Failed to update staff account.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const openResetTotpModal = (user) => {
    setTargetTotpUser(user);
    setResetError(null);
    setResetTotpModalOpen(true);
  };

  const handleConfirmResetTotp = async () => {
    if (!targetTotpUser) return;
    try {
      setResetSubmitting(true);
      setResetError(null);
      await api.resetAdminStaffTotp(targetTotpUser.id);
      setActionSuccess(
        `2FA TOTP credentials reset for ${targetTotpUser.email}. Staff will enroll on next sign-in.`
      );
      setResetTotpModalOpen(false);
      setTargetTotpUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setResetError(err.message || 'Failed to reset 2FA secret.');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="staff-management">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-text">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span className="separator">/</span>
            <span className="current">Staff Management</span>
          </nav>
          <h1 className="page-title">Staff & Administrative Access</h1>
          <p className="page-subtitle">
            Manage store administrators, role assignments, account statuses, and two-factor TOTP
            security credentials.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            id="create-staff-btn"
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Action Alerts */}
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

      {/* Search & Role Filter Bar */}
      <div className="controls-card">
        <div className="search-box">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="staff-search-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="staff-role-filter" className="filter-label">
            Role:
          </label>
          <select
            id="staff-role-filter"
            className="select-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admins</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading staff users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>No staff accounts found</h3>
            <p>Try adjusting your search filters or add a new staff member.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>2FA / TOTP Security</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="staff-cell">
                          <div className="avatar-circle">
                            {user.name ? user.name.slice(0, 2).toUpperCase() : 'PS'}
                          </div>
                          <div className="staff-meta">
                            <span className="staff-name">
                              {user.name} {isSelf && <span className="self-tag">(You)</span>}
                            </span>
                            <span className="staff-email">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {user.role === 'super_admin' ? (
                          <span className="badge badge-super">Super Admin</span>
                        ) : (
                          <span className="badge badge-admin">Admin</span>
                        )}
                      </td>
                      <td>
                        {user.totp_enabled ? (
                          <span className="badge badge-totp-on">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            TOTP Protected
                          </span>
                        ) : (
                          <span className="badge badge-totp-off">Setup Pending</span>
                        )}
                      </td>
                      <td>
                        {user.is_active ? (
                          <span className="badge badge-active">Active</span>
                        ) : (
                          <span className="badge badge-inactive">Deactivated</span>
                        )}
                      </td>
                      <td>
                        <span className="small text-muted">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          {user.totp_enabled && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="Reset 2FA / TOTP"
                              onClick={() => openResetTotpModal(user)}
                              aria-label="Reset two-factor authentication"
                            >
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
                                <circle cx="8" cy="15" r="4" />
                                <path d="M10.85 12.15L19 4" />
                                <path d="M18 5l2 2" />
                                <path d="M15 8l2 2" />
                              </svg>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit Staff Account"
                            onClick={() => openEditModal(user)}
                            aria-label="Edit staff account"
                          >
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
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
      {createModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Add New Staff Member</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {createError && (
                  <div className="alert alert-danger" role="alert">
                    {createError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor={createNameId} className="form-label">
                    Full Name *
                  </label>
                  <input
                    id={createNameId}
                    type="text"
                    className="form-input"
                    placeholder="e.g. Omar Tarek"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={createEmailId} className="form-label">
                    Work Email *
                  </label>
                  <input
                    id={createEmailId}
                    type="email"
                    className="form-input"
                    placeholder="e.g. omar@pixelstore.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={createPasswordId} className="form-label">
                    Initial Password *
                  </label>
                  <input
                    id={createPasswordId}
                    type="password"
                    className="form-input"
                    placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <small className="form-help">
                    Argon2id password hashing is applied on the server. Never shared or returned in
                    API responses.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor={createRoleId} className="form-label">
                    Role *
                  </label>
                  <select
                    id={createRoleId}
                    className="form-input"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="admin">
                      Administrator (Orders, Catalog, Inventory, Marketing)
                    </option>
                    <option value="super_admin">
                      Super Administrator (Full System & Staff Control)
                    </option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="submit-create-staff-btn"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? 'Creating Account...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editModalOpen && editingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Edit Staff: {editingUser.email}</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setEditModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editError && (
                  <div className="alert alert-danger" role="alert">
                    {editError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor={editNameId} className="form-label">
                    Full Name *
                  </label>
                  <input
                    id={editNameId}
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={editRoleId} className="form-label">
                    Role *
                  </label>
                  <select
                    id={editRoleId}
                    className="form-input"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={currentUser?.id === editingUser.id}
                  >
                    <option value="admin">Administrator</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                  {currentUser?.id === editingUser.id && (
                    <small className="form-help text-warning">
                      You cannot demote your own Super Administrator role.
                    </small>
                  )}
                </div>

                <div className="form-checkbox">
                  <input
                    id={editActiveCheckboxId}
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    disabled={currentUser?.id === editingUser.id}
                  />
                  <label htmlFor={editActiveCheckboxId}>
                    Account Active (Staff member can sign in)
                  </label>
                </div>
                {currentUser?.id === editingUser.id && (
                  <small className="form-help text-warning" style={{ marginTop: '0.25rem' }}>
                    Self-deactivation is prevented to avoid lockout.
                  </small>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="submit-edit-staff-btn"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset TOTP Modal */}
      {resetTotpModalOpen && targetTotpUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h2>Reset 2FA / TOTP Credentials</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setResetTotpModalOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {resetError ? (
                <div className="alert alert-danger" role="alert">
                  {resetError}
                </div>
              ) : (
                <p>
                  Reset two-factor authentication credentials for{' '}
                  <strong>{targetTotpUser.email}</strong>?
                </p>
              )}
              <p className="text-muted small" style={{ marginTop: '0.5rem' }}>
                Use this if the staff member lost access to their authenticator app. Upon their next
                sign-in, they will be prompted to enroll a new TOTP secret.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResetTotpModalOpen(false)}
                disabled={resetSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                id="confirm-reset-totp-btn"
                onClick={handleConfirmResetTotp}
                disabled={resetSubmitting}
              >
                {resetSubmitting ? 'Resetting...' : 'Reset 2FA Secret'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .staff-management {
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

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 260px;
          color: #94a3b8;
        }

        .search-box svg {
          position: absolute;
          left: 0.85rem;
          pointer-events: none;
        }

        .search-box input {
          width: 100%;
          padding: 0.6rem 2.2rem 0.6rem 2.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #f8fafc;
        }

        .search-box input:focus {
          outline: none;
          border-color: #0d9488;
          background: #ffffff;
        }

        .clear-search {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          font-size: 1.2rem;
          color: #94a3b8;
          cursor: pointer;
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

        .staff-cell {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .avatar-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #0d9488;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .staff-meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .staff-name {
          font-weight: 600;
          color: #0f172a;
        }

        .self-tag {
          font-size: 0.75rem;
          color: #0d9488;
          font-weight: 600;
        }

        .staff-email {
          font-size: 0.8rem;
          color: #64748b;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-super {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .badge-admin {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .badge-totp-on {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .badge-totp-off {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fef3c7;
        }

        .badge-active {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-inactive {
          background: #fee2e2;
          color: #b91c1c;
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
          border: 1px solid #e2e8f0;
          width: 100%;
          max-width: 540px;
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

        .form-input:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .form-help {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.3rem;
        }

        .text-warning {
          color: #d97706;
        }

        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: #1e293b;
          margin-top: 0.5rem;
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
