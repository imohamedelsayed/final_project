import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Pixel Store Egypt',
  description:
    'Privacy Policy for Pixel Store Egypt. Details on how customer contact information, delivery details, and session security are handled.'
};

export default function PrivacyPage() {
  return (
    <div className="policy-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Privacy Policy</span>
        </nav>

        <header className="page-header">
          <span className="badge-category">Data Protection</span>
          <h1 className="page-title">Privacy Policy</h1>
          <p className="page-lead">
            How Pixel Store Egypt collects, utilizes, and safeguards customer personal details and
            delivery information.
          </p>
        </header>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Information We Collect</h2>
            <p>
              When you browse our catalog, register an account, or place a hardware reservation on
              Pixel Store, we collect information necessary to fulfill your order:
            </p>
            <ul>
              <li>
                <strong>Contact Details:</strong> Your full name, Egyptian mobile number, and email
                address.
              </li>
              <li>
                <strong>Fulfillment Address:</strong> Delivery destination within Cairo or Giza
                Governorate, including area, street name, building number, and delivery notes.
              </li>
              <li>
                <strong>Account Credentials:</strong> If you register a customer account, passwords
                are treated with modern cryptographic hashing (Argon2id) and are never stored in
                plain text.
              </li>
              <li>
                <strong>Order History:</strong> Past ordered components, reserved hardware
                snapshots, agreed pricing versions, and order status transitions.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>2. Purpose and Usage of Data</h2>
            <p>We use customer personal data strictly for operational fulfillment purposes:</p>
            <ul>
              <li>
                <strong>Order Processing:</strong> Verifying hardware compatibility, inventory
                availability, and scheduling courier dispatch.
              </li>
              <li>
                <strong>WhatsApp Order Coordination:</strong> Generating click-to-chat links with
                order references to facilitate immediate human confirmation between you and our
                support team.
              </li>
              <li>
                <strong>Account Verification:</strong> Delivering secure email verification
                challenges and notifications related to your active reservations.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Third-Party Sharing</h2>
            <p>
              Pixel Store does <strong>not</strong> sell, rent, or trade your personal data to
              external advertisers or data brokers. Information is shared only with:
            </p>
            <ul>
              <li>
                <strong>Authorized Courier Partners:</strong> Delivery couriers operating within
                Cairo and Giza receive only the recipient’s name, mobile number, and address to
                execute parcel delivery and Cash on Delivery collection.
              </li>
              <li>
                <strong>Legal Authorities:</strong> Only when strictly required by applicable
                Egyptian laws or judicial requests.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>4. Cookies & Session Security</h2>
            <p>
              We use secure, HttpOnly session cookies to manage user logins and preserve your
              shopping cart items between sessions. These cookies are not used for cross-site
              behavioral tracking or third-party profiling.
            </p>
          </section>

          <section className="policy-section">
            <h2>5. Your Rights and Inquiries</h2>
            <p>
              You have the right to access your order history, update your registered email or
              delivery preferences, or request account deactivation. To submit a data inquiry or
              request, please contact us through our official support channel or email support.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
