import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCloudMode } from "./runtime";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  if (process.env.MONOLOGUE_DEMO_MODE === "1") {
    const bundledDatabase = join(process.cwd(), "demo", "monologue.db");
    const writableDatabase = join(tmpdir(), "monologue-preview.db");

    if (!existsSync(writableDatabase)) {
      copyFileSync(bundledDatabase, writableDatabase);
    }

    return new PrismaClient({ datasourceUrl: `file:${writableDatabase}` });
  }

  const url = process.env.TURSO_DATABASE_URL;
  if (isCloudMode() && url) {
    const adapter = new PrismaLibSQL({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
