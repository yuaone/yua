export function TypeDetector(code: string, file: string) {
  const issues = [];

  if (code.includes("any[]") && !code.includes("interface")) {
    issues.push({
      type: "typing",
      file,
      detail: "Loose any[] detected — strongly type it",
      severity: "medium"
    });
  }

  if (code.includes("as unknown as")) {
    issues.push({
      type: "typing",
      file,
      detail: "Forced type casting may cause runtime issue",
      severity: "high"
    });
  }

  return issues;
}
