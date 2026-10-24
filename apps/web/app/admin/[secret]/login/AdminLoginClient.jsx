'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { useCart } from '../../../context/CartContext';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, showToast } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectParam = searchParams.get('redirect');
  const targetDestination =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/admin/orders';

  // Check if already authenticated as staff
  useEffect(() => {
    let ignore = false;
    async function checkExistingAuth() {
      try {
        const me = await api.getMe();
        if (!ignore && me && (me.role === 'admin' || me.role === 'super_admin')) {
          router.replace(targetDestination);
        }
      } catch {
        // Not authenticated
      }
    }
    checkExistingAuth();
    return () => {
      ignore = true;
    };
  }, [router, targetDestination]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.adminLogin({ email, password, totpCode: totpCode.trim() || undefined });
      const user = await refreshUser();

      const isStaff = user && (user.role === 'admin' || user.role === 'super_admin');
      if (!isStaff) {
        setError('Access denied: Customer accounts do not have staff permissions.');
        setLoading(false);
        return;
      }

      showToast('Signed in to Staff Administration');
      router.push(targetDestination);
    } catch (err) {
      if (err.code === 'TOTP_REQUIRED') {
        setTotpRequired(true);
        setError('Staff account requires a 6-digit TOTP verification code.');
      } else if (err.code === 'EMAIL_UNVERIFIED') {
        setError('Your staff email address is not verified yet.');
      } else if (err.code === 'FORBIDDEN') {
        setError(err.message || 'Access denied: Staff credentials required.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '4rem 0', background: 'var(--color-background)', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '460px' }}>
        <div
          style={{
            background: 'var(--color-surface)',
            padding: '2.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {/* Badge */}
          <div style={{ marginBottom: '1rem' }}>
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
              Staff Administration • Secure Portal
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--color-primary-dark)',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}
          >
            Staff Sign In
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              marginBottom: '1.75rem',
              lineHeight: '1.45'
            }}
          >
            Sign in with administrative credentials to access order processing and store operations.
          </p>

          {error && (
            <div
              style={{
                background: '#ffdad6',
                color: '#93000a',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                marginBottom: '1.5rem',
                fontWeight: '500',
                lineHeight: '1.4'
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div>
              <label
                htmlFor="staff-email"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text)'
                }}
              >
                Staff Email Address
              </label>
              <input
                id="staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.92rem',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
                placeholder="admin@pixelstore.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="staff-password"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  marginBottom: '0.35rem',
                  color: 'var(--color-text)'
                }}
              >
                Password
              </label>
              <input
                id="staff-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.92rem',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {(totpRequired || totpCode) && (
              <div>
                <label
                  htmlFor="staff-totp"
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    marginBottom: '0.35rem',
                    color: 'var(--color-text)'
                  }}
                >
                  6-Digit Staff TOTP Code
                </label>
                <input
                  id="staff-totp"
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '1rem',
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                    fontWeight: '600'
                  }}
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.3rem'
                  }}
                >
                  Enter the 6-digit verification code from your authenticator app.
                </span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                height: '46px',
                marginTop: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600'
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Staff Portal'}
            </button>
          </form>

          {/* Footer Navigation */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)',
              lineHeight: '1.5'
            }}
          >
            Staff credentials are provisioned by system administrators.
            <div style={{ marginTop: '0.65rem' }}>
              <Link
                href="/"
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                ← Return to Storefront
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginClient() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '6rem 0', textAlign: 'center' }}>
          Loading staff administration portal...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
