import { Router } from "express";
import { pool } from "../db/mysql";
import { RowDataPacket } from "mysql2";

const router = Router();

// 최종 주소: GET /api/mysql/test
router.get("/test", async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT NOW() AS now");

    return res.json({
      ok: true,
      now: rows[0]?.now,
    });
  } catch (err: any) {
    return res.json({
      ok: false,
      error: err.message || String(err),
    });
  }
});

export default router;
