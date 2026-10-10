import * as Sentry from "@sentry/nextjs";
import { sentryErrorOptions } from "./lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn && process.env.NODE_ENV === "production") {
  Sentry.init({
    ...sentryErrorOptions,
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
