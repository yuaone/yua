// src/console/yua-shell/autocomplete.ts

/**
 * TAB 자동완성 엔진
 * 기본 명령어 + fuzzy matching
 */

const defaultCommands = [
  "help",
  "clear",
  "ls",
  "cd",
  "run",
  "exec",
  "echo",
  "pwd",
  "mkdir",
  "touch",
  "qgml",
  "engine",
  "status",
];

export function autocomplete(input: string): string[] {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) return defaultCommands;

  const startsWith = defaultCommands.filter((cmd) =>
    cmd.startsWith(trimmed)
  );

  if (startsWith.length) return startsWith;

  // fallback fuzzy match
  return defaultCommands.filter((cmd) => cmd.includes(trimmed));
}
