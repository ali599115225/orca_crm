import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  tracesSampleRate: 0.2,
  debug: process.env.NODE_ENV === "development",
  environment: process.env.NODE_ENV || "development",
});
