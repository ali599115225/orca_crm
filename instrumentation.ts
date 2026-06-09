import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || "",
      tracesSampleRate: 0.2,
      environment: process.env.NODE_ENV || "development",
    });
  }
}
