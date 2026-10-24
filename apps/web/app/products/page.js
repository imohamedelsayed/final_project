import React from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';
import ProductSortSelect from './ProductSortSelect';

export const revalidate = 0;

export default async function ProductsPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page, 10) || 1;
  const q = resolvedParams.q || '';
  const category = resolvedParams.category || '';
  const brand = resolvedParams.brand || '';
  const condition = resolvedParams.condition || '';
  const availability = resolvedParams.availability || '';
  const sort = resolvedParams.sort || 'created_at_desc';
  const minPrice = resolvedParams.minPrice || '';
  const maxPrice = resolvedParams.maxPrice || '';

  let products = [];
  let pagination = { page: 1, pageSize: 20, total: 0, totalPages: 1 };
  let categories = [];
  let brands = [];

  try {
    const [prodData, catData, brandData] = await Promise.all([
      api
        .getProducts({
          page,
          q,
          category,
          brand,
          condition,
          availability,
          sort,
          minPrice,
          maxPrice
        })
        .catch(() => ({
          items: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 }
        })),
      api.getCategories().catch(() => []),
      api.getBrands().catch(() => [])
    ]);

    products = prodData.items || [];
    pagination = prodData.pagination;
    categories = catData || [];
    brands = brandData || [];
  } catch (err) {
    console.error('Error fetching catalog data:', err);
  }

  // Helper to build filter query string
  const createQueryUrl = (updates) => {
    const params = new URLSearchParams();
    const current = {
      q,
      category,
      brand,
      condition,
      availability,
      sort,
      minPrice,
      maxPrice,
      page: 1,
      ...updates
    };
    for (const [k, v] of Object.entries(current)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, v);
      }
    }
    return `/products?${params.toString()}`;
  };

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* Header Breadcrumb & Toolbar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.88rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.5rem'
            }}
          >
            <Link href="/" style={{ color: 'var(--color-primary)' }}>
              Home
            </Link>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <span>Hardware Catalog</span>
            {q && (
              <>
                <span style={{ margin: '0 0.5rem' }}>/</span>
                <span>Search: &ldquo;{q}&rdquo;</span>
              </>
            )}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
            All Hardware & Components
          </h1>
        </div>

        {/* Catalog Layout: Sidebar + Product Grid */}
        <div className="catalog-layout">
          {/* Sidebar Filters */}
          <aside className="filter-sidebar">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem'
              }}
            >
              <span
                style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-primary-dark)' }}
              >
                Filters
              </span>
              {(category || brand || condition || availability || minPrice || maxPrice || q) && (
                <Link
                  href="/products"
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-discount-red)',
                    fontWeight: '600'
                  }}
                >
                  Clear All
                </Link>
              )}
            </div>

            {/* Availability Filter */}
            <div className="filter-section">
              <h4 className="filter-title">Availability</h4>
              <div className="filter-options">
                <Link
                  href={createQueryUrl({
                    availability: availability === 'in_stock' ? '' : 'in_stock'
                  })}
                  className="filter-label"
                >
                  <input
                    type="checkbox"
                    checked={availability === 'in_stock'}
                    readOnly
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span>In Stock Only</span>
                </Link>
              </div>
            </div>

            {/* Condition Filter */}
            <div className="filter-section">
              <h4 className="filter-title">Condition</h4>
              <div className="filter-options">
                <Link
                  href={createQueryUrl({ condition: '' })}
                  className="filter-label"
                  style={{ fontWeight: !condition ? '700' : '400' }}
                >
                  <span>All Conditions</span>
                </Link>
                <Link
                  href={createQueryUrl({ condition: 'new' })}
                  className="filter-label"
                  style={{ fontWeight: condition === 'new' ? '700' : '400' }}
                >
                  <span>New Only</span>
                </Link>
                <Link
                  href={createQueryUrl({ condition: 'used' })}
                  className="filter-label"
                  style={{ fontWeight: condition === 'used' ? '700' : '400' }}
                >
                  <span>Certified Used</span>
                </Link>
              </div>
            </div>

            {/* Categories Filter */}
            {categories.length > 0 && (
              <div className="filter-section">
                <h4 className="filter-title">Category</h4>
                <div className="filter-options">
                  <Link
                    href={createQueryUrl({ category: '' })}
                    className="filter-label"
                    style={{ fontWeight: !category ? '700' : '400' }}
                  >
                    <span>All Categories</span>
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={createQueryUrl({ category: c.slug })}
                      className="filter-label"
                      style={{
                        fontWeight: category === c.slug ? '700' : '400',
                        color: category === c.slug ? 'var(--color-primary)' : 'inherit'
                      }}
                    >
                      <span>{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Brands Filter */}
            {brands.length > 0 && (
              <div className="filter-section">
                <h4 className="filter-title">Brand</h4>
                <div className="filter-options">
                  <Link
                    href={createQueryUrl({ brand: '' })}
                    className="filter-label"
                    style={{ fontWeight: !brand ? '700' : '400' }}
                  >
                    <span>All Brands</span>
                  </Link>
                  {brands.map((b) => (
                    <Link
                      key={b.id}
                      href={createQueryUrl({ brand: b.slug })}
                      className="filter-label"
                      style={{
                        fontWeight: brand === b.slug ? '700' : '400',
                        color: brand === b.slug ? 'var(--color-primary)' : 'inherit'
                      }}
                    >
                      <span>{b.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Price Filter Form */}
            <div className="filter-section">
              <h4 className="filter-title">Price Range (EGP)</h4>
              <form
                action="/products"
                method="GET"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              >
                {category && <input type="hidden" name="category" value={category} />}
                {brand && <input type="hidden" name="brand" value={brand} />}
                {condition && <input type="hidden" name="condition" value={condition} />}
                {availability && <input type="hidden" name="availability" value={availability} />}
                {sort && <input type="hidden" name="sort" value={sort} />}
                {q && <input type="hidden" name="q" value={q} />}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    name="minPrice"
                    placeholder="Min"
                    defaultValue={minPrice}
                    style={{
                      width: '50%',
                      padding: '0.4rem 0.6rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem'
                    }}
                  />
                  <input
                    type="number"
                    name="maxPrice"
                    placeholder="Max"
                    defaultValue={maxPrice}
                    style={{
                      width: '50%',
                      padding: '0.4rem 0.6rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem', fontSize: '0.82rem' }}
                >
                  Apply Price
                </button>
              </form>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div>
            {/* Toolbar: Results Count and Sort */}
            <div className="catalog-toolbar">
              <span style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)' }}>
                Showing <strong>{products.length}</strong> of <strong>{pagination.total}</strong>{' '}
                products
              </span>

              {/* Sort Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>Sort by:</span>
                <ProductSortSelect
                  currentSortUrl={createQueryUrl({ sort })}
                  options={[
                    { label: 'Newest First', url: createQueryUrl({ sort: 'created_at_desc' }) },
                    { label: 'Price: Low to High', url: createQueryUrl({ sort: 'price_asc' }) },
                    { label: 'Price: High to Low', url: createQueryUrl({ sort: 'price_desc' }) },
                    { label: 'Name: A to Z', url: createQueryUrl({ sort: 'name_asc' }) }
                  ]}
                />
              </div>
            </div>

            {/* Product Cards */}
            {products.length > 0 ? (
              <div className="product-grid">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--color-surface)',
                  padding: '3.5rem',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  border: '1px solid var(--color-border)'
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  No products found
                </h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                  No hardware matches your active filters or search terms.
                </p>
                <Link href="/products" className="btn btn-primary">
                  Clear Filters
                </Link>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                {pagination.page > 1 && (
                  <Link href={createQueryUrl({ page: pagination.page - 1 })} className="page-btn">
                    Previous
                  </Link>
                )}
                <span
                  style={{
                    padding: '0 0.75rem',
                    fontSize: '0.9rem',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  Page <strong>{pagination.page}</strong> of{' '}
                  <strong>{pagination.totalPages}</strong>
                </span>
                {pagination.page < pagination.totalPages && (
                  <Link href={createQueryUrl({ page: pagination.page + 1 })} className="page-btn">
                    Next
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
