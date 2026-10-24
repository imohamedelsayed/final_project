'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

export default function ProductDetailClient({ product }) {
  const { addToCart } = useCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const variants = product.variants || [];
  const currentVariant = variants[selectedVariantIndex] || {};
  const images =
    product.images && product.images.length > 0
      ? product.images
      : [{ id: 'default', image_path: '/hero-showcase.png', alt_text: product.name }];

  const currentImage = images[selectedImageIndex] || images[0];

  const isAvailable = Boolean(currentVariant.is_available);
  const isUsed = product.condition === 'used';
  const durationOfUse = currentVariant.duration_of_use || product.duration_of_use;

  const handleAddToCart = async () => {
    if (!isAvailable || adding || !currentVariant.id) return;
    setAdding(true);
    await addToCart(currentVariant.id, quantity);
    setAdding(false);
  };

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* Breadcrumbs */}
        <div
          style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}
        >
          <Link href="/" style={{ color: 'var(--color-primary)' }}>
            Home
          </Link>
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <Link href="/products" style={{ color: 'var(--color-primary)' }}>
            Hardware
          </Link>
          {product.category?.name && (
            <>
              <span style={{ margin: '0 0.5rem' }}>/</span>
              <Link
                href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                style={{ color: 'var(--color-primary)' }}
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span style={{ margin: '0 0.5rem' }}>/</span>
          <span>{product.name}</span>
        </div>

        {/* Product Details Grid */}
        <div className="detail-grid">
          {/* Left Column: Gallery */}
          <div>
            <div className="gallery-main">
              <img src={currentImage.image_path} alt={currentImage.alt_text || product.name} />
            </div>

            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`gallery-thumb ${selectedImageIndex === idx ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={img.image_path} alt={img.alt_text || ''} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information & Actions */}
          <div className="detail-info">
            {/* Brand & Category */}
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'var(--color-primary)',
                letterSpacing: '0.06em',
                marginBottom: '0.4rem'
              }}
            >
              {product.brand?.name ? `${product.brand.name} • ` : ''}
              {product.category?.name || 'Components'}
            </div>

            {/* Title */}
            <h1 className="detail-title">{product.name}</h1>

            {/* Condition & Stock Badges */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}
            >
              {isUsed ? (
                <span
                  className="badge badge-used"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Certified Used{durationOfUse ? ` (${durationOfUse})` : ''}
                </span>
              ) : (
                <span
                  className="badge badge-new"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Brand New Factory Sealed
                </span>
              )}

              {isAvailable ? (
                <span
                  className="badge badge-stock"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  In Stock
                </span>
              ) : (
                <span
                  className="badge badge-unavailable"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Unavailable
                </span>
              )}
            </div>

            {/* Authoritative Price Box */}
            <div className="detail-price-box">
              <span className="detail-price">{currentVariant.price || product.price}</span>
              <span
                style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-muted)' }}
              >
                EGP
              </span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)',
                  marginLeft: 'auto'
                }}
              >
                All taxes included
              </span>
            </div>

            {/* Variant Selector (if more than 1 variant) */}
            {variants.length > 1 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    marginBottom: '0.5rem'
                  }}
                >
                  Select Model / Variant:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {variants.map((v, idx) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantIndex(idx);
                        setQuantity(1);
                      }}
                      className={`btn ${selectedVariantIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                    >
                      {v.variant_label || v.sku}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart Button */}
            <div
              style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}
            >
              <div className="qty-control" style={{ height: '46px' }}>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !isAvailable}
                >
                  −
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10 || !isAvailable}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, height: '46px', fontSize: '1rem' }}
                disabled={!isAvailable || adding}
                onClick={handleAddToCart}
              >
                {adding ? 'Adding...' : isAvailable ? 'Add to Cart' : 'Currently Unavailable'}
              </button>
            </div>

            {/* Reassurance Box */}
            <div
              style={{
                background: 'var(--color-surface-dim)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.88rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '0.5rem',
                  fontWeight: '700',
                  color: 'var(--color-primary-dark)'
                }}
              >
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
                  style={{ color: 'var(--color-primary)' }}
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Pixel Store Verified Hardware Guarantee</span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                Order with confidence. No advance online payment required. Orders are checked for
                hardware compatibility and approved via direct WhatsApp before courier dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Specifications Section */}
        {product.specifications && product.specifications.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: 'var(--color-primary-dark)',
                marginBottom: '1rem'
              }}
            >
              Technical Specifications
            </h2>
            <table className="specs-table">
              <tbody>
                {product.specifications.map((spec) => (
                  <tr key={spec.id || spec.spec_name}>
                    <td>{spec.spec_name}</td>
                    <td>{spec.spec_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product Description */}
        {product.description && (
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: 'var(--color-primary-dark)',
                marginBottom: '1rem'
              }}
            >
              Overview
            </h2>
            <div
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                border: '1px solid var(--color-border)',
                lineHeight: '1.7',
                color: 'var(--color-text)'
              }}
            >
              <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
