import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { ensurePersonalWorkspace } from "./workspace-service";
import { isCloudMode, requireCloudEnvironment } from "./runtime";

requireCloudEnvironment();

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
// Deployment opt-in; provision verified accounts separately. Never enable signup
// just to create credentials, or attach a password to an existing Google user.
const passwordConfigured = isCloudMode() && process.env.MONOLOGUE_PASSWORD_SIGN_IN === "1";
const localOnlySecret = "monologue-single-user-auth-disabled-secret";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "sqlite" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? localOnlySecret,
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  disabledPaths: passwordConfigured ? ["/change-password", "/request-password-reset", "/reset-password"] : undefined,
  emailAndPassword: {
    enabled: passwordConfigured,
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: 16,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  // A shared store is necessary on serverless hosts. Apply the additive
  // migration before enabling password sign-in. Keep provider defaults otherwise.
  rateLimit: passwordConfigured ? {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  } : undefined,
  socialProviders: googleConfigured ? {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["openid", "email", "profile"],
    },
  } : {},
  account: { encryptOAuthTokens: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!isCloudMode()) return;
          await ensurePersonalWorkspace(user.id);
        },
      },
    },
  },
  advanced: {
    database: { joins: true },
    disableCSRFCheck: false,
    disableOriginCheck: false,
    // Vercel overwrites this header. Do not trust caller-supplied forwarding
    // headers for password throttling on the hosted deployment.
    ...(passwordConfigured && process.env.VERCEL === "1" && {
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] },
    }),
  },
});

// The provider throttles before resolving a route. Keep attacker-chosen paths
// out of its durable store; only finite static endpoints and configured social
// callbacks may reach it. Recovery links are unavailable in this operator-only mode.
if (passwordConfigured) {
  const supportedPaths = new Set(Object.values(auth.api).flatMap(endpoint =>
    "path" in endpoint && typeof endpoint.path === "string" && !endpoint.path.includes(":")
      ? [`/api/auth${endpoint.path}`] : []));
  for (const provider of Object.keys(auth.options.socialProviders)) supportedPaths.add(`/api/auth/callback/${provider}`);
  const providerHandler = auth.handler;
  let nextPruneAt = 0;
  auth.handler = async request => {
    if (!supportedPaths.has(new URL(request.url).pathname)) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    const now = Date.now();
    if (now >= nextPruneAt) {
      nextPruneAt = now + 60_000;
      // Retain much longer than any configured throttle window. Cleanup runs
      // even when every client is new; the index bounds its scan to old rows.
      await db.rateLimit.deleteMany({ where: { lastRequest: { lt: now - 24 * 60 * 60 * 1000 } } });
    }
    return providerHandler(request);
  };
}

export const googleSignInConfigured = googleConfigured;
export const passwordSignInConfigured = passwordConfigured;
