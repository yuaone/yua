import { db } from "../firebase";
import { ChatMessage } from "../models/chat.model";

const COLLECTION = "chats";

export const ChatRepo = {
  async addMessage(data: ChatMessage) {
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
      console.error("❌ ChatRepo.addMessage Error:", err);

      return {
        ok: false,
        error: String(err),
      };
    }
  },
};
