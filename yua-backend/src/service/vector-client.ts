// 📂 src/service/vector-client.ts
// 🔥 YUA-AI VectorClient — Qdrant REST Client FINAL (2025.11)

import axios from "axios";

const QDRANT_URL = "http://localhost:6333";

export class VectorClient {
  // 🟢 UPSERT 포인트 생성/업데이트
  static async upsert(collection: string, id: string, vector: number[], payload: any = {}) {
    try {
      const body = {
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      };

      const res = await axios.put(`${QDRANT_URL}/collections/${collection}/points`, body);
      return res.data;
    } catch (err: any) {
      console.error("❌ [VectorClient] upsert 실패:", err.message);
      return { error: true, message: err.message };
    }
  }

  // 🔵 벡터 검색
  static async search(collection: string, vector: number[], limit = 5) {
    try {
      const body = {
        vector,
        limit,
      };

      const res = await axios.post(`${QDRANT_URL}/collections/${collection}/points/search`, body);
      return res.data;
    } catch (err: any) {
      console.error("❌ [VectorClient] search 실패:", err.message);
      return { error: true, message: err.message };
    }
  }
}
