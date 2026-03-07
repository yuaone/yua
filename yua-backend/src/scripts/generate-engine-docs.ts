// 📂 src/scripts/generate-engine-docs.ts
// YUA ONE — Engine Reference Auto Generator (2025.12 FINAL)

import fs from "fs";
import path from "path";

// 생성 대상 엔진 목록
const engines = [
  { file: "engine-map.md", title: "YUA ONE — Engine Map" },
  { file: "gen59-lite.md", title: "Gen5.9-Lite Engine" },
  { file: "omega-lite.md", title: "Omega-Lite Engine" },
  { file: "hpe-3.0.md", title: "HPE 3.0 Engine" },
  { file: "quantum.md", title: "Quantum Engine" },
  { file: "spine.md", title: "YUA Spine Pipeline" },
  { file: "router.md", title: "YUA Router" },
  { file: "routing-engine.md", title: "Routing Engine" },
  { file: "chat-engine.md", title: "Chat Engine" },
  { file: "memory-engine.md", title: "Memory Engine" },
  { file: "stability-kernel.md", title: "Stability Kernel" },
];

// 템플릿 생성 함수
function createTemplate(title: string) {
  return `# ${title}
(2025.12 Official Documentation — Auto Generated)

---

## 📌 Overview
엔진 설명을 작성하는 섹션입니다.
이 문서는 자동 생성되었으며, 이후 수동 보완이 가능합니다.

---

## 🔧 Purpose
- 이 엔진의 역할:
- 사용되는 레이어:
- Spine / Chat / Router 중 어디에 활용되는지:

---

## 🔗 Input Schema
\`\`\`ts
{
  // TODO: 입력 스키마 정의
}
\`\`\`

---

## 🔙 Output Schema
\`\`\`ts
{
  // TODO: 출력 스키마 정의
}
\`\`\`

---

## ⚙ Internal Logic Summary
- 내부 알고리즘 요약:
- Stability Layer 연동 여부:
- Memory 사용 여부:
- HPE / Quantum 보조 여부:

---

## 🧩 Used By
- ChatEngine
- RoutingEngine
- SpineEngine
- Router
- API Route

---

## 📡 API Integration
이 엔진이 아래 API와 어떻게 연동되는지:

- /api/chat/stream
- /api/chat/chat-stream
- /api/chat/spine-stream

---

## 🗂 File Path
\`src/ai/.../*.ts\`

---

## ✏ Notes
필요 시 수동으로 작성 내용을 보완하십시오.

---
Generated automatically by **YUA ONE Engine Doc Generator**.
`;
}

// 실행 함수
function generateDocs() {
  const targetDir = path.join("src", "docs", "engine");

  // 폴더 생성
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log("📁 Created folder:", targetDir);
  }

  // 파일 생성
  engines.forEach(({ file, title }) => {
    const filePath = path.join(targetDir, file);
    const content = createTemplate(title);

    fs.writeFileSync(filePath, content, "utf-8");
    console.log("📝 Generated:", filePath);
  });

  console.log("\n✅ All engine docs generated successfully!");
}

generateDocs();
