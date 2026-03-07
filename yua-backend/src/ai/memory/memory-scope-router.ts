
export type { MemoryScope } from "yua-shared/memory/types";
import type { MemoryScope } from "yua-shared/memory/types";

 import type { MemoryIntent } from "./memory-intent";
 export function routeIntentToScope(intent: MemoryIntent): MemoryScope | null {
  switch (intent) {
         // ✅ intent → scope (SSOT)
     case "REMEMBER":
       return "general_knowledge";
     case "ARCHITECTURE":
       return "project_architecture";
     case "DECISION":
       return "project_decision";
     case "CONTEXT":
       return "general_knowledge";
     case "NONE":
     default:
       return null;
    }
  }