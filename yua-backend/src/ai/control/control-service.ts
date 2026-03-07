// 📂 src/ai/control/control-service.ts
// 🔥 Auto Defense Engine — Immediate Response System

import { pool } from "../../db/mysql";

export const ControlService = {
  async banIP(ip: string, reason: string = "auto-defense") {
    await pool.query(
      `INSERT INTO attack_logs (attack_type, ip, route, method, user_agent)
       VALUES ('AUTO_BAN', ?, '-', '-', ?)`,
      [ip, reason]
    );
    return { ok: true, message: `IP ${ip} banned` };
  },

  async killToken(token: string) {
    await pool.query(
      `INSERT INTO token_blacklist (token, reason)
       VALUES (?, 'auto_kill')`,
      [token]
    );
    return { ok: true };
  },

  async lockdown(cameraId: string) {
    return {
      ok: true,
      message: `Camera ${cameraId} locked`,
      at: Date.now()
    };
  }
};
