import { Router, Request, Response } from "express";
import { mysqlPool } from "../db/mysql";

const router = Router();

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // thread
    const [[thread]]: any = await mysqlPool.query(
      "SELECT * FROM chat_threads WHERE id = ?",
      [id]
    );

    if (!thread) return res.status(404).json({ ok: false, error: "thread_not_found" });

    // messages
    const [messages]: any = await mysqlPool.query(
      `
      SELECT m.*, 
        (SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', f.id,
              'name', f.file_name,
              'type', f.file_type,
              'url', f.file_url,
              'size', f.size
            )
        ) FROM chat_files f WHERE f.message_id = m.id) AS files
      FROM chat_messages m
      WHERE thread_id = ?
      ORDER BY m.id ASC
    `,
      [id]
    );

    return res.json({
      ok: true,
      thread,
      messages,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
