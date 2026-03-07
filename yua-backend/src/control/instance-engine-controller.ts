import { Request, Response } from "express";
import { enginePrisma as prisma } from "../db/engine-prisma";

/* --------------------------------------------------
   Instance Engine 목록
-------------------------------------------------- */
export async function getInstanceEngines(req: Request, res: Response) {
  const engines = await prisma.instanceEngine.findMany({
    where: { instanceId: req.params.id },
  });

  return res.json({ ok: true, engines });
}

/* --------------------------------------------------
   Engine 활성 / 비활성
-------------------------------------------------- */
export async function toggleInstanceEngine(req: Request, res: Response) {
  const { engineType, enabled } = req.body;

  await prisma.instanceEngine.update({
    where: {
      instanceId_engineType: {
        instanceId: req.params.id,
        engineType,
      },
    },
    data: { enabled },
  });

  return res.json({ ok: true });
}

/* --------------------------------------------------
   Engine 기본 모델 변경
-------------------------------------------------- */
export async function updateEngineModel(req: Request, res: Response) {
  const { engineType, defaultModel } = req.body;

  await prisma.instanceEngine.update({
    where: {
      instanceId_engineType: {
        instanceId: req.params.id,
        engineType,
      },
    },
    data: { defaultModel },
  });

  return res.json({ ok: true });
}
