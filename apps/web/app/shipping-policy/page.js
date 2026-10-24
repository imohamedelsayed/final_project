import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Shipping Policy | Pixel Store Egypt',
  description:
    'Information on shipping coverage in Cairo and Giza, door-to-door delivery timelines, parcel inspection upon arrival, and Cash on Delivery terms.'
};

export default function ShippingPolicyPage() {
  return (
    <div className="policy-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Shipping Policy</span>
        </nav>

        <header className="page-header">
          <span className="badge-category">Fulfillment Policy</span>
          <h1 className="page-title">Shipping & Delivery Policy</h1>
          <p className="page-lead">
            Transparent door-to-door courier service across Cairo and Giza with Cash on Delivery
            (COD) and delivery parcel inspection.
          </p>
        </header>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Geographical Delivery Coverage</h2>
            <p>
              Pixel Store currently operates dedicated door-to-door courier fulfillment exclusively
              within the following Egyptian governorates:
            </p>
            <div className="coverage-badges">
              <span className="coverage-tag">Cairo Governorate</span>
              <span className="coverage-tag">Giza Governorate</span>
            </div>
            <p>
              Deliveries outside Cairo and Giza are not currently available through automated
              checkout. If you require shipping to other governorates, please contact our support
              team prior to checkout.
            </p>
          </section>

          <section className="policy-section">
            <h2>2. Order Verification Before Dispatch</h2>
            <p>
              To maintain catalog stock integrity and protect buyers against uncoordinated
              deliveries, every order placed through Pixel Store undergoes administrative
              confirmation:
            </p>
            <ul>
              <li>
                <strong>24-Hour Confirmation Window:</strong> Once our administration team reviews
                your order and dispatches the final total and delivery fee, a 24-hour confirmation
                window begins for you to review and confirm the delivery arrangement.
              </li>
              <li>
                <strong>WhatsApp Order Confirmation:</strong> Our fulfillment team contacts you via
                WhatsApp to verify your exact delivery address (governorate, area, street, and
                building number) and review the final total including shipping fee.
              </li>
              <li>
                <strong>Dispatch Approval & Stock Allocation:</strong> Physical inventory is
                allocated and deducted upon official order confirmation, after which parcels are
                handed over to couriers for dispatch.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Delivery Timelines</h2>
            <p>
              Standard courier delivery takes <strong>1 to 3 business days</strong> from the moment
              your order is confirmed by our administration team.
            </p>
            <p>
              Courier operations run Saturday through Thursday. Orders confirmed on Thursday
              afternoon or Friday will be scheduled for courier pickup on Saturday morning.
            </p>
          </section>

          <section className="policy-section">
            <h2>4. Cash on Delivery (COD) Payment</h2>
            <p>
              All orders are fulfilled via Cash on Delivery in Egyptian Pounds (EGP). Customers pay
              the courier upon receipt of the parcel. Please ensure exact cash is available for the
              courier to facilitate smooth handover.
            </p>
          </section>

          <section className="policy-section">
            <h2>5. Parcel Inspection Upon Arrival</h2>
            <div className="highlight-box">
              <h3>📦 Open-Box Serial & Seal Inspection</h3>
              <p>
                We encourage all customers to inspect the outer security seals and matching serial
                numbers on brand new factory-sealed components or certified used hardware before
                completing cash payment to the delivery representative.
              </p>
            </div>
          </section>

          <section className="policy-section">
            <h2>6. Unconfirmed or Expired Orders</h2>
            <p>
              If our administration team is unable to reach the customer via WhatsApp or phone
              within 24 hours of checkout, the order reservation will expire automatically. Reserved
              hardware stock will be released back to the live public catalog so other builders may
              purchase.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
