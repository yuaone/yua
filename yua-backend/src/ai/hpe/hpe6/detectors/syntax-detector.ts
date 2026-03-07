export function SyntaxDetector(code: string, file: string) {
  const issues = [];

  if (code.includes("<<<<<<<") || code.includes("=======")) {
    issues.push({
      type: "syntax",
      file,
      detail: "Merge conflict marker detected",
      severity: "high"
    });
  }

  if (!code.includes("export")) {
    issues.push({
      type: "syntax",
      file,
      detail: "File missing export statements",
      severity: "medium"
    });
  }

  return issues;
}
