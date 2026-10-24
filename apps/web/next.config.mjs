import fs from 'node:fs';
import path from 'node:path';

// Ensure monorepo root .env is loaded into process.env if not already present
if (!process.env.ADMIN_ROUTE_SECRET) {
  const rootEnvCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../.env')
  ];
  for (const envPath of rootEnvCandidates) {
    if (fs.existsSync(envPath)) {
      if (typeof process.loadEnvFile === 'function') {
        try {
          process.loadEnvFile(envPath);
        } catch {
          // Ignore
        }
      }
      break;
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/admin/:secret/login:extra(\\*+)',
        destination: '/admin/:secret/login',
        permanent: false
      },
      {
        source: '/admin/:secret:extra(\\*+)',
        destination: '/admin/:secret',
        permanent: false
      }
    ];
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`
      },
      {
        source: '/media/:path*',
        destination: `${apiBase}/media/:path*`
      }
    ];
  }
};

export default nextConfig;
