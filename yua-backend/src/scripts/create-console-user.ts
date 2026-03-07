// 📂 scripts/create-console-user.ts
// 🔥 YA-ENGINE — Console User Creator (2025.11 FINAL)
// -------------------------------------------------------
// 사용법:
//   npx ts-node scripts/create-console-user.ts email password role name
// -------------------------------------------------------

import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "../db/firebase";

// 터미널 입력: email password role name
const [,, email, password, role, name] = process.argv;

async function run() {
  try {
    if (!email || !password || !role || !name) {
      console.log("❌ 사용법: email password role name");
      console.log("예시: npx ts-node scripts/create-console-user.ts admin@test.com 1234 superadmin 정원");
      return;
    }

    if (!["developer", "superadmin"].includes(role)) {
      console.log("❌ role 은 developer 또는 superadmin 만 가능합니다");
      return;
    }

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);

    const userData = {
      id,
      email,
      name,
      role,
      passwordHash,
      createdAt: Date.now(),
    };

    await db.collection("console_users").doc(id).set(userData);

    console.log("✅ 사용자 생성 완료!");
    console.log("--------------------------");
    console.log(`ID: ${id}`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log("--------------------------");
    console.log("🔥 Firestore: console_users 컬렉션에 저장됨");
  } catch (e: any) {
    console.error("❌ 사용자 생성 실패:", e.message);
  }
}

run();
