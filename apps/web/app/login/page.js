'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, refreshCart, showToast } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectParam = searchParams.get('redirect');
  const isAdminContext =
    redirectParam?.startsWith('/admin') || searchParams.get('admin') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login({ email, password, totpCode: totpCode.trim() || undefined });
      const user = await refreshUser();
      await refreshCart();

      const isStaff = user && (user.role === 'admin' || user.role === 'super_admin');

      if (isAdminContext && !isStaff) {
        setError('Access denied: Customer accounts do not have staff permissions.');
        setLoading(false);
        return;
      }

      showToast(isStaff ? 'Signed in to Staff Administration' : 'Signed in successfully!');

      let destination;
      if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
        if (redirectParam.startsWith('/admin') && !isStaff) {
          destination = '/orders';
        } else {
          destination = redirectParam;
        }
      } else {
        destination = isStaff ? '/admin/orders' : '/cart';
      }

      router.push(destination);
    } catch (err) {
      if (err.code === 'TOTP_REQUIRED') {
        setTotpRequired(true);
        setError('Staff account requires a 6-digit TOTP code.');
      } else if (err.code === 'EMAIL_UNVERIFIED') {
        setError('Your email is not verified yet.');
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '4rem 0' }}>
      <div className="container" style={{ maxWidth: '440px' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            padding: '2.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          {isAdminContext && (
            <div style={{ marginBottom: '0.75rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: 'var(--color-primary-fixed)',
                  color: 'var(--color-primary-dark)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                Staff Administration • Portal Access
              </span>
            </div>
          )}

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--color-primary-dark)',
              marginBottom: '0.5rem'
            }}
          >
            {isAdminContext ? 'Staff Sign In' : 'Customer Sign In'}
          </h1>
          <p
            style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}
          >
            {isAdminContext
              ? 'Sign in with your administrative credentials to manage store operations.'
              : 'Access your persistent cart and order history.'}
          </p>

          {error && (
            <div
              style={{
                background: '#ffdad6',
                color: '#93000a',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                fontWeight: '500'
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  marginBottom: '0.35rem'
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.92rem'
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  marginBottom: '0.35rem'
                }}
              >
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.92rem'
                }}
                placeholder="••••••••"
              />
            </div>

            {totpRequired && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    marginBottom: '0.35rem'
                  }}
                >
                  6-Digit Staff TOTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.92rem',
                    letterSpacing: '0.2em',
                    textAlign: 'center'
                  }}
                  placeholder="000000"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: '44px', marginTop: '0.5rem', fontSize: '0.95rem' }}
            >
              {loading ? 'Signing in...' : isAdminContext ? 'Sign In to Staff Portal' : 'Sign In'}
            </button>
          </form>

          {isAdminContext ? (
            <div
              style={{
                textAlign: 'center',
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--color-surface-dim)',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
                lineHeight: '1.5'
              }}
            >
              Staff accounts are provisioned by system administrators.
              <div style={{ marginTop: '0.65rem' }}>
                <Link
                  href="/login"
                  style={{
                    color: 'var(--color-primary)',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  ← Return to Customer Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--color-surface-dim)',
                fontSize: '0.88rem',
                color: 'var(--color-text-muted)'
              }}
            >
              Do not have an account?{' '}
              <Link href="/register" style={{ color: 'var(--color-primary)', fontWeight: '700' }}>
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: '5rem 0', textAlign: 'center' }}>Loading sign in...</div>}
    >
      <LoginContent />
    </Suspense>
  );
}
