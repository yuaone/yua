// 📂 src/control/instance-controller.ts
// ✔ Prisma schema 100% 일치
// ✔ tsc OK
// ✔ SSOT 준수

import { Request, Response } from "express";
import { enginePrisma as prisma } from "../db/engine-prisma";
import crypto from "crypto";

export async function listInstances(req: Request, res: Response) {
  const instances = await prisma.instance.findMany({
    orderBy: { createdAt: "desc" },
  });

  return res.json({ ok: true, instances });
}

export async function createInstance(req: Request, res: Response) {
  const {
    name,
    ownerId,
    cpuTierId,
    nodeTierId,
    engineTierId,
    qpuTierId,
    omegaTierId,
  } = req.body;

  if (!name || !ownerId || !cpuTierId || !nodeTierId || !engineTierId) {
    return res.status(400).json({ ok: false });
  }

  const id = crypto.randomUUID();

  await prisma.instance.create({
    data: {
      id,
      name,
      ownerId,
      status: "CREATED",
      autoscale: false,

      cpuTier: {
        connect: { id: cpuTierId },
      },
      nodeTier: {
        connect: { id: nodeTierId },
      },
      engineTier: {
        connect: { id: engineTierId },
      },

      ...(qpuTierId && {
        qpuTier: { connect: { id: qpuTierId } },
      }),
      ...(omegaTierId && {
        omegaTier: { connect: { id: omegaTierId } },
      }),
    },
  });

  return res.json({ ok: true, instanceId: id });
}
