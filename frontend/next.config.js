/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';
const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Baseline CSP. `script-src` keeps `'unsafe-inline'` because Next injects inline bootstrap
// scripts and the app has statically-rendered routes (a nonce + `strict-dynamic` policy would
// block hydration on those without forcing every route to dynamic rendering). Tightening to
// nonce + `strict-dynamic` on the authenticated, dynamically-rendered routes is an infra-track
// follow-up — see CLAUDE.md §10 D2.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // `${apiOrigin}` is required: the backend serves garment/VTON images itself at
  // `<PUBLIC_BASE_URL>/media/...` (backend/src/services/storage.py) and returns absolute
  // URLs, so without it the browser silently blocked every backend image.
  // (Cloudinary entry removed: dead config, no code referenced it. Object storage
  // plugs back in here when §8 of the constitution lands an actual provider.)
  `img-src 'self' data: blob: ${apiOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://*.supabase.co`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  headers: async () => [{ source: '/:path*', headers: securityHeaders }],
};

module.exports = nextConfig;
