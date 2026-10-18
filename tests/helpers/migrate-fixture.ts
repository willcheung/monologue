import { readdir, readFile } from "node:fs/promises";
import { createClient, type Client } from "@libsql/client";

// Rebuild DDL must stay on one connection: pooled statement-by-statement calls
// can prepare CREATE INDEX against another connection's stale SQLite schema.
export async function migrateFixture(url: string, beforeMigration?: (client: Client, name: string) => Promise<void>) {
  if (!url.startsWith("file:")) throw new Error("Test migrations require a local file database");
  const client = createClient({ url });
  try {
    const names = (await readdir("prisma/migrations", { withFileTypes: true }))
      .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    for (const name of names) {
      await beforeMigration?.(client, name);
      await client.executeMultiple(await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"));
    }
  } finally { client.close(); }
}
