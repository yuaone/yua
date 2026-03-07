import { Response } from "express";
import { InstanceAuthedRequest } from "../middleware/instance-access-middleware";

export async function restartInstanceController(
  req: InstanceAuthedRequest,
  res: Response
) {
  const instance = req.instance!;
  // 👉 yua-agent 호출 등 실제 로직

  return res.json({
    ok: true,
    instance_id: instance.id,
    status: "RESTARTING",
  });
}
