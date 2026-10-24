import React from 'react';
import { notFound } from 'next/navigation';
import AdminLoginClient from './AdminLoginClient';
import { getAdminRouteSecret } from '../admin-route-guard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Staff Sign In | Pixel Store Administration',
  description: 'Secure staff administration portal for Pixel Store operations.',
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminSecretLoginPage({ params }) {
  const resolvedParams = await params;
  const configuredSecret = getAdminRouteSecret();
  const rawSecret = resolvedParams?.secret ? decodeURIComponent(resolvedParams.secret).trim() : '';

  if (!configuredSecret || !rawSecret || rawSecret !== configuredSecret) {
    notFound();
  }

  return <AdminLoginClient />;
}
