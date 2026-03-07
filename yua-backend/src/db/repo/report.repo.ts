import { db } from "../firebase";
import { ReportData } from "../models/report.model";

const COLLECTION = "reports";

export const ReportRepo = {
  /**
   * AI 리포트 생성 저장
   */
  async createReport(data: ReportData) {
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
      console.error("❌ ReportRepo.createReport Error:", err);
      return {
        ok: false,
        error: String(err),
      };
    }
  },

  /**
   * 리포트 단건 조회
   */
  async getReport(reportId: string) {
    try {
      const snap = await db.collection(COLLECTION).doc(reportId).get();

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
      console.error("❌ ReportRepo.getReport Error:", err);
      return { ok: false, error: String(err) };
    }
  },

  /**
   * 특정 유저의 리포트 목록 조회
   */
  async listUserReports(userId: string) {
    try {
      const snap = await db
        .collection(COLLECTION)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
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
      console.error("❌ ReportRepo.listUserReports Error:", err);
      return { ok: false, error: String(err) };
    }
  },
};
