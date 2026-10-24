import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'About Us | Pixel Store Egypt',
  description:
    'Learn about Pixel Store Egypt, our commitment to genuine enthusiast PC hardware, authorized agency warranties, and certified used components.'
};

export default function AboutPage() {
  return (
    <div className="policy-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">About Us</span>
        </nav>

        <header className="page-header">
          <span className="badge-category">Specialist Retailer</span>
          <h1 className="page-title">Dedicated Enthusiast PC Hardware in Egypt</h1>
          <p className="page-lead">
            Pixel Store is an independent computer hardware retailer focused on delivering authentic
            gaming components, transparent Egyptian Pound (EGP) pricing, and direct human-guided
            order verification.
          </p>
        </header>

        <div className="content-grid">
          <section className="content-card">
            <h2>Our Purpose</h2>
            <p>
              Navigating the PC hardware market in Egypt often means dealing with unpredictable
              pricing, uncertain warranty backing, and gray-market components. Pixel Store was built
              to provide enthusiasts, content creators, and competitive gamers with a
              straightforward, reliable buying experience backed by genuine hardware inventory.
            </p>
            <p>
              We operate exclusively with Cash on Delivery (COD) and manual WhatsApp verification
              for every order before parcel handover, ensuring customers review final component
              specifications and delivery arrangements before dispatch.
            </p>
          </section>

          <section className="content-card">
            <h2>Retail Pillars</h2>
            <div className="pillars-grid">
              <div className="pillar-item">
                <div className="pillar-icon">🏷️</div>
                <h3>Transparent Pricing</h3>
                <p>
                  All listed prices are denominated in Egyptian Pounds (EGP). When you place an
                  order, your component pricing is locked in during the 24-hour verification window.
                </p>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon">🛡️</div>
                <h3>Official Agency Warranties</h3>
                <p>
                  All brand new factory-sealed hardware is sourced from authorized Egyptian
                  distributors and accompanied by official distributor warranty coverage.
                </p>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon">⚙️</div>
                <h3>Certified Used Testing</h3>
                <p>
                  Every certified used graphics card and component undergoes rigorous FurMark,
                  3DMark, and thermal stress testing, backed by a 14-day direct testing warranty.
                </p>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon">📦</div>
                <h3>Delivery Inspection</h3>
                <p>
                  Our courier partners serve Cairo and Giza. Customers are encouraged to inspect
                  outer box security seals and matching serial numbers before completing payment.
                </p>
              </div>
            </div>
          </section>

          <section className="content-card">
            <h2>How Order Fulfillment Works</h2>
            <ol className="fulfillment-steps">
              <li>
                <strong>1. Order Placement at Checkout:</strong> You select your components and
                submit a pending order with your Cairo or Giza delivery address.
              </li>
              <li>
                <strong>2. Automated WhatsApp Connection:</strong> A pre-filled WhatsApp link with
                your order reference and item breakdown is generated immediately.
              </li>
              <li>
                <strong>3. Staff Review & Confirmation:</strong> Our administration team verifies
                stock availability, checks customer address details, confirms the final total,
                allocates inventory, and approves courier dispatch.
              </li>
              <li>
                <strong>4. Cash on Delivery Handover:</strong> Your parcel is delivered to your
                door. You inspect the seals and pay the courier directly.
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
