import { withSentryConfig } from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  isProduction
    ? "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://browser.sentry-cdn.com https://cdn.sentry.io"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://browser.sentry-cdn.com https://cdn.sentry.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' wss: https://graph.facebook.com https://*.facebook.com https://*.ingest.sentry.io https://sentry.io https://restpilot.paylink.sa https://restapi.paylink.sa",
  "frame-src 'self' https://www.facebook.com https://web.facebook.com https://*.paylink.sa",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/operations/growth',
        destination: '/operations/marketing',
        permanent: true,
      },
      {
        source: '/operations/shopping',
        destination: '/operations/marketing?tab=shopping',
        permanent: true,
      },
      {
        source: '/sidebar/marketing',
        destination: '/operations/marketing',
        permanent: false,
      },
      {
        source: '/sidebar/marketing/growth',
        destination: '/operations/marketing?tab=growth',
        permanent: false,
      },
      {
        source: '/sidebar/marketing/shopping',
        destination: '/operations/marketing?tab=shopping',
        permanent: false,
      },
      {
        source: '/favicon.ico',
        destination: '/logo.png',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: process.env.NODE_ENV !== "production",
  hideSourceMaps: true,
  widenClientFileUpload: true,
  transpileClientSDK: true,
});
