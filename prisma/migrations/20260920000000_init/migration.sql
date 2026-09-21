-- CreateTable
CREATE TABLE "Action" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Action_agentName_system_externalId_key" ON "Action"("agentName", "system", "externalId");
CREATE INDEX "Action_occurredAt_idx" ON "Action"("occurredAt");
CREATE INDEX "Action_agentName_idx" ON "Action"("agentName");
CREATE INDEX "Action_category_idx" ON "Action"("category");
CREATE INDEX "Action_status_idx" ON "Action"("status");
CREATE INDEX "Action_system_idx" ON "Action"("system");
CREATE INDEX "Action_project_idx" ON "Action"("project");
