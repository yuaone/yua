import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function exportMarkdown(args: {
  markdown: string;
  format: "pdf" | "docx";
}): Promise<Buffer> {
  const tmpDir = "/tmp/yua-doc";
  await fs.mkdir(tmpDir, { recursive: true });

  const mdPath = path.join(tmpDir, "doc.md");
  const outPath = path.join(tmpDir, `doc.${args.format}`);

  await fs.writeFile(mdPath, args.markdown, "utf8");

  await new Promise<void>((resolve, reject) => {
    execFile(
      "pandoc",
      [mdPath, "-o", outPath],
      err => (err ? reject(err) : resolve())
    );
  });

  return fs.readFile(outPath);
}
