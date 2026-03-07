/**
 * YUA Shell Supervisor (Final Version — SSOT / Fully Integrated)
 * --------------------------------------------------------------
 * - 일반 쉘 명령 처리 (parseCommand)
 * - QGML 처리 (tokenize → compile → executeQGML)
 * - Pipe 처리
 * - runYuaShellCommand(): Terminal.tsx entrypoint
 */

import { parseCommand } from "./parser";
import { tokenize } from "./tokenizer";
import { QGMLCompiler } from "./compiler";
import { executeQGML } from "./executor";

/**
 * Terminal.tsx → supervisor 진입점
 */
export async function runYuaShellCommand(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // QGML 문법: 'qgml …'
  if (trimmed.startsWith("qgml ")) {
    const expr = trimmed.slice(5);
    return runQGMLCommand(expr);
  }

  // 일반 쉘 파싱
  const parsed = parseCommand(trimmed);

  return await executeShell(parsed.cmd, parsed.args);
}

/**
 * QGML 엔진 호출
 */
async function runQGMLCommand(expr: string): Promise<string> {
  try {
    const tokens = tokenize(expr);
    const compiler = new QGMLCompiler();
    const ast = compiler.compile(tokens);
    return await executeQGML(ast, {});
  } catch (err: any) {
    return `QGML Error: ${err.message}`;
  }
}

/**
 * 일반 쉘 명령 실행기
 */
async function executeShell(cmd: string, args: string[]): Promise<string> {
  switch (cmd) {
    case "echo":
      return args.join(" ");

    case "clear":
      return "[clear-screen]";

    case "help":
      return builtinHelp();

    case "pwd":
      return "/";

    case "cd":
      return changeDirectory(args[0]);

    case "ls":
      return listDirectory(args[0]);

    case "cat":
      return readFile(args[0]);

    case "run":
      return runExternal(args);

    case "exec":
      return runExec(args);

    case "yua":
      return runYuaEngine(args);

    case "qgml":
      return runQGMLCommand(args.join(" "));

    default:
      return `unknown command: ${cmd}`;
  }
}

/**
 * Built-in help text
 */
function builtinHelp(): string {
  return `
Available commands:
  echo <text>
  ls [dir]
  cat <file>
  cd <path>
  pwd
  run <command>
  exec <system-call>
  yua <qgml|shell>
  qgml <expression>
  clear
`;
}

/**
 * Built-in虚 Directory Commands
 */
function changeDirectory(path?: string): string {
  if (!path) return "cd: path required";
  return `changed directory → ${path}`;
}

function getCurrentDirectory(): string {
  return "/";
}

function listDirectory(path?: string): string {
  return `listing directory: ${path ?? "."}`;
}

function readFile(path?: string): string {
  if (!path) return "cat: file required";
  return `reading file: ${path}`;
}

/**
 * External command stubs
 */
async function runExternal(args: string[]): Promise<string> {
  return `run → ${args.join(" ")}`;
}

async function runExec(args: string[]): Promise<string> {
  return `exec → ${args.join(" ")}`;
}

/**
 * YUA Engine Integration Stub
 */
async function runYuaEngine(args: string[], stdin?: string): Promise<string> {
  const mode = args[0];

  switch (mode) {
    case "shell":
      return `YUA Shell exec → ${stdin ?? ""}`;
    case "qgml":
      return `YUA QGML exec → ${stdin ?? ""}`;
    default:
      return `yua: unknown mode '${mode}'`;
  }
}
