import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    const adapter = new PrismaLibSQL({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
