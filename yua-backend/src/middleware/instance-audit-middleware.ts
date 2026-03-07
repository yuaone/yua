import { Response, NextFunction } from "express";
import { db } from "../db/mysql";
import { InstanceAuthedRequest } from "./instance-access-middleware";

export function recordInstanceHistory(action: string) {
  return (req: InstanceAuthedRequest, res: Response, next: NextFunction) => {
    res.on("finish", async () => {
      try {
        /**
         * 🔐 SSOT 기준:
         * - 인증 유저 정보는 req.user 안에만 존재
         * - instance 정보는 req.instance
         */
        const user = req.user;
        const instance = req.instance;

        if (!user || !instance) return;

        await db.query(
          `
          INSERT INTO instance_history (instance_id, user_id, action, meta)
          VALUES (?, ?, ?, ?)
          `,
          [
            instance.id,
            user.userId,
            action,
            JSON.stringify({
              status: res.statusCode,
              method: req.method,
              path: req.originalUrl,
            }),
          ]
        );
      } catch (err) {
        console.error("[AUDIT ERROR]", err);
      }
    });

    next();
  };
}
