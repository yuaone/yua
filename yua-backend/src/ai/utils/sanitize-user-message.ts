export function sanitizeUserMessage(input: string): string {
  return input
    .replace(/\u0000/g, "") // null byte
    .replace(/\r\n/g, "\n")
    .trim();
}