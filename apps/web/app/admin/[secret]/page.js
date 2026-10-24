import { notFound, redirect } from 'next/navigation';
import { getAdminRouteSecret } from './admin-route-guard';

export const dynamic = 'force-dynamic';

export default async function AdminSecretIndexPage({ params }) {
  const resolvedParams = await params;
  const configuredSecret = getAdminRouteSecret();
  const rawSecret = resolvedParams?.secret ? decodeURIComponent(resolvedParams.secret).trim() : '';

  if (!configuredSecret || !rawSecret || rawSecret !== configuredSecret) {
    notFound();
  }

  redirect(`/admin/${configuredSecret}/login`);
}
