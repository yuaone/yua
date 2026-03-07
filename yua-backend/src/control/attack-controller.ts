// 📂 src/controllers/attack-controller.ts
// 🔥 Attack Controller — 실서비스 운영판

import { Request, Response } from "express";
import { pool } from "../db/mysql";

export const AttackController = {
  async list(req: Request, res: Response) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM attack_logs ORDER BY id DESC LIMIT 200"
      );
      return res.json({ ok: true, attacks: rows });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  async stats(req: Request, res: Response) {
    try {
      const [rows] = await pool.query(`
        SELECT attack_type, COUNT(*) AS count
        FROM attack_logs
        GROUP BY attack_type
        ORDER BY count DESC
      `);
      return res.json({ ok: true, stats: rows });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },
};
