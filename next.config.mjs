import { withSentryConfig } from "@sentry/nextjs";

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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
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
