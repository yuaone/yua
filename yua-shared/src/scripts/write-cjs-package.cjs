const fs = require("fs");
const path = require("path");

const dir = path.join(process.cwd(), "dist", "cjs");
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(
  path.join(dir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2)
);

console.log("[yua-shared] wrote dist/cjs/package.json (type=commonjs)");
