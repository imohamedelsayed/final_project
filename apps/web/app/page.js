import React from 'react';
import Link from 'next/link';
import { api } from './lib/api';
import ProductCard from './components/ProductCard';
import CategoryBar from './components/CategoryBar';

export const revalidate = 0;

const SHOP_CATEGORIES = [
  {
    name: 'Graphics Cards',
    slug: 'gpus',
    subtitle: 'NVIDIA & AMD Series',
    icon: (
      <svg
        width="28"
        height="28"
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
    subtitle: 'Intel & AMD Sockets',
    icon: (
      <svg
        width="28"
        height="28"
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
    subtitle: 'ATX, mATX & ITX',
    icon: (
      <svg
        width="28"
        height="28"
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
    subtitle: 'DDR4 & DDR5 Kits',
    icon: (
      <svg
        width="28"
        height="28"
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
    subtitle: 'PCIe 4.0 & Gen 5 NVMe',
    icon: (
      <svg
        width="28"
        height="28"
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
    subtitle: '144Hz - 360Hz Displays',
    icon: (
      <svg
        width="28"
        height="28"
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
    subtitle: 'High Airflow & Dual-Chamber',
    icon: (
      <svg
        width="28"
        height="28"
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
    subtitle: 'Gold & Platinum Modular',
    icon: (
      <svg
        width="28"
        height="28"
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

export default async function HomePage() {
  let categories = [];
  let banners = [];
  let featuredProducts = [];
  let latestProducts = [];
  let dealProducts = [];

  try {
    const [catsData, bannersData, featData, latestData, allData] = await Promise.all([
      api.getCategories().catch(() => []),
      api.getBanners().catch(() => []),
      api.getFeaturedProducts().catch(() => []),
      api.getProducts({ pageSize: 4, sort: 'created_at_desc' }).catch(() => ({ items: [] })),
      api.getProducts({ pageSize: 12 }).catch(() => ({ items: [] }))
    ]);

    categories = catsData || [];
    banners = bannersData || [];
    featuredProducts = featData || [];
    latestProducts = latestData?.items || [];

    // Filter real products that carry genuine discounts or promotions without fake urgency
    const items = allData?.items || [];
    dealProducts = items.filter(
      (p) => p.original_price && parseFloat(p.original_price) > parseFloat(p.price || 0)
    );
  } catch (err) {
    console.error('Error fetching homepage data:', err);
  }

  // Map categories to real backend slugs where available
  const resolvedShopCategories = SHOP_CATEGORIES.map((cat) => {
    const match = categories.find(
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
    <>
      {/* 2. HERO SECTION */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">
                <span>Computer Hardware & Enthusiast Electronics • Cairo, Egypt</span>
              </div>
              <h1 className="hero-title">
                Specialized PC Hardware,
                <br />
                Components & Laptops in Egypt
              </h1>
              <p className="hero-description">
                Authorized distributor graphics cards, high-throughput processors, motherboards, and
                inspected certified used hardware with transparent EGP pricing and direct WhatsApp
                order confirmation.
              </p>
              <div className="hero-actions">
                <Link
                  href="/products"
                  className="btn btn-primary"
                  style={{ padding: '0.8rem 1.6rem' }}
                >
                  Browse Hardware Catalog
                </Link>
                <Link
                  href="#deals"
                  className="btn btn-secondary"
                  style={{ padding: '0.8rem 1.6rem' }}
                >
                  View Active Deals
                </Link>
              </div>

              {/* Micro-specs badges */}
              <div className="hero-badges">
                <div className="hero-badge-item">
                  <h4>Official</h4>
                  <p>Distributor Warranty</p>
                </div>
                <div className="hero-badge-item">
                  <h4>14-Day</h4>
                  <p>Tested Used Guarantee</p>
                </div>
                <div className="hero-badge-item">
                  <h4>Nationwide</h4>
                  <p>Cash on Delivery</p>
                </div>
              </div>
            </div>

            {/* Right showcase image - Prominent hardware presence */}
            <div className="hero-image-wrap">
              <img
                src="/hero-showcase.png"
                alt="Gaming PC Hardware Showcase with graphics cards, motherboard, and processors"
                width={840}
                height={420}
                priority="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. HORIZONTAL HARDWARE CATEGORY NAVIGATION STRIP */}
      <CategoryBar categories={categories} />

      {/* 4. LIMITED-TIME DEALS SECTION */}
      <section className="section" id="deals">
        <div className="container">
          <div className="section-header">
            <div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: 'var(--color-discount-red)'
                }}
              >
                Promotion Catalog
              </span>
              <h2 className="section-title">Limited-Time Deals</h2>
              <p className="section-subtitle">
                Special promotional pricing on select enthusiast inventory. Prices in EGP.
              </p>
            </div>
            <Link
              href="/products"
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              View All Promotions
            </Link>
          </div>

          {dealProducts.length > 0 ? (
            <div className="product-grid">
              {dealProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="deals-empty-state">
              <div className="deals-empty-icon" aria-hidden="true">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m10 15 5-3-5-3v6Z" />
                </svg>
              </div>
              <h3 className="deals-empty-title">No Active Promotional Reductions</h3>
              <p className="deals-empty-text">
                All enthusiast components are currently priced at our standard, transparent EGP
                rates. We do not manufacture fake sales or artificial countdowns.
              </p>
              <Link href="/products" className="btn btn-primary">
                Browse Full Hardware Catalog
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 5. SHOP BY CATEGORY SECTION (8 Category Cards) */}
      <section className="section shop-by-category-section" id="categories">
        <div className="container">
          <div className="section-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ maxWidth: '640px' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: 'var(--color-primary)'
                }}
              >
                Structured Catalog
              </span>
              <h2 className="section-title" style={{ marginTop: '0.25rem' }}>
                Shop by Category
              </h2>
              <p className="section-subtitle">
                Select from our 8 verified component sectors designed for system builders and
                gamers.
              </p>
            </div>
          </div>

          <div className="shop-category-grid">
            {resolvedShopCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="shop-category-card"
              >
                <div className="shop-category-icon-wrap" aria-hidden="true">
                  {cat.icon}
                </div>
                <h3 className="shop-category-name">{cat.name}</h3>
                <p className="shop-category-subtitle">{cat.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FEATURED HARDWARE SECTION */}
      <section className="section" id="featured">
        <div className="container">
          <div className="section-header">
            <div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: 'var(--color-primary)'
                }}
              >
                Selected Inventory
              </span>
              <h2 className="section-title">Featured Hardware</h2>
              <p className="section-subtitle">
                Performance components and certified used parts available for immediate order
                verification.
              </p>
            </div>
            <Link
              href="/products"
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              View All Hardware
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="product-grid">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--color-surface)',
                padding: '3rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                border: '1px solid var(--color-border)'
              }}
            >
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Featured components are currently being updated.
              </p>
              <Link href="/products" className="btn btn-primary">
                Browse Full Catalog
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 7. WHATSAPP BUYING PROCESS / ORDERING SECTION */}
      <section style={{ padding: '1rem 0' }}>
        <div className="container">
          <div className="explainer-card">
            <div style={{ maxWidth: '620px' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: 'var(--color-primary-fixed)'
                }}
              >
                Clear Buying Process
              </span>
              <h3
                style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  marginTop: '0.25rem',
                  marginBottom: '0.5rem'
                }}
              >
                Direct WhatsApp Order Verification
              </h3>
              <p
                style={{
                  color: 'var(--color-primary-fixed-dim)',
                  fontSize: '0.95rem',
                  lineHeight: '1.5'
                }}
              >
                High-performance PC hardware requires specialist validation. Here is how your order
                proceeds from cart to your doorstep:
              </p>
            </div>

            <div className="explainer-grid">
              <div className="step-box">
                <span className="step-num">1</span>
                <h4>Build Your Cart</h4>
                <p>Choose genuine new or certified used components with live stock validation.</p>
              </div>
              <div className="step-box">
                <span className="step-num">2</span>
                <h4>Enter Egyptian Address</h4>
                <p>
                  Provide your delivery location in Cairo, Giza, or governorates without card
                  details.
                </p>
              </div>
              <div className="step-box">
                <span className="step-num">3</span>
                <h4>Specialist Verification</h4>
                <p>Our Cairo team reviews compatibility, confirms stock, and finalizes shipping.</p>
              </div>
              <div className="step-box">
                <span className="step-num">4</span>
                <h4>Cash on Delivery</h4>
                <p>Inspect the product seals and package condition at your door before paying.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. LATEST ARRIVALS SECTION */}
      <section className="section" id="latest-arrivals">
        <div className="container">
          <div className="section-header">
            <div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: 'var(--color-primary)'
                }}
              >
                Recent Stock
              </span>
              <h2 className="section-title">Latest Arrivals</h2>
              <p className="section-subtitle">
                Recently stocked gaming components and certified used parts with warranty.
              </p>
            </div>
            <Link
              href="/products?sort=created_at_desc"
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              View Newest Arrivals
            </Link>
          </div>

          {latestProducts.length > 0 ? (
            <div className="product-grid">
              {latestProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--color-surface)',
                padding: '2.5rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                border: '1px solid var(--color-border)'
              }}
            >
              <p style={{ color: 'var(--color-text-muted)' }}>
                No recent arrivals available right now.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 9. OPTIONAL BANNERS CAROUSEL / DISPLAY */}
      {banners.length > 0 && (
        <section style={{ padding: '2rem 0', background: 'var(--color-surface)' }}>
          <div className="container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(banners.length, 3)}, 1fr)`,
                gap: '1rem'
              }}
            >
              {banners.map((b) => (
                <Link
                  key={b.id}
                  href={b.link_url || '/products'}
                  style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'block' }}
                >
                  <img
                    src={b.image_path}
                    alt="Store Promotion Banner"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
