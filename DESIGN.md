---
version: 1.0.0
name: Pixel Store
description: Authentic, specialized computer hardware and enthusiast electronics retailer in Egypt with English storefront, EGP pricing, and WhatsApp order verification.
colors:
  ground: '#f6f0eb'
  surface: '#ffffff'
  surface-dim: '#edf5f3'
  ink: '#263330'
  muted: '#615e5a'
  primary: '#153f3a'
  primary-dark: '#0e2c28'
  primary-light: '#254d48'
  accent-red: '#d94b3d'
  accent-red-bg: '#ffdad6'
  border: '#e2ddd7'
  border-subtle: '#dce4e2'
  success: '#1b7a48'
  success-bg: '#e1f5ea'
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontWeight: '800'
    letterSpacing: '-0.025em'
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: '1rem'
    lineHeight: '1.5'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  full: '9999px'
spacing:
  xs: '0.25rem'
  sm: '0.5rem'
  md: '1rem'
  lg: '1.5rem'
  xl: '2.5rem'
  xxl: '4rem'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
    padding: '0.65rem 1.25rem'
  card:
    backgroundColor: '{colors.surface}'
    borderColor: '{colors.border}'
    rounded: '{rounded.lg}'
---

## Overview

Pixel Store is an established specialized PC hardware, components, and electronics retailer serving customers across Egypt (Cairo, Giza, Alexandria, and governorates). The visual language reflects a serious, high-integrity hardware shop: precision specification tables, genuine product photography, clear distinction between Brand New and Certified Used parts, transparent EGP pricing, and an authentic Cash on Delivery + WhatsApp order confirmation model.

## Colors

- **Ground (`#f6f0eb`):** Warm off-white page background providing an organic, tactile contrast to the crisp white product display cards.
- **Surface (`#ffffff`):** Pure white container surfaces for product images, specifications, and checkout cards.
- **Ink (`#263330`):** Dark slate-teal text providing high contrast (exceeding WCAG AAA on white, AAA on warm off-white).
- **Primary Petrol Green (`#153f3a`):** Rich, dark industrial petrol green anchoring the navigation, key brand headers, and primary purchase buttons.
- **Discount Accent Red (`#d94b3d`):** Used strictly for promotional badges, active cart item counters, and negative alerts. Never used for decorative glows.

## Typography

- Retain clean, legible Inter typography across all UI surfaces as specified in the brand requirements.
- Strong hierarchy with bold, confident headlines (`700`/`800`) without gradient fills (`bg-clip-text`) or colored single-word gimmicks.
- Tabular figures and clear weights for technical specifications, SKUs, and EGP prices.

## Layout & Composition

- Product-focused e-commerce grid with standard container constraints (`1280px`).
- Asymmetrical, informative hero section emphasizing real product hardware, Cairo dispatch guarantees, and immediate catalog discovery.
- Structured technical specification tables for hardware details (chipset, memory, socket, ports).
- Compact, dense operational data grid for administrative order management.

## Elevation & Depth

- Restrained elevation using soft, neutral shadows (`0 1px 3px rgba(0,0,0,0.05)`, `0 4px 12px rgba(21,63,58,0.08)`).
- Zero colored glow shadows (`C5`). Zero decorative linear gradients (`C1`).

## Shapes & Radii

- Modern, restrained corner radii (`4px` for pills/chips, `8px` for inputs/buttons, `12px` for major product and summary cards).
- Avoid excessive, balloon-like `rounded-2xl` / `rounded-3xl` cards.

## Components

- **Header:** Sticky industrial petrol green bar with high-contrast search, clear catalog categories, live EGP cart summary, and user authentication state. Clean inline SVG icons.
- **Footer:** Grounded Egyptian hardware store footer with physical Cairo/Giza service details, official warranty notes, store hours, and direct support links.
- **Product Cards:** Clean photography showcase, distinct condition badges (Brand New vs. Certified Used), verified availability badge, EGP pricing, and direct add-to-cart action.
- **Order Confirmation & WhatsApp Handoff:** Trustworthy post-checkout summary with direct click-to-chat WhatsApp link, unique order reference, and clear Cash on Delivery instructions.

## Do's and Don'ts

- **Do:** Maintain one single token contract across storefront, checkout, and admin pages.
- **Do:** Use authentic retail microcopy suited for Egyptian computer hardware shoppers (EGP, Greater Cairo dispatch, 14-day warranty for used hardware).
- **Do:** Use accessible inline SVG icons instead of loose emojis in navigation, alerts, and buttons.
- **Don't use:** The purple gradient (`C1`), generic centered heroes with vague buzzwords (`L1`, `CP1`), accented single headline words (`SD5`), decorative sparkles (`I3`, `K5`), emojis as interface icons (`I2`), arrows welded to buttons (`CP3`), colored side-stripe borders (`K4`), or colored glow shadows (`C5`).
