import { db } from "../db/mysql";

async function test() {
  try {
    const [rows] = await db.query("SELECT NOW() AS now");
    console.log("✅ MySQL Connected Successfully!");
    console.log("📌 Server Time:", rows);
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err);
  }
}

test();
