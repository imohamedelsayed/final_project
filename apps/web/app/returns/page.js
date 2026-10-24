import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Returns & Warranty Policy | Pixel Store Egypt',
  description:
    'Warranty terms for Pixel Store Egypt: 14-day testing warranty for certified used hardware and official distributor agency warranty for brand new sealed components.'
};

export default function ReturnsPage() {
  return (
    <div className="policy-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Returns & Warranty</span>
        </nav>

        <header className="page-header">
          <span className="badge-category">Consumer Protection</span>
          <h1 className="page-title">Returns, Replacement & Warranty Policy</h1>
          <p className="page-lead">
            Comprehensive testing guarantees on certified used hardware and official agency
            distributor warranties on brand new components.
          </p>
        </header>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Warranty Coverage by Hardware Condition</h2>
            <div className="warranty-grid">
              <div className="warranty-card new-card">
                <span className="condition-tag">Brand New Components</span>
                <h3>Official Agency Warranty</h3>
                <p>
                  All brand new factory-sealed hardware (GPUs, CPUs, Motherboards, RAM, Power
                  Supplies) is sourced from authorized Egyptian trade distributors and carries the
                  full manufacturer agency warranty (typically 1 to 3 years depending on the
                  manufacturer).
                </p>
                <ul>
                  <li>Factory sealed with tamper-evident tape</li>
                  <li>Official distributor sticker & local warranty coverage</li>
                  <li>Eligible for service at authorized agency service centers in Egypt</li>
                </ul>
              </div>

              <div className="warranty-card used-card">
                <span className="condition-tag">Certified Used Hardware</span>
                <h3>14-Day Direct Testing Warranty</h3>
                <p>
                  Every pre-owned graphics card and component undergoes rigorous benchmark and
                  stress testing (FurMark, 3DMark, and thermal monitoring) before being listed. We
                  provide an unconditional <strong>14-day direct testing warranty</strong> from the
                  day of courier delivery.
                </p>
                <ul>
                  <li>14 calendar days from delivery handover</li>
                  <li>Direct replacement or full refund if a hardware defect arises</li>
                  <li>Stress-tested and thermal verified prior to delivery</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="policy-section">
            <h2>2. Eligible Return & Exchange Conditions</h2>
            <p>
              To qualify for return, replacement, or warranty inspection under our policy, the
              following criteria must be satisfied:
            </p>
            <ul>
              <li>
                <strong>Matching Serial Numbers:</strong> The item’s printed serial number must
                match the serial recorded on the Pixel Store order and invoice.
              </li>
              <li>
                <strong>Warranty Seal Integrity:</strong> The Pixel Store testing sticker and
                manufacturer security labels must be intact and untampered with.
              </li>
              <li>
                <strong>No Physical or Electrical Abuse:</strong> Products with physical damage
                (cracked PCB, bent socket pins, burnt traces, water/liquid damage, or custom BIOS
                modifications) are disqualified from warranty service.
              </li>
              <li>
                <strong>Complete Packaging for New Items:</strong> Brand new returns must be
                accompanied by the original box, anti-static bag, and all included accessories.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Return & RMA Step-by-Step Procedure</h2>
            <ol className="steps-list">
              <li>
                <strong>Step 1: Contact Support via WhatsApp</strong>
                <p>
                  Message our support line with your 8-character order reference (e.g.{' '}
                  <code>ORD-XXXXXX</code>) and a brief description or short video demonstrating the
                  issue.
                </p>
              </li>
              <li>
                <strong>Step 2: Technical Assessment</strong>
                <p>
                  Our hardware technicians will guide you through standard diagnostic checks to
                  ensure there are no driver or power supply incompatibility issues.
                </p>
              </li>
              <li>
                <strong>Step 3: Courier Collection or Inspection</strong>
                <p>
                  If a hardware defect is suspected, our courier will collect the component from
                  your address in Cairo or Giza for lab inspection.
                </p>
              </li>
              <li>
                <strong>Step 4: Replacement or Refund Handover</strong>
                <p>
                  Upon verification of the defect, an identical replacement unit will be dispatched
                  immediately, or a full refund will be processed.
                </p>
              </li>
            </ol>
          </section>

          <section className="policy-section">
            <h2>4. Parcel Rejection at Handover</h2>
            <p>
              Because all deliveries are fulfilled with parcel inspection enabled, you may reject
              the parcel at the door before paying the courier if the outer box seal is broken or
              does not match what was agreed during order verification.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
