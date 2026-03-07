// 📂 src/db/firebase.ts
import admin from "firebase-admin";

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!base64) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 missing");
  process.exit(1);
}

if (!projectId) {
  console.error("❌ FIREBASE_PROJECT_ID missing");
  process.exit(1);
}

try {
  const json = Buffer.from(base64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(json);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId, // 🔥 Firebase 프로젝트 고정
  });

  console.log("🟢 Firebase Admin initialized");
  console.log("🟢 Firebase projectId =", projectId);
} catch (err) {
  console.error("❌ Firebase Admin init failed:", err);
  process.exit(1);
}

/* ======================================================
   🔥 EXPORTS (기존 코드 완전 호환)
====================================================== */

// Firebase Auth (Admin)
export const auth = admin.auth();

// Firestore DB (🔥 이 줄이 핵심)
export const db = admin.firestore();

// default export (admin 자체)
export default admin;
