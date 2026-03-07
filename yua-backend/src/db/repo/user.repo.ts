import { db } from "../firebase";
import { UserProfile } from "../models/user.model";

const COLLECTION = "users";

export const UserRepo = {
  /**
   * 유저 프로필 생성
   */
  async createProfile(data: UserProfile) {
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
      console.error("❌ UserRepo.createProfile Error:", err);
      return {
        ok: false,
        error: String(err),
      };
    }
  },

  /**
   * 유저 프로필 조회
   */
  async getProfile(userId: string) {
    try {
      const snap = await db.collection(COLLECTION).doc(userId).get();

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
      console.error("❌ UserRepo.getProfile Error:", err);
      return { ok: false, error: String(err) };
    }
  },

  /**
   * 유저 프로필 업데이트
   */
  async updateProfile(userId: string, data: Partial<UserProfile>) {
    try {
      await db.collection(COLLECTION).doc(userId).update({
        ...data,
        updatedAt: Date.now(),
      });

      return { ok: true };
    } catch (err) {
      console.error("❌ UserRepo.updateProfile Error:", err);
      return { ok: false, error: String(err) };
    }
  },
};
