import fs from 'node:fs';
import path from 'node:path';

/**
 * Server-only helper to read the configured admin route secret.
 * In production, it is provided directly by process.env.ADMIN_ROUTE_SECRET.
 * In local monorepo development, it safely falls back to loading repository root .env.
 */
export function getAdminRouteSecret() {
  if (process.env.ADMIN_ROUTE_SECRET) {
    return process.env.ADMIN_ROUTE_SECRET.trim();
  }

  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../.env')
  ];

  for (const envPath of candidates) {
    try {
      if (fs.existsSync(/* turbopackIgnore: true */ envPath)) {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(envPath);
        } else {
          const content = fs.readFileSync(/* turbopackIgnore: true */ envPath, 'utf8');
          for (const line of content.split('\n')) {
            const match = line.match(/^\s*ADMIN_ROUTE_SECRET\s*=\s*(.+?)\s*$/);
            if (match) {
              process.env.ADMIN_ROUTE_SECRET = match[1].replace(/^["']|["']$/g, '').trim();
              break;
            }
          }
        }
        if (process.env.ADMIN_ROUTE_SECRET) {
          return process.env.ADMIN_ROUTE_SECRET.trim();
        }
      }
    } catch {
      // Ignore reading errors
    }
  }

  return process.env.ADMIN_ROUTE_SECRET ? process.env.ADMIN_ROUTE_SECRET.trim() : null;
}
