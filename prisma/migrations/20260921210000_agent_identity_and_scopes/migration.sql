-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "skillVersion" TEXT,
    "connectedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Agent_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AddColumn
ALTER TABLE "ApiKey" ADD COLUMN "scopes" TEXT NOT NULL DEFAULT 'actions:read actions:write';
ALTER TABLE "ApiKey" ADD COLUMN "agentId" TEXT REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD COLUMN "createdByUserId" TEXT REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn
ALTER TABLE "AgentConnection" ADD COLUMN "platform" TEXT;
ALTER TABLE "AgentConnection" ADD COLUMN "skillVersion" TEXT;
ALTER TABLE "AgentConnection" ADD COLUMN "approvedByUserId" TEXT REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn
ALTER TABLE "Action" ADD COLUMN "reportedByKeyId" TEXT REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Agent_workspaceId_name_idx" ON "Agent"("workspaceId", "name");
CREATE INDEX "Agent_connectedByUserId_idx" ON "Agent"("connectedByUserId");
CREATE INDEX "ApiKey_agentId_idx" ON "ApiKey"("agentId");
CREATE INDEX "ApiKey_createdByUserId_idx" ON "ApiKey"("createdByUserId");
CREATE INDEX "AgentConnection_approvedByUserId_idx" ON "AgentConnection"("approvedByUserId");
CREATE INDEX "Action_reportedByKeyId_idx" ON "Action"("reportedByKeyId");
CREATE UNIQUE INDEX "Action_workspaceId_agentId_system_externalId_key" ON "Action"("workspaceId", "agentId", "system", "externalId");
