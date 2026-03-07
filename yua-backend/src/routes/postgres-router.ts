import { Router } from "express";
import { pgPool } from "../db/postgres";

const router = Router();

router.get("/test", async (req, res) => {
  try {
    const r = await pgPool.query("SELECT NOW() AS now");

    return res.json({
      ok: true,
      now: r.rows[0]?.now,
    });
  } catch (err: any) {
    return res.json({
      ok: false,
      error: err.message,
    });
  }
});

export default router;
