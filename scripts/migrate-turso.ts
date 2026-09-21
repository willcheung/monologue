import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
}

const client = createClient({ url, authToken });
const migrationsDirectory = path.join(process.cwd(), "prisma", "migrations");

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS "_monologue_migrations" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const appliedResult = await client.execute(
  'SELECT "name", "checksum" FROM "_monologue_migrations" ORDER BY "name"',
);
const applied = new Map(
  appliedResult.rows.map((row) => [String(row.name), String(row.checksum)]),
);

const entries = (await readdir(migrationsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of entries) {
  const sql = await readFile(path.join(migrationsDirectory, name, "migration.sql"), "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const previousChecksum = applied.get(name);

  if (previousChecksum) {
    if (previousChecksum !== checksum) {
      throw new Error(`Applied migration ${name} has changed`);
    }
    console.log(`Already applied ${name}`);
    continue;
  }

  await client.executeMultiple(sql);
  await client.execute({
    sql: 'INSERT INTO "_monologue_migrations" ("name", "checksum") VALUES (?, ?)',
    args: [name, checksum],
  });
  console.log(`Applied ${name}`);
}

client.close();
