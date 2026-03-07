// 🔒 World Loader (Declarative → State)

import { WorldNode, QGMLWorldState } from "../types";

export function loadWorldState(
  world?: WorldNode
): QGMLWorldState {
  const entities: Record<string, any> = {};
  const relations: Record<string, any> = {};

  if (world?.entities) {
    for (const e of world.entities) {
      entities[e.name] = {
        type: e.type,
        persistent: !!e.persistent,
        mutable: !!e.mutable,
      };
    }
  }

  if (world?.relations) {
    for (const r of world.relations) {
      relations[`${r.from}->${r.to}`] = {
        access: r.access,
        trust: r.trust,
      };
    }
  }

  return {
    entities,
    relations,
    system: {},
  };
}
