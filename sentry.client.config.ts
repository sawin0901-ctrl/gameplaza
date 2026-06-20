import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.05,
  environment: process.env.NODE_ENV,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.01,
  integrations: [Sentry.replayIntegration()],
})
