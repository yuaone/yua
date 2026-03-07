// 📂 src/routes/api-key-router.ts
import { Router } from "express";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { db } from "../db/firebase";

const router = Router();

// 키 저장 파일
const KEY_FILE = path.join(__dirname, "../../keys.json");

// JSON에서 키 불러오기
function loadKeys() {
  if (!fs.existsSync(KEY_FILE)) return [];
  return JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
}

// 키 저장하기
function saveKeys(data: any) {
  fs.writeFileSync(KEY_FILE, JSON.stringify(data, null, 2));
}

/* -------------------------------------------------------
 * 🔵 GET /key/list — 전체 키 목록
 * ----------------------------------------------------- */
router.get("/list", (req, res) => {
  const keys = loadKeys();
  return res.json(keys);
});

/* -------------------------------------------------------
 * 🟣 POST /key/create — API Key 생성 + Firestore 등록
 * ----------------------------------------------------- */
router.post("/create", async (req, res) => {
  try {
    const keys = loadKeys();

    // 1) 원본 키 생성
    const rawKey = "yua-" + uuid();

    // 2) SHA256 해시 생성 (엔진은 이걸 사용)
    const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const newKey = {
      id: uuid(),
      key: rawKey,
      hash,
      plan: "free",
      active: true,
      createdAt: Date.now(),
    };

    // 3) keys.json 저장
    keys.push(newKey);
    saveKeys(keys);

    // 4) Firestore 저장 (엔진이 이걸 읽음)
    await db.collection("api_keys").doc(hash).set({
      hash,
      rawKey,
      plan: "free",
      active: true,
      createdAt: new Date().toISOString(),
    });

    return res.json({ ok: true, key: newKey });
  } catch (err) {
    console.error("🔥 Key Create Error:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to create API key",
    });
  }
});

/* -------------------------------------------------------
 * 🔴 DELETE /key/delete/:id — 키 삭제 + Firestore 삭제
 * ----------------------------------------------------- */
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const keys = loadKeys();

    // JSON 제거
    const selected = keys.find((k: any) => k.id === id);
    const updated = keys.filter((k: any) => k.id !== id);
    saveKeys(updated);

    // Firestore 제거
    if (selected?.hash) {
      await db.collection("api_keys").doc(selected.hash).delete();
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("🔥 Key Delete Error:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to delete key",
    });
  }
});

export default router;
