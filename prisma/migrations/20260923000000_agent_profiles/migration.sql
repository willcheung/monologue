-- AddColumn
ALTER TABLE "Agent" ADD COLUMN "displayName" TEXT;
ALTER TABLE "Agent" ADD COLUMN "description" TEXT;

-- Action.agentId existed before Agent became a related model. Discard unknown
-- identifiers, attach name-only history to an existing matching agent, then
-- create one historical agent for each remaining workspace/name pair.
UPDATE "Action"
SET "agentId" = NULL
WHERE "agentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Agent" WHERE "Agent"."id" = "Action"."agentId");

UPDATE "Action"
SET "agentId" = (
  SELECT "Agent"."id"
  FROM "Agent"
  WHERE "Agent"."workspaceId" = "Action"."workspaceId"
    AND "Agent"."name" = "Action"."agentName"
  ORDER BY "Agent"."createdAt" ASC
  LIMIT 1
)
WHERE "agentId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Agent"
    WHERE "Agent"."workspaceId" = "Action"."workspaceId"
      AND "Agent"."name" = "Action"."agentName"
  );

INSERT INTO "Agent" ("id", "workspaceId", "name", "createdAt", "updatedAt")
SELECT
  'legacy-' || lower(hex(randomblob(12))),
  grouped."workspaceId",
  grouped."agentName",
  grouped."firstSeen",
  CURRENT_TIMESTAMP
FROM (
  SELECT "workspaceId", "agentName", MIN("createdAt") AS "firstSeen"
  FROM "Action"
  WHERE "agentId" IS NULL
  GROUP BY "workspaceId", "agentName"
) AS grouped;

UPDATE "Action"
SET "agentId" = (
  SELECT "Agent"."id"
  FROM "Agent"
  WHERE "Agent"."workspaceId" = "Action"."workspaceId"
    AND "Agent"."name" = "Action"."agentName"
  ORDER BY "Agent"."createdAt" ASC
  LIMIT 1
)
WHERE "agentId" IS NULL;

-- Add the Agent foreign key while preserving the existing action data.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Action" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentName" TEXT NOT NULL,
    "agentId" TEXT,
    "verb" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "objectType" TEXT,
    "objectName" TEXT,
    "project" TEXT,
    "externalId" TEXT,
    "value" REAL,
    "currency" TEXT,
    "url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'self_reported',
    "metadata" JSONB,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "reportedByKeyId" TEXT,
    CONSTRAINT "Action_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Action_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Action_reportedByKeyId_fkey" FOREIGN KEY ("reportedByKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Action" (
  "id", "agentName", "agentId", "verb", "summary", "category", "status", "system",
  "objectType", "objectName", "project", "externalId", "value", "currency", "url",
  "source", "metadata", "occurredAt", "createdAt", "workspaceId", "reportedByKeyId"
)
SELECT
  "id", "agentName", "agentId", "verb", "summary", "category", "status", "system",
  "objectType", "objectName", "project", "externalId", "value", "currency", "url",
  "source", "metadata", "occurredAt", "createdAt", "workspaceId", "reportedByKeyId"
FROM "Action";

DROP TABLE "Action";
ALTER TABLE "new_Action" RENAME TO "Action";

CREATE INDEX "Action_workspaceId_occurredAt_idx" ON "Action"("workspaceId", "occurredAt");
CREATE INDEX "Action_workspaceId_agentName_idx" ON "Action"("workspaceId", "agentName");
CREATE INDEX "Action_agentId_idx" ON "Action"("agentId");
CREATE INDEX "Action_reportedByKeyId_idx" ON "Action"("reportedByKeyId");
CREATE INDEX "Action_category_idx" ON "Action"("category");
CREATE INDEX "Action_status_idx" ON "Action"("status");
CREATE INDEX "Action_system_idx" ON "Action"("system");
CREATE INDEX "Action_project_idx" ON "Action"("project");
CREATE UNIQUE INDEX "Action_workspaceId_agentName_system_externalId_key" ON "Action"("workspaceId", "agentName", "system", "externalId");
CREATE UNIQUE INDEX "Action_workspaceId_agentId_system_externalId_key" ON "Action"("workspaceId", "agentId", "system", "externalId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
