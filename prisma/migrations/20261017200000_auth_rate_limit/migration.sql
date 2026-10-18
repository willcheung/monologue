CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" REAL NOT NULL
);

CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");
