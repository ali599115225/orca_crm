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
