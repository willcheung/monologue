-- Existing approval links keep the reporting-only permission they originally showed.
ALTER TABLE "AgentConnection" ADD COLUMN "approvedScopes" TEXT NOT NULL DEFAULT 'actions:write';
