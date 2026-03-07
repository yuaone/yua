import type { QGMLNode } from "../../types/qgml-node";
import type { QIRInstruction } from "../ir/qir";

export function lowerToQIR(node: QGMLNode): QIRInstruction[] {
  switch (node.type) {

    case "engine_call":
      return [{
        type: "engine_call",
        namespace: node.namespace,
        method: node.method,
        args: node.args,
        raw: node.raw ?? ""
      }];

    case "quantum_block":
      return [{
        type: "quantum_block",
        raw: node.raw ?? "",
        body: node.body ?? []
      }];

    case "parallel_block":
      return [{
        type: "parallel_block",
        raw: node.raw ?? "",
        body: node.body ?? []
      }];

    case "timeline_block":
      return [{
        type: "timeline_block",
        raw: node.raw ?? "",
        body: node.body ?? []
      }];

    case "future_block":
      return [{
        type: "future_block",
        raw: node.raw ?? "",
        body: node.body ?? []
      }];

    case "scenario":
      return [{
        type: "scenario",
        raw: node.raw ?? "",
        name: node.name,
        body: node.body ?? []
      }];

    case "branch":
      return [{
        type: "branch",
        raw: node.raw ?? "",
        cases: node.cases
      }];

    case "await":
      return [{
        type: "await",
        raw: node.raw ?? "",
        expr: node.expr
      }];

    case "expr":
      return [{
        type: "expr",
        raw: node.raw ?? "",
        value: node.value
      }];

    case "empty":
      return [];

    default:
      return [{
        type: "engine_call",
        namespace: "system",
        method: "echo",
        args: [`Unknown QGML: ${node.raw ?? ""}`],
        raw: node.raw ?? ""
      }];
  }
}
