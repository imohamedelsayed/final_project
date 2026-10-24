'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('order_inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const nameId = useId();
  const phoneId = useId();
  const subjectId = useId();
  const messageId = useId();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="policy-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Contact Us</span>
        </nav>

        <header className="page-header">
          <span className="badge-category">Customer Support</span>
          <h1 className="page-title">Contact Pixel Store Egypt</h1>
          <p className="page-lead">
            Reach our customer team for hardware inquiries, stock checks, order assistance, and
            delivery scheduling in Cairo & Giza.
          </p>
        </header>

        <div className="contact-grid">
          {/* Contact Information & Channels */}
          <div className="info-column">
            <div className="contact-card">
              <h2>Support Channels</h2>

              <div className="channel-item">
                <div className="channel-icon">💬</div>
                <div className="channel-content">
                  <strong>Official WhatsApp Support</strong>
                  <p>
                    Fastest assistance for order tracking, stock reservations, and hardware
                    consultation.
                  </p>
                  <span className="channel-value">Direct Chat Available Upon Checkout</span>
                </div>
              </div>

              <div className="channel-item">
                <div className="channel-icon">⏰</div>
                <div className="channel-content">
                  <strong>Operating Hours</strong>
                  <p>Saturday – Thursday</p>
                  <span className="channel-value">10:00 AM – 10:00 PM CLT (Cairo Time)</span>
                  <small className="channel-sub">
                    Orders placed on Friday are processed on Saturday morning.
                  </small>
                </div>
              </div>

              <div className="channel-item">
                <div className="channel-icon">📍</div>
                <div className="channel-content">
                  <strong>Fulfillment & Delivery Territory</strong>
                  <p>Order processing and door-to-door courier distribution exclusively across:</p>
                  <span className="channel-value">Cairo Governorate & Giza Governorate</span>
                </div>
              </div>
            </div>

            <div className="contact-card notice-card">
              <h3>⚡ Order Inquiries & Tracking</h3>
              <p>
                Have an existing order reference? Please keep your 8-character order code (e.g.{' '}
                <code>ORD-XXXXXX</code>) ready when reaching out to ensure rapid lookup.
              </p>
              <Link href="/orders" className="btn-link">
                Look Up My Order Status →
              </Link>
            </div>
          </div>

          {/* Customer Message Form */}
          <div className="form-column">
            <div className="contact-card">
              <h2>Send an Inquiry</h2>
              <p className="form-subtext">
                Leave your details below and our hardware specialists will connect with you during
                business hours.
              </p>

              {submitted ? (
                <div className="submission-success">
                  <div className="success-icon">✓</div>
                  <h3>Message Received</h3>
                  <p>
                    Thank you, <strong>{name}</strong>. Our staff has received your inquiry and will
                    reach out to you at <strong>{phone}</strong> shortly.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setName('');
                      setPhone('');
                      setMessage('');
                      setSubmitted(false);
                    }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="form-group">
                    <label htmlFor={nameId} className="form-label">
                      Your Full Name *
                    </label>
                    <input
                      id={nameId}
                      type="text"
                      className="form-input"
                      placeholder="e.g. Mostafa Ali"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={phoneId} className="form-label">
                      Egyptian Mobile Number *
                    </label>
                    <input
                      id={phoneId}
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 01012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <small className="form-help">
                      Used to verify and answer your inquiry via WhatsApp or phone.
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor={subjectId} className="form-label">
                      Topic / Reason *
                    </label>
                    <select
                      id={subjectId}
                      className="form-input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="order_inquiry">Order Status & Delivery Inquiry</option>
                      <option value="hardware_spec">Component Compatibility & Advice</option>
                      <option value="warranty_rma">14-Day Testing Warranty / RMA</option>
                      <option value="stock_request">Out-of-Stock Product Request</option>
                      <option value="other">General Question</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor={messageId} className="form-label">
                      Inquiry Details *
                    </label>
                    <textarea
                      id={messageId}
                      rows="5"
                      className="form-input form-textarea"
                      placeholder="Describe the hardware you are asking about, order number, or delivery inquiry..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" id="contact-submit-btn">
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .policy-page {
          padding: 2.5rem 0 4rem 0;
          background: var(--color-background, #f6f0eb);
          min-height: 80vh;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--color-text-muted, #615e5a);
          margin-bottom: 1.5rem;
        }

        .breadcrumb a {
          color: var(--color-primary, #153f3a);
          text-decoration: none;
        }

        .separator {
          color: #cbd5e1;
        }

        .current {
          color: var(--color-text, #263330);
          font-weight: 500;
        }

        .page-header {
          margin-bottom: 2.5rem;
          max-width: 800px;
        }

        .badge-category {
          display: inline-block;
          background: var(--color-primary-fixed, #c0ebe4);
          color: var(--color-primary-dark, #002924);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.25rem 0.65rem;
          border-radius: 4px;
          margin-bottom: 0.75rem;
        }

        .page-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--color-text, #263330);
          margin: 0 0 1rem 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .page-lead {
          font-size: 1.1rem;
          line-height: 1.6;
          color: var(--color-text-muted, #615e5a);
          margin: 0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 860px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }
        }

        .contact-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e2ddd7);
          border-radius: var(--radius-lg, 12px);
          padding: 2rem;
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
          margin-bottom: 1.5rem;
        }

        .contact-card h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--color-text, #263330);
          margin: 0 0 1.25rem 0;
        }

        .channel-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid var(--color-border-subtle, #edf5f3);
        }

        .channel-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .channel-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .channel-content strong {
          display: block;
          font-size: 0.95rem;
          color: var(--color-text, #263330);
          margin-bottom: 0.25rem;
        }

        .channel-content p {
          font-size: 0.88rem;
          color: var(--color-text-muted, #615e5a);
          margin: 0 0 0.35rem 0;
        }

        .channel-value {
          display: inline-block;
          font-weight: 600;
          color: var(--color-primary, #153f3a);
          font-size: 0.9rem;
        }

        .channel-sub {
          display: block;
          font-size: 0.78rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }

        .notice-card {
          background: var(--color-surface-dim, #edf5f3);
          border-color: var(--color-border-subtle, #dce4e2);
        }

        .notice-card h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--color-primary-dark, #002924);
          margin: 0 0 0.5rem 0;
        }

        .notice-card p {
          font-size: 0.88rem;
          color: var(--color-text, #263330);
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }

        .notice-card code {
          background: #ffffff;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          font-weight: 700;
          color: var(--color-primary, #153f3a);
        }

        .btn-link {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-primary, #153f3a);
          text-decoration: none;
        }

        .btn-link:hover {
          text-decoration: underline;
        }

        .form-subtext {
          font-size: 0.9rem;
          color: var(--color-text-muted, #615e5a);
          margin: -0.75rem 0 1.5rem 0;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text, #263330);
          margin-bottom: 0.35rem;
        }

        .form-input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1px solid var(--color-border, #e2ddd7);
          border-radius: var(--radius-sm, 4px);
          font-size: 0.92rem;
          color: var(--color-text, #263330);
          background: #ffffff;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-primary, #153f3a);
        }

        .form-textarea {
          resize: vertical;
          font-family: inherit;
        }

        .form-help {
          display: block;
          font-size: 0.78rem;
          color: var(--color-text-muted, #615e5a);
          margin-top: 0.3rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.7rem 1.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: background 0.15s;
        }

        .btn-primary {
          background: var(--color-primary, #153f3a);
          color: #ffffff;
          width: 100%;
        }

        .btn-primary:hover {
          background: var(--color-primary-dark, #002924);
        }

        .btn-secondary {
          background: var(--color-surface-dim, #edf5f3);
          color: var(--color-primary, #153f3a);
          border: 1px solid var(--color-border, #e2ddd7);
        }

        .submission-success {
          text-align: center;
          padding: 2rem 1rem;
        }

        .success-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #059669;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 auto 1rem auto;
        }

        .submission-success h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text, #263330);
          margin: 0 0 0.5rem 0;
        }

        .submission-success p {
          font-size: 0.92rem;
          color: var(--color-text-muted, #615e5a);
          margin: 0 0 1.5rem 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
