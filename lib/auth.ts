import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { isCloudMode, requireCloudEnvironment } from "./runtime";

requireCloudEnvironment();

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const localOnlySecret = "monologue-single-user-auth-disabled-secret";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "sqlite" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? localOnlySecret,
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
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
          const firstName = user.name.trim().split(/\s+/)[0];
          await db.workspace.upsert({
            where: { ownerId: user.id },
            update: {},
            create: { ownerId: user.id, name: firstName ? `${firstName}'s feed` : "My agent feed" },
          });
        },
      },
    },
  },
  advanced: { database: { joins: true } },
});

export const googleSignInConfigured = googleConfigured;
