import { query } from "../db-wrapper";

export interface MatchCode {
  id?: number;
  code: string;
  userId: string;
  createdAt: number;
  used: boolean;
  usedAt: number | null;
}

export const MatchRepo = {
  async createCode(data: MatchCode) {
    const sql = `
      INSERT INTO match_codes (code, user_id, created_at, used, used_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      data.code,
      data.userId,
      data.createdAt,
      data.used,
      data.usedAt
    ]) as any;   // INSERT → ResultSetHeader

    return {
      ok: true,
      id: result.insertId ?? null
    };
  },

  async getRecentCode(userId: string) {
    const sql = `
      SELECT * FROM match_codes
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const rows = await query(sql, [userId]) as any[]; // SELECT → 배열

    if (!rows || rows.length === 0)
      return { ok: true, found: false };

    return { ok: true, found: true, data: rows[0] };
  },

  async findCode(code: string) {
    const sql = `
      SELECT * FROM match_codes
      WHERE code = ?
      LIMIT 1
    `;

    const rows = await query(sql, [code]) as any[]; // SELECT → 배열

    if (!rows || rows.length === 0)
      return { ok: false, found: false };

    return { ok: true, found: true, data: rows[0] };
  },

  async useCode(codeId: number) {
    const sql = `
      UPDATE match_codes
      SET used = TRUE, used_at = ?
      WHERE id = ? AND used = FALSE
    `;

    const result = await query(sql, [Date.now(), codeId]) as any; // UPDATE → ResultSetHeader

    if (!result.affectedRows)
      return { ok: false, error: "코드 사용 불가 또는 이미 사용됨" };

    return { ok: true };
  }
};
