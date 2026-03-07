// 📂 src/scripts/generate-engine-io-docs.ts
// YUA ONE — Engine IO Auto-Documentation Generator (2025.12)

import fs from "fs";
import path from "path";

const DOC_DIR = "src/docs/engine";
const CODE_DIR = "src/ai";

function scanTypescriptFiles(dir: string): string[] {
  let results: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) results = results.concat(scanTypescriptFiles(full));
    else if (item.endsWith(".ts")) results.push(full);
  }
  return results;
}

function extractIO(content: string) {
  const runRegex =
    /async\s+run\s*\(\s*input:\s*([A-Za-z0-9_]+)\s*\)\s*:\s*Promise<\s*([A-Za-z0-9_]+)\s*>/;
  const match = content.match(runRegex);

  if (!match) return null;

  return {
    input: match[1],
    output: match[2],
  };
}

function extractTypeDefinition(content: string, typeName: string): string | null {
  const typeRegex = new RegExp(`export\\s+interface\\s+${typeName}\\s*{([\\s\\S]*?)}`, "m");
  const match = content.match(typeRegex);
  if (!match) return null;

  return `interface ${typeName} {\n${match[1].trim()}\n}`;
}

function updateMarkdown(docFile: string, inputType: string, outputType: string, inputDef: string | null, outputDef: string | null) {
  let md = fs.readFileSync(docFile, "utf8");

  md = md.replace(
    /## 🔗 Input Schema[\s\S]*?```([\s\S]*?)```/,
    `## 🔗 Input Schema\n\`\`\`ts\n${inputDef ?? "// type definition not found"}\n\`\`\``
  );

  md = md.replace(
    /## 🔙 Output Schema[\s\S]*?```([\s\S]*?)```/,
    `## 🔙 Output Schema\n\`\`\`ts\n${outputDef ?? "// type definition not found"}\n\`\`\``
  );

  fs.writeFileSync(docFile, md, "utf8");
  console.log("📘 Updated:", docFile);
}

function processFiles() {
  const tsFiles = scanTypescriptFiles(CODE_DIR);

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, "utf8");
    const io = extractIO(content);
    if (!io) continue;

    const docName = path.basename(file).replace(".ts", ".md");
    const docPath = path.join(DOC_DIR, docName);

    if (!fs.existsSync(docPath)) {
      console.log("⚠ 문서 없음 (건너뜀):", docName);
      continue;
    }

    const inputTypeDef = extractTypeDefinition(content, io.input);
    const outputTypeDef = extractTypeDefinition(content, io.output);

    updateMarkdown(docPath, io.input, io.output, inputTypeDef, outputTypeDef);
  }

  console.log("\n✅ Engine IO documentation updated successfully!");
}

processFiles();
