-- CreateTable
CREATE TABLE "terminal_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "terminal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "terminal_sessions_token_key" ON "terminal_sessions"("token");

-- CreateIndex
CREATE INDEX "terminal_sessions_token_idx" ON "terminal_sessions"("token");

-- CreateIndex
CREATE INDEX "terminal_sessions_instanceId_idx" ON "terminal_sessions"("instanceId");

-- AddForeignKey
ALTER TABLE "terminal_sessions" ADD CONSTRAINT "terminal_sessions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "engine_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
