/** @type {import('next').NextConfig} */

// NOTE: a nonce-based CSP (dropping 'unsafe-inline' / 'unsafe-eval' from script-src) is a
// hardening follow-up owned by the infra track — it needs middleware to inject a per-request
// nonce. The policy below is the enforced baseline for the scaffold.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Object storage for garment / VTON images — see .speckit/constitution.md §8.
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: csp },
      ],
    },
  ],
};

module.exports = nextConfig;
