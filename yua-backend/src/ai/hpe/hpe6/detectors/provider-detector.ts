export function ProviderDetector(code: string, file: string) {
  const issues = [];

  if (code.includes("Provider") && code.includes("require") && !code.includes("import")) {
    issues.push({
      type: "provider",
      file,
      detail: "Mixed require/import detected",
      severity: "high"
    });
  }

  if (code.includes("GPTProvider") && !code.includes("ClaudeProvider")) {
    issues.push({
      type: "provider",
      file,
      detail: "Multi-provider engine incomplete",
      severity: "medium"
    });
  }

  return issues;
}
