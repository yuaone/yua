// 📂 src/auth/auth.server.ts

import { auth as firebaseAuth } from "../db/firebase";
import { db } from "../db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

/* ======================================================
   Types (SSOT)
====================================================== */

export type ResolvedUser = {
  userId: number;
  id: number; // ✅ alias
  firebaseUid: string;
  email: string | null;
  name: string | null;
  role?: string;
  authProvider?: "google" | "email" | null;
};

/* ======================================================
   SSOT ENTRY POINT
====================================================== */

export async function getUserFromRequest(
  req: { headers: { get(name: string): string | null } }
): Promise<ResolvedUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!idToken) throw new Error("Empty Authorization token");

  // 🔥 Firebase 검증
  const decoded = await firebaseAuth.verifyIdToken(idToken, true);

  const firebaseUid = decoded.uid;
  if (!firebaseUid) throw new Error("Missing firebase uid");

  const email =
    decoded.email && decoded.email.length > 0
      ? decoded.email
      : `${firebaseUid}@user.local`;

  const decodedName =
    typeof decoded.name === "string" && decoded.name.length > 0
      ? decoded.name
      : null;
  const signInProvider =
    typeof (decoded as any)?.firebase?.sign_in_provider === "string"
      ? (decoded as any).firebase.sign_in_provider
      : null;
  const authProvider =
    signInProvider === "google.com"
      ? "google"
      : signInProvider === "password"
      ? "email"
      : null;

  /* --------------------------------------------------
     MySQL User Resolve (legacy user store 유지)
  -------------------------------------------------- */

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, email, name, role FROM users WHERE firebase_uid = ? LIMIT 1`,
    [firebaseUid]
  );

  if (rows.length > 0) {
    const userId = rows[0].id as number;

    return {
      userId,
      id: userId, // ✅ alias
      firebaseUid,
      email: (rows[0].email as string | null) ?? email,
      name: (rows[0].name as string | null) ?? decodedName,
      role: (rows[0].role as string | null) ?? undefined,
      authProvider,
    };
  }

  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO users (firebase_uid, email, name, tier, role)
     VALUES (?, ?, ?, 'free', 'user')`,
    [firebaseUid, email, decodedName]
  );

  const userId = result.insertId;

  return {
    userId,
    id: userId, // ✅ alias
    firebaseUid,
    email,
    name: decodedName,
    role: "user",
    authProvider,
  };
}
