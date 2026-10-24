import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Pixel Store Egypt',
  description:
    'Terms of Service for Pixel Store Egypt. Pricing in EGP, order reservation guidelines, 24-hour verification window, and courier delivery agreement.'
};

export default function TermsPage() {
  return (
    <div className="policy-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Terms of Service</span>
        </nav>

        <header className="page-header">
          <span className="badge-category">Legal Agreement</span>
          <h1 className="page-title">Terms of Service</h1>
          <p className="page-lead">
            Guidelines governing hardware reservations, EGP pricing, order confirmation procedures,
            and delivery agreements on Pixel Store Egypt.
          </p>
        </header>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing the Pixel Store storefront, creating an account, or submitting a hardware
              reservation through our checkout workflow, you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please refrain from using our services.
            </p>
          </section>

          <section className="policy-section">
            <h2>2. Currency & Pricing Integrity</h2>
            <p>
              All product prices, promotional discounts, and shipping estimates are denominated and
              payable exclusively in <strong>Egyptian Pounds (EGP)</strong>.
            </p>
            <p>
              Hardware prices are locked in at the time of checkout reservation and honored
              throughout the 24-hour confirmation window. Any delivery fee agreed upon during
              administrative confirmation is added to form the final payable Cash on Delivery total.
            </p>
          </section>

          <section className="policy-section">
            <h2>3. Order Submission & 24-Hour Confirmation Window</h2>
            <p>
              To maintain fair pricing and predictable delivery, submitting an order creates a
              pending order with locked-in component pricing.
            </p>
            <ul>
              <li>
                Once our administration team reviews your order and dispatches the final total and
                delivery fee, a <strong>24-hour confirmation window</strong> begins.
              </li>
              <li>
                Customers must review and agree to the final total and delivery arrangement via
                WhatsApp within 24 hours of dispatch.
              </li>
              <li>
                If customer agreement is not recorded within 24 hours of dispatch, the order
                automatically transitions to <strong>Expired</strong> status.
              </li>
              <li>
                Physical inventory is officially allocated and deducted from stock upon
                administrative order confirmation, not at initial pending submission.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>4. Promotional Coupons & Discounts</h2>
            <p>
              Promotional discount coupons are subject to individual validity dates, minimum order
              subtotals, and usage limits.
            </p>
            <ul>
              <li>
                <strong>One Coupon per Order:</strong> Only one coupon may be applied per checkout
                reservation.
              </li>
              <li>
                <strong>Redemption Timing:</strong> Official coupon redemption is permanently
                recorded when Pixel Store administration confirms and approves your order, not at
                initial checkout submission.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>5. Fulfillment & Cash on Delivery (COD) Handover</h2>
            <p>
              Deliveries are conducted via door-to-door couriers within Cairo and Giza Governorates.
              Customers agree to receive the courier and pay the confirmed total in cash upon
              delivery.
            </p>
            <p>
              Customers have the right to inspect outer packaging security seals and verify
              component serial numbers before handing cash to the courier representative.
            </p>
          </section>

          <section className="policy-section">
            <h2>6. Hardware Warranties</h2>
            <p>Pixel Store distinguishes between hardware conditions:</p>
            <ul>
              <li>
                <strong>Brand New:</strong> Covered by the official Egyptian authorized distributor
                warranty according to the manufacturer’s terms.
              </li>
              <li>
                <strong>Certified Used:</strong> Covered by Pixel Store’s direct 14-day testing
                warranty, covering hardware component defects verified under standard operating
                parameters.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>7. Governing Law</h2>
            <p>
              These Terms of Service are governed by and construed in accordance with the applicable
              laws of the Arab Republic of Egypt.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
