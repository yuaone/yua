export function cleanMarkdown(text: string): string {
    if (!text) return "";
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\t/g, "  ")
      .trim();
  }
  