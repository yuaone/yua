// src/console/yua-shell/parser.ts

export interface ParsedCommand {
  cmd: string;
  args: string[];
  raw: string;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) return { cmd: "", args: [], raw: input };

  // 공백/따옴표-aware tokenizer
  const tokens =
    trimmed.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((t) => t.replace(/"/g, "")) ||
    [];

  return {
    cmd: tokens[0] ?? "",
    args: tokens.slice(1),
    raw: input,
  };
}
