'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useCart();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.verifyEmail({ email, code: code.trim() });
      showToast('Email verified successfully! You can now sign in.');
      router.push('/login');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please provide your email address.');
      return;
    }
    setError('');
    setMessage('');
    setResending(true);

    try {
      await api.resendVerification({ email });
      setMessage('A new 6-digit verification code has been dispatched to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
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
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--color-primary-dark)',
              marginBottom: '0.5rem'
            }}
          >
            Verify Your Email
          </h1>
          <p
            style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}
          >
            Enter the 6-digit code sent to your email to activate your customer account.
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

          {message && (
            <div
              style={{
                background: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                fontWeight: '500'
              }}
            >
              {message}
            </div>
          )}

          <form
            onSubmit={handleVerify}
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
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '1.1rem',
                  letterSpacing: '0.25em',
                  textAlign: 'center',
                  fontWeight: '700'
                }}
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: '44px', marginTop: '0.5rem', fontSize: '0.95rem' }}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-surface-dim)',
              fontSize: '0.88rem'
            }}
          >
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
            <Link href="/login" style={{ color: 'var(--color-text-muted)' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '5rem 0', textAlign: 'center' }}>Loading verification...</div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
