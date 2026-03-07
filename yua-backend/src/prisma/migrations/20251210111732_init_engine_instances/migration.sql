/*
  Warnings:

  - You are about to drop the `Instance` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BillingRecord" DROP CONSTRAINT "BillingRecord_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "ExecutionGraph" DROP CONSTRAINT "ExecutionGraph_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "Instance" DROP CONSTRAINT "Instance_cpuTierId_fkey";

-- DropForeignKey
ALTER TABLE "Instance" DROP CONSTRAINT "Instance_engineTierId_fkey";

-- DropForeignKey
ALTER TABLE "Instance" DROP CONSTRAINT "Instance_nodeTierId_fkey";

-- DropForeignKey
ALTER TABLE "Instance" DROP CONSTRAINT "Instance_omegaTierId_fkey";

-- DropForeignKey
ALTER TABLE "Instance" DROP CONSTRAINT "Instance_qpuTierId_fkey";

-- DropForeignKey
ALTER TABLE "InstanceLog" DROP CONSTRAINT "InstanceLog_instanceId_fkey";

-- DropForeignKey
ALTER TABLE "Snapshot" DROP CONSTRAINT "Snapshot_instanceId_fkey";

-- DropTable
DROP TABLE "Instance";

-- CreateTable
CREATE TABLE "engine_instances" (
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

    CONSTRAINT "engine_instances_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "engine_instances" ADD CONSTRAINT "engine_instances_cpuTierId_fkey" FOREIGN KEY ("cpuTierId") REFERENCES "CpuTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engine_instances" ADD CONSTRAINT "engine_instances_nodeTierId_fkey" FOREIGN KEY ("nodeTierId") REFERENCES "NodeTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engine_instances" ADD CONSTRAINT "engine_instances_engineTierId_fkey" FOREIGN KEY ("engineTierId") REFERENCES "EngineTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engine_instances" ADD CONSTRAINT "engine_instances_qpuTierId_fkey" FOREIGN KEY ("qpuTierId") REFERENCES "QpuTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engine_instances" ADD CONSTRAINT "engine_instances_omegaTierId_fkey" FOREIGN KEY ("omegaTierId") REFERENCES "OmegaTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "engine_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceLog" ADD CONSTRAINT "InstanceLog_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "engine_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "engine_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionGraph" ADD CONSTRAINT "ExecutionGraph_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "engine_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
