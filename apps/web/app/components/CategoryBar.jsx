'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const HARDWARE_CATEGORIES = [
  {
    name: 'Graphics Cards',
    slug: 'gpus',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="8" cy="12" r="2.5" />
        <circle cx="16" cy="12" r="2.5" />
        <line x1="12" y1="6" x2="12" y2="9" />
        <line x1="12" y1="15" x2="12" y2="18" />
      </svg>
    )
  },
  {
    name: 'Processors',
    slug: 'cpus',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="5" y="5" width="14" height="14" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="15" x2="4" y2="15" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="15" x2="23" y2="15" />
      </svg>
    )
  },
  {
    name: 'Motherboards',
    slug: 'motherboards',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect x="6" y="6" width="5" height="5" />
        <rect x="14" y="6" width="4" height="2" />
        <rect x="14" y="10" width="4" height="2" />
        <line x1="6" y1="15" x2="10" y2="15" />
        <line x1="6" y1="18" x2="12" y2="18" />
        <circle cx="16" cy="16" r="1.5" />
      </svg>
    )
  },
  {
    name: 'RAM',
    slug: 'ram',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="8" width="20" height="8" rx="1" />
        <line x1="6" y1="16" x2="6" y2="18" />
        <line x1="9" y1="16" x2="9" y2="18" />
        <line x1="12" y1="16" x2="12" y2="18" />
        <line x1="15" y1="16" x2="15" y2="18" />
        <line x1="18" y1="16" x2="18" y2="18" />
        <rect x="5" y="10" width="3" height="3" />
        <rect x="10" y="10" width="3" height="3" />
        <rect x="15" y="10" width="3" height="3" />
      </svg>
    )
  },
  {
    name: 'Storage',
    slug: 'storage',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="3" y1="14" x2="21" y2="14" />
        <circle cx="7" cy="17" r="1" />
        <circle cx="11" cy="17" r="1" />
      </svg>
    )
  },
  {
    name: 'Monitors',
    slug: 'monitors',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  },
  {
    name: 'PC Cases',
    slug: 'pc-cases',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="5" r="1" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    )
  },
  {
    name: 'Power Supplies',
    slug: 'power-supplies',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="10" cy="12" r="3.5" />
        <line x1="17" y1="8" x2="17" y2="10" />
        <line x1="17" y1="14" x2="17" y2="16" />
      </svg>
    )
  }
];

export default function CategoryBar({ categories = [] }) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams ? searchParams.get('category') : null;

  const resolvedCategories = HARDWARE_CATEGORIES.map((cat) => {
    const match = (categories || []).find(
      (c) =>
        c.slug?.toLowerCase() === cat.slug.toLowerCase() ||
        c.name?.toLowerCase() === cat.name.toLowerCase()
    );
    return {
      ...cat,
      slug: match?.slug || cat.slug,
      name: match?.name || cat.name
    };
  });

  return (
    <nav className="category-strip-container" aria-label="Hardware Category Navigation">
      <div className="container">
        <div className="category-strip">
          {resolvedCategories.map((cat) => {
            const isActive =
              activeCategory === cat.slug ||
              (cat.slug === 'gpus' && activeCategory === 'graphics-cards') ||
              (cat.slug === 'cpus' && activeCategory === 'processors');

            return (
              <Link
                key={cat.slug}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className={`category-strip-item ${isActive ? 'active' : ''}`}
              >
                <span className="category-strip-icon">{cat.icon}</span>
                <span className="category-strip-label">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
