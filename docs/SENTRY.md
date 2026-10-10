# Optional Sentry error monitoring

Monologue uses `@sentry/nextjs` for browser, Node.js, Edge and root React-rendering errors. Monitoring is optional: no DSN means no reporting, and `next dev` never initializes the SDK. Use a Sentry Next.js project dedicated to this application. Do not reuse a project that receives another application's events; changing its name does not separate historical events or change where its existing DSN sends errors.

## Deployment configuration

Set `NEXT_PUBLIC_SENTRY_DSN` to the dedicated project's DSN in the deployment provider. The server uses that DSN unless `SENTRY_DSN` supplies a server override. Both must identify the intended application project. Browser configuration is compiled into the build, so changing a public variable requires a new build.

Set both `NEXT_PUBLIC_SENTRY_ENVIRONMENT` and `SENTRY_ENVIRONMENT` to `production` for production, and `staging` for a staging project. Otherwise the default is the provider's `VERCEL_ENV` or `development`. A staging Vercel project's production deployment still has `VERCEL_ENV=production`, so explicitly label staging. Local errors remain off even if these values are set.

## Releases and source maps

Builds use `SENTRY_RELEASE`, falling back to `VERCEL_GIT_COMMIT_SHA`. Sentry's build wrapper injects the release into the SDK configuration so browser/server events and source maps share the build identity. Without an explicit value, the SDK can infer a release from Git.

Source-map upload and release creation require all three build variables: `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN`. Without them, builds and error capture still work, with source-map upload disabled. The upload token is a server-side build secret: the owner must enter it through the provider's secure environment settings, never chat or source control. Existing integrations may supply a token, but verify their organization/project mapping and permissions before using one. No new GitHub or Vercel integration is required for basic error capture.

The SDK removes generated maps after a successful upload by default. Keep this behavior. Avoid public source-map serving. Review and approve any new credentials, integration grant, code upload or deployment separately.

## Collection boundaries

The initial setup captures errors only. It omits tracing/replay integrations and drops logs and custom metrics. Build-plugin telemetry is off. SDK collection of users, cookies, headers, HTTP bodies, URL query parameters, database data, local variables, source context, GraphQL documents, AI input/output and queue arguments is disabled. A final event hook also removes request, user, breadcrumb, extra and context fields.

Exceptions and stack traces remain for debugging; arbitrary exception messages can still contain application data. Do not attach action content, credentials or user details to exceptions, tags or Sentry scopes. Review the operator's privacy disclosures and Sentry's server-side scrubbing before enabling a hosted DSN.

## Verification and rollout

1. Verify that the dedicated project exists and its DSN matches the deployment variables. Preserve other applications' projects, keys, alert rules and integrations.
2. Configure staging first, with its own database and authentication settings and an explicit `staging` environment.
3. Run lint, typecheck, tests and a production build. Review the change before merging or deploying.
4. After an approved staging deployment, trigger a synthetic browser error and synthetic server error containing no private data. Confirm both appear in the intended project/environment with the expected release. Confirm readable stack traces if uploads are enabled. Do not add permanent public crash routes.
5. Apply production configuration and deploy only after approval. Confirm a synthetic event there before declaring monitoring complete.

References: [Sentry's manual Next.js setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) and [build configuration](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/).
