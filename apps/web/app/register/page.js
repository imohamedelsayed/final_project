'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await api.register({ name, email, password });
      showToast('Registration successful! Please check your email for the verification code.');
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message || 'Registration failed.');
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
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--color-primary-dark)',
              marginBottom: '0.5rem'
            }}
          >
            Create Account
          </h1>
          <p
            style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}
          >
            Join Pixel Store for persistent carts and fast hardware orders.
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
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.92rem'
                }}
                placeholder="Ahmed Mahmoud"
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
                Password (min 8 characters)
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', height: '44px', marginTop: '0.5rem', fontSize: '0.95rem' }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

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
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: '700' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
