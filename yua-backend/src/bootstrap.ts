import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

console.log("🔥 BASE64 LOADED:", Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64));



import("./server/server.js");

