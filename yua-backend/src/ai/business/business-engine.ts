// 📂 src/ai/business/business-engine.ts
// 🔥 Strict TS 버전 (QueryResult 호환 완벽)

import { query } from "../../db/db-wrapper";
import type { RowDataPacket } from "mysql2";
import type {
  BusinessOCRResult,
  BusinessProfile,
} from "./business.types";

export const BusinessEngine = {
  /**
   * 📝 DB에 사업자 정보 저장 (Insert or Update)
   */
  async saveProfile(
    userId: string,
    profile: BusinessOCRResult
  ): Promise<void> {
    const now = Date.now();

    await query(
      `
      INSERT INTO business_profiles
      (user_id, business_number, name, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        business_number = VALUES(business_number),
        name = VALUES(name),
        type = VALUES(type),
        updated_at = VALUES(updated_at)
      `,
      [
        userId,
        profile.businessNumber,
        profile.name,
        profile.type,
        now,
        now,
      ]
    );
  },

  /**
   * 🔍 현재 사업자 등록 상태 조회
   */
  async getStatus(userId: string): Promise<BusinessProfile | null> {
    const rows = (await query(
      `SELECT * FROM business_profiles WHERE user_id = ? LIMIT 1`,
      [userId]
    )) as RowDataPacket[];

    return rows.length > 0
      ? (rows[0] as BusinessProfile)
      : null;
  },
};
