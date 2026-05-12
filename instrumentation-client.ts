import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      blockAllMedia: true,
      maskAllText: true
    })
  ],
  beforeSend: scrubSentryEvent
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
