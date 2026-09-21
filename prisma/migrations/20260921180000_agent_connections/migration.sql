-- CreateTable
CREATE TABLE "AgentConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentName" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "approvalCodeHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "workspaceId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "approvedAt" DATETIME,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentConnection_deviceCodeHash_key" ON "AgentConnection"("deviceCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConnection_approvalCodeHash_key" ON "AgentConnection"("approvalCodeHash");

-- CreateIndex
CREATE INDEX "AgentConnection_workspaceId_createdAt_idx" ON "AgentConnection"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentConnection_expiresAt_idx" ON "AgentConnection"("expiresAt");
