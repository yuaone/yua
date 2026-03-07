-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('CREATED', 'RUNNING', 'STOPPED', 'ERROR');

-- CreateTable
CREATE TABLE "Instance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cpuTierId" TEXT NOT NULL,
    "nodeTierId" TEXT NOT NULL,
    "engineTierId" TEXT NOT NULL,
    "qpuTierId" TEXT,
    "omegaTierId" TEXT,
    "status" "InstanceStatus" NOT NULL DEFAULT 'CREATED',
    "autoscale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpuTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cores" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CpuTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodes" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "NodeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EngineTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QpuTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parallel" BOOLEAN NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QpuTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmegaTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cognitive" BOOLEAN NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OmegaTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanceLog" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionGraph" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_history" (
    "id" SERIAL NOT NULL,
    "snapshot_name" TEXT NOT NULL,
    "instance_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshot_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_cpuTierId_fkey" FOREIGN KEY ("cpuTierId") REFERENCES "CpuTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_nodeTierId_fkey" FOREIGN KEY ("nodeTierId") REFERENCES "NodeTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_engineTierId_fkey" FOREIGN KEY ("engineTierId") REFERENCES "EngineTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_qpuTierId_fkey" FOREIGN KEY ("qpuTierId") REFERENCES "QpuTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_omegaTierId_fkey" FOREIGN KEY ("omegaTierId") REFERENCES "OmegaTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceLog" ADD CONSTRAINT "InstanceLog_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionGraph" ADD CONSTRAINT "ExecutionGraph_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
