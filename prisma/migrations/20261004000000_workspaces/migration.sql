-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceReportSettings" (
    "workspaceId" TEXT NOT NULL PRIMARY KEY,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackChannel" TEXT,
    "hour" INTEGER NOT NULL DEFAULT 9,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceReportSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Extend existing rows without rebuilding or deleting customer data.
DROP INDEX "Workspace_ownerId_key";
ALTER TABLE "Workspace" ADD COLUMN "personalOwnerId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE "Workspace" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "Workspace" ADD COLUMN "membershipVersion" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "Workspace_personalOwnerId_key" ON "Workspace"("personalOwnerId");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");
UPDATE "Workspace" SET "personalOwnerId" = "ownerId" WHERE "ownerId" IS NOT NULL;
INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role") SELECT 'legacy:' || "id", "id", "ownerId", 'owner' FROM "Workspace" WHERE "ownerId" IS NOT NULL;
ALTER TABLE "Action" ADD COLUMN "reportedByUserId" TEXT REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
UPDATE "Action" SET "reportedByUserId" = (SELECT "createdByUserId" FROM "ApiKey" WHERE "ApiKey"."id" = "Action"."reportedByKeyId");
DROP INDEX "Action_workspaceId_agentName_system_externalId_key";
-- Preserve legacy name deduplication only when no stable agent identity exists.
CREATE UNIQUE INDEX "Action_legacy_externalId_key" ON "Action"("workspaceId", "agentName", "system", "externalId") WHERE "agentId" IS NULL;

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_workspaceId_email_idx" ON "WorkspaceInvitation"("workspaceId", "email");

