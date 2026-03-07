import { db } from "../firebase";
import { RiskRecord } from "../models/risk.model";

const COLLECTION = "riskHistory";

export const RiskRepo = {
  /**
   * 리스크 기록 저장
   */
  async saveRisk(data: RiskRecord) {
    try {
      const docRef = await db.collection(COLLECTION).add({
        ...data,
        createdAt: Date.now(),
      });

      return {
        ok: true,
        id: docRef.id,
      };
    } catch (err) {
      console.error("❌ RiskRepo.saveRisk Error:", err);
      return { ok: false, error: String(err) };
    }
  },

  /**
   * 특정 리스크 기록 조회
   */
  async getRisk(riskId: string) {
    try {
      const snap = await db.collection(COLLECTION).doc(riskId).get();

      if (!snap.exists) {
        return { ok: false, found: false };
      }

      return {
        ok: true,
        found: true,
        id: snap.id,
        data: snap.data(),
      };
    } catch (err) {
      console.error("❌ RiskRepo.getRisk Error:", err);
      return { ok: false, error: String(err) };
    }
  },

  /**
   * 특정 유저의 최근 리스크 히스토리 조회
   */
  async listUserRisk(userId: string, limit = 20) {
    try {
      const snap = await db
        .collection(COLLECTION)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        ok: true,
        list,
      };
    } catch (err) {
      console.error("❌ RiskRepo.listUserRisk Error:", err);
      return { ok: false, error: String(err) };
    }
  },
};
