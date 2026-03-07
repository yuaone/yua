import { Request, Response } from "express";
import { db } from "../db/mysql";
import { InstanceAuthedRequest } from "../middleware/instance-access-middleware";

/**
 * GET /api/instance/check
 */
export async function checkInstanceController(
  req: Request,
  res: Response
) {
  const authedReq = req as InstanceAuthedRequest;
  const user = authedReq.user;

  if (!user || !authedReq.instance) {
    return res.status(401).json({ ok: false });
  }

  const [rows]: any = await db.query(
    `
    SELECT id AS instance_id, status, ip_address AS ip
    FROM engine_instances
    WHERE id = ? AND user_id = ?
    LIMIT 1
    `,
    [authedReq.instance.id, user.userId]
  );

  if (!rows?.length) {
    return res.status(404).json({ ok: false });
  }

  return res.json({ ok: true, ...rows[0] });
}

/**
 * POST /api/instance/restart
 */
export async function restartInstanceController(
  req: Request,
  res: Response
) {
  const authedReq = req as InstanceAuthedRequest;

  if (!authedReq.instance) {
    return res.status(400).json({ ok: false });
  }

  return res.json({
    ok: true,
    instance_id: authedReq.instance.id,
    status: "RESTARTING",
  });
}

/**
 * POST /api/instance/deploy
 */
export async function deployInstanceController(
  req: Request,
  res: Response
) {
  const authedReq = req as InstanceAuthedRequest;
  const { image } = authedReq.body;

  if (!image) {
    return res.status(400).json({
      ok: false,
      message: "image is required",
    });
  }

  return res.json({ ok: true });
}
