import { Router, Request, Response } from "express";
import { mysqlPool } from "../db/mysql";

const router = Router();

/**
 * 새 Thread 생성
 * body: { userId: string, title?: string }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, title } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId required" });
    }

    const [r]: any = await mysqlPool.query(
      `
      INSERT INTO chat_threads (user_id, title)
      VALUES (?, ?)
    `,
      [userId, title ?? "New Chat"]
    );

    const threadId = r.insertId;

    return res.json({
      ok: true,
      threadId,
    });
  } catch (err: any) {
    console.error("[Thread Create Error]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
