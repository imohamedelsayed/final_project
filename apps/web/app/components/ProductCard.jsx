'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);

  const isAvailable = Boolean(product.is_available);
  const isUsed = product.condition === 'used';
  const imageUrl = product.primary_image?.image_path || '/hero-showcase.png';

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAvailable || adding) return;

    // Use variant ID if available, or product default
    const variantId = product.default_variant?.id || product.variant_id;
    if (!variantId) {
      // If variant ID not on card summary, navigate to detail page
      router.push(`/products/${product.slug}`);
      return;
    }

    setAdding(true);
    await addToCart(variantId, 1);
    setAdding(false);
  };

  return (
    <div className="product-card">
      <Link
        href={`/products/${product.slug}`}
        className="product-card-img-wrap"
        aria-label={product.name}
      >
        {/* Badges */}
        <div className="product-badges">
          {isUsed ? (
            <span className="badge badge-used">
              Certified Used{product.duration_of_use ? ` (${product.duration_of_use})` : ''}
            </span>
          ) : (
            <span className="badge badge-new">Brand New</span>
          )}
          {isAvailable ? (
            <span className="badge badge-stock">In Stock</span>
          ) : (
            <span className="badge badge-unavailable">Unavailable</span>
          )}
        </div>

        {/* Product Image */}
        <img src={imageUrl} alt={product.primary_image?.alt_text || product.name} loading="lazy" />
      </Link>

      <div className="product-card-body">
        {/* Category & Brand */}
        <div className="product-category-brand">
          {product.brand?.name ? `${product.brand.name} / ` : ''}
          {product.category?.name || 'Hardware'}
        </div>

        {/* Title */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="product-title" title={product.name}>
            {product.name}
          </h3>
        </Link>

        {/* Price & Action Footer */}
        <div className="product-card-footer">
          <div>
            <span className="product-price">{product.price}</span>
            <span className="product-price-currency">EGP</span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.84rem' }}
            disabled={!isAvailable || adding}
            onClick={handleAdd}
            aria-label={`Add ${product.name} to cart`}
          >
            {adding ? 'Adding...' : isAvailable ? 'Add to Cart' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}
