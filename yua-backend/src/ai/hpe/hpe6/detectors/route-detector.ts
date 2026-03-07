export function RouteDetector(code: string, file: string) {
  const issues = [];

  if (code.includes("router.use") && !code.includes("import")) {
    issues.push({
      type: "route",
      file,
      detail: "router.use found without proper import",
      severity: "high"
    });
  }

  if (code.includes("router.use") && code.includes("undefined")) {
    issues.push({
      type: "route",
      file,
      detail: "Undefined router found in router.use",
      severity: "high"
    });
  }

  return issues;
}
