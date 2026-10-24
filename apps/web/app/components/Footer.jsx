'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-col">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>PIXEL STORE</span>
              <span style={{ color: '#c0ebe4' }}>•</span>
            </h4>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Specialized computer hardware and enthusiast PC components in Egypt. Genuine retail
              inventory, transparent EGP pricing, and direct order verification via WhatsApp.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '4px'
                }}
              >
                Cairo & Giza Delivery
              </span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '4px'
                }}
              >
                Cash on Delivery
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>Hardware Catalog</h4>
            <ul>
              <li>
                <Link href="/products?category=gpus">Graphics Cards</Link>
              </li>
              <li>
                <Link href="/products?category=cpus">Processors</Link>
              </li>
              <li>
                <Link href="/products?category=motherboards">Motherboards</Link>
              </li>
              <li>
                <Link href="/products?category=ram">Memory & Storage</Link>
              </li>
              <li>
                <Link href="/products?condition=used">Certified Used Hardware</Link>
              </li>
            </ul>
          </div>

          {/* Customer Service & Policies */}
          <div className="footer-col">
            <h4>Customer Support</h4>
            <ul>
              <li>
                <Link href="/about">About Pixel Store</Link>
              </li>
              <li>
                <Link href="/contact">Contact & Store Hours</Link>
              </li>
              <li>
                <Link href="/orders">Order Tracking</Link>
              </li>
              <li>
                <Link href="/shipping-policy">Shipping & Delivery</Link>
              </li>
              <li>
                <Link href="/returns">Returns & Warranties</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of Service</Link>
              </li>
            </ul>
          </div>

          {/* Store Policies & Warranties */}
          <div className="footer-col">
            <h4>Retail Guarantees</h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                fontSize: '0.88rem'
              }}
            >
              <div>
                <strong>Official Distributor Warranty</strong>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: '0.15rem'
                  }}
                >
                  Brand new factory-sealed components backed by authorized agency warranties.
                </p>
              </div>
              <div>
                <strong>14-Day Used Hardware Testing Warranty</strong>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: '0.15rem'
                  }}
                >
                  Every certified used GPU and component is stress-tested prior to dispatch.
                </p>
              </div>
              <div>
                <strong>Parcel Inspection Upon Delivery</strong>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: '0.15rem'
                  }}
                >
                  Inspect serial numbers and package seals before paying the courier.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Pixel Store Egypt. All hardware specifications and prices
            in EGP.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.7)',
              flexWrap: 'wrap'
            }}
          >
            <Link href="/shipping-policy" style={{ color: 'inherit', textDecoration: 'none' }}>
              Shipping
            </Link>
            <span>•</span>
            <Link href="/returns" style={{ color: 'inherit', textDecoration: 'none' }}>
              Returns
            </Link>
            <span>•</span>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
              Privacy
            </Link>
            <span>•</span>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>
              Terms
            </Link>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            Store Hours: Sat – Thu, 10:00 AM – 10:00 PM CLT
          </p>
        </div>
      </div>
    </footer>
  );
}
