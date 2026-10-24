import React from 'react';
import { notFound } from 'next/navigation';
import { api } from '../../lib/api';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  try {
    const product = await api.getProductBySlug(resolvedParams.slug);
    if (!product) return { title: 'Product Not Found | Pixel Store' };
    return {
      title: `${product.name} | Pixel Store Egypt`,
      description:
        product.description?.slice(0, 160) ||
        `Buy ${product.name} in Egypt with fast Cairo dispatch and cash on delivery.`
    };
  } catch {
    return { title: 'Product Details | Pixel Store' };
  }
}

export default async function ProductDetailPage({ params }) {
  const resolvedParams = await params;
  let product = null;

  try {
    product = await api.getProductBySlug(resolvedParams.slug);
  } catch {
    notFound();
  }

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
