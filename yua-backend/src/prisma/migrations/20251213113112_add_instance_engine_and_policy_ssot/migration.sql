-- CreateEnum
CREATE TYPE "EngineType" AS ENUM ('chat', 'emotion', 'memory', 'finance');

-- CreateTable
CREATE TABLE "instance_engines" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "engineType" "EngineType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultModel" TEXT NOT NULL,
    "allowedModels" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_engines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_policies" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "allowChat" BOOLEAN NOT NULL DEFAULT true,
    "allowEmotion" BOOLEAN NOT NULL DEFAULT true,
    "allowMemory" BOOLEAN NOT NULL DEFAULT true,
    "allowFinance" BOOLEAN NOT NULL DEFAULT false,
    "allowTerminal" BOOLEAN NOT NULL DEFAULT false,
    "allowSSH" BOOLEAN NOT NULL DEFAULT false,
    "maxTokensPerDay" INTEGER,
    "maxRequestsPerDay" INTEGER,
    "ipWhitelist" JSONB,
    "regionLock" TEXT,
    "auditRequired" BOOLEAN NOT NULL DEFAULT false,
    "piiStrictMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instance_engines_instanceId_engineType_key" ON "instance_engines"("instanceId", "engineType");

-- CreateIndex
CREATE UNIQUE INDEX "instance_policies_instanceId_key" ON "instance_policies"("instanceId");

-- AddForeignKey
ALTER TABLE "instance_engines" ADD CONSTRAINT "instance_engines_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "engine_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_policies" ADD CONSTRAINT "instance_policies_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "engine_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
