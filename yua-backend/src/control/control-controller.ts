// 📂 src/control/control-controller.ts

import { Request, Response } from "express";
import { ControlEngine } from "../ai/control/control-engine";
import { ControlService } from "../ai/control/control-service";

export const ControlController = {
  async getSnapshot(req: Request, res: Response) {
    const cameraId = req.query.cameraId as string || "default";
    const data = await ControlEngine.snapshot(cameraId);
    return res.json(data);
  },

  async banIP(req: Request, res: Response) {
    const { ip } = req.body;
    const result = await ControlService.banIP(ip);
    return res.json(result);
  },

  async killToken(req: Request, res: Response) {
    const { token } = req.body;
    const result = await ControlService.killToken(token);
    return res.json(result);
  },

  async lockdown(req: Request, res: Response) {
    const { cameraId } = req.body;
    const result = await ControlService.lockdown(cameraId);
    return res.json(result);
  }
};
