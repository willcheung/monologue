import type { ErrorEvent } from "@sentry/nextjs";

// Error reports do not need private feed data, credentials, or browser activity.
export function stripSentryContext(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  delete event.contexts;
  return event;
}

export const sentryErrorOptions = {
  maxBreadcrumbs: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
    frameContextLines: 0,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    queues: false,
  },
  // No tracing, replay, logs, or custom metrics in the initial error-only setup.
  beforeSendLog: () => null,
  beforeSendMetric: () => null,
  beforeSend: stripSentryContext,
};
