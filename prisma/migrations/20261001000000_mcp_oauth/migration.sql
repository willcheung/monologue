CREATE TABLE "McpOAuthClient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "redirectUris" JSONB NOT NULL,
  "authMethod" TEXT NOT NULL,
  "secretHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "McpOAuthCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codeHash" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "consumedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "McpOAuthCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "McpOAuthCode_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "McpOAuthToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accessHash" TEXT NOT NULL,
  "refreshHash" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "refreshExpiresAt" DATETIME NOT NULL,
  "rotatedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "McpOAuthToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "McpOAuthToken_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "McpOAuthCode_codeHash_key" ON "McpOAuthCode"("codeHash");
CREATE INDEX "McpOAuthClient_createdAt_idx" ON "McpOAuthClient"("createdAt");
CREATE INDEX "McpOAuthCode_expiresAt_idx" ON "McpOAuthCode"("expiresAt");
CREATE UNIQUE INDEX "McpOAuthToken_accessHash_key" ON "McpOAuthToken"("accessHash");
CREATE UNIQUE INDEX "McpOAuthToken_refreshHash_key" ON "McpOAuthToken"("refreshHash");
CREATE INDEX "McpOAuthToken_keyId_idx" ON "McpOAuthToken"("keyId");
CREATE INDEX "McpOAuthToken_expiresAt_idx" ON "McpOAuthToken"("expiresAt");
