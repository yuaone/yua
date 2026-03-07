// src/console/yua-shell/executor.ts

import { QGMLNode } from "./grammar";
import { runYuaShellCommand } from "./supervisor";

export async function executeQGML(ast: QGMLNode, session: any) {
  if (!ast || ast.type !== "COMMAND") {
    throw new Error("Invalid QGML AST root");
  }

  const command = ast.value;
  const args = ast.args ?? [];

  const result = await runYuaShellCommand(
    [command, ...args.map((a) => a.value)].join(" ")
  );

  return typeof result === "string" ? result : JSON.stringify(result);
}
