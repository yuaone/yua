import { Request, Response, NextFunction } from "express";
import { DB } from "../db/adapter";
import { logger } from "../utils/logger";

/**
 * Auto-engine DB Middleware
 */
export function autoEngineDB(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  // ⭐ TS에게 “이건 원래 json이다” 라고 속여주기
  res.json = (async (body: any) => {
    try {
      const engineName =
        req.body?.engine ||
        body?.engine ||
        body?.result?.engine ||
        body?.spine?.engine ||
        "unknown";

      await DB.save(engineName, {
        request: req.body,
        response: body,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      logger.error("AutoEngineDB error", err?.message || err);
    }

    return originalJson(body);
  }) as any;   // ⭐ 핵심: 타입 충돌을 제거

  next();
}
