// 📂 src/scripts/generate-missing-engine-docs.ts
// YUA ONE — Missing Engine Docs Auto Generator (2025.12)

import fs from "fs";
import path from "path";

const DOC_DIR = "src/docs/engine";
const CODE_DIR = "src/ai";

// 기본 템플릿
function baseTemplate(title: string) {
  return `# ${title}
(2025.12 Auto Generated — Private Internal Doc)

---

## 📌 Overview
이 문서는 자동 생성된 엔진 레퍼런스 문서입니다.
내부 엔진 구조를 추적하기 위한 Private Doc이며 외부로 공개되지 않습니다.

---

## 🔧 Purpose
- 해당 엔진의 역할:
- 사용되는 레이어:
- 연동되는 상위 엔진:

---

## 🔗 Input Schema
\`\`\`ts
// 추후 자동 채워짐 (generate-engine-io-docs.ts)
\`\`\`

---

## 🔙 Output Schema
\`\`\`ts
// 추후 자동 채워짐 (generate-engine-io-docs.ts)
\`\`\`

---

## ⚙ Internal Logic Summary
- 내부 알고리즘 요약:
- Stability Kernel 연동 여부:
- Memory Engine 연동 여부:
- Quantum/HPE 참조 여부:

---

## 🧩 Connected Modules
- ChatEngine
- RoutingEngine
- SpineEngine
- Router
- Internal Sub-Modules

---

## 🗂 File Path
자동 연결됨.

---

Generated automatically by YUA ONE Doc Generator.
`;
}

// TS 파일 전체 스캔
function scanTsFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(scanTsFiles(full));
    else if (item.endsWith(".ts")) results.push(full);
  }

  return results;
}

function generateMissingDocs() {
  const tsFiles = scanTsFiles(CODE_DIR);

  if (!fs.existsSync(DOC_DIR)) {
    fs.mkdirSync(DOC_DIR, { recursive: true });
    console.log("📁 Created:", DOC_DIR);
  }

  for (const file of tsFiles) {
    const base = path.basename(file).replace(".ts", "");
    const mdFile = path.join(DOC_DIR, `${base}.md`);

    if (fs.existsSync(mdFile)) {
      console.log("✔ 이미 문서 있음:", `${base}.md`);
      continue;
    }

    const title =
      base
        .replace(/-/g, " ")
        .replace(/\b\w/g, (x) => x.toUpperCase()) + " Engine";

    fs.writeFileSync(mdFile, baseTemplate(title), "utf8");
    console.log("📝 생성됨:", `${base}.md`);
  }

  console.log("\n✅ Missing engine docs generated successfully!");
}

generateMissingDocs();
