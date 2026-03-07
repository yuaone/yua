// 📂 src/controllers/task-controller.ts
import { Request, Response } from "express";
import { TaskAutomationEngine } from "../ai/task/task-automation-engine";

export const taskController = {
  async add(req: Request, res: Response) {
    try {
      const { id, cron, action, payload } = req.body;

      await TaskAutomationEngine.add({
        id,
        cron,
        action,
        payload,
        enabled: true,
      });

      return res.json({ ok: true, id });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const { id } = req.body;
      await TaskAutomationEngine.remove(id);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  },
};
