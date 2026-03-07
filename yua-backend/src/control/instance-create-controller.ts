import { Response } from "express";
import crypto from "crypto";
import { db } from "../db/mysql";
import { InstanceAuthedRequest } from "../middleware/instance-access-middleware";

export async function createInstanceController(
  req: InstanceAuthedRequest,
  res: Response
) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false });
    }

    const { name = "yua-instance", cpu = 2, memory = 4096, disk = 50 } = req.body;
    const instanceId = crypto.randomUUID();

    await db.query(
      `
      INSERT INTO engine_instances
      (id, user_id, name, cpu, memory, disk_size, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PROVISIONING')
      `,
      [instanceId, user.userId, name, cpu, memory, disk]
    );

    return res.json({
      ok: true,
      instance_id: instanceId,
      status: "PROVISIONING",
    });
  } catch (err) {
    console.error("[CREATE INSTANCE ERROR]", err);
    return res.status(500).json({ ok: false });
  }
}
