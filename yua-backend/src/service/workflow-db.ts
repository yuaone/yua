// 📂 src/service/workflow-db.ts
// 🔥 YA-ENGINE — Workflow Firestore Service FINAL (2025.11)
// ✔ Firestore CRUD 유지
// ✔ MySQL 로그 필요 없음 (controller에서 담당)
// ✔ strict mode 100% 호환

import { db } from "../db/firebase";
import { v4 as uuid } from "uuid";

const COLLECTION = "workflows";

/* -------------------------------------------------
 * Workflow 저장
 * ------------------------------------------------- */
export async function saveWorkflow(title: string, flow: any) {
  const id = uuid();

  const data = {
    id,
    title,
    flow,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.collection(COLLECTION).doc(id).set(data);

  return data;
}

/* -------------------------------------------------
 * Workflow 목록 불러오기
 * ------------------------------------------------- */
export async function listWorkflows() {
  const snap = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) =>
    d.data()
  );
}

/* -------------------------------------------------
 * Workflow 단일 조회
 * ------------------------------------------------- */
export async function getWorkflow(id: string) {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return snap.data();
}
