// 📂 src/workflow/types.ts
// 🔥 YUA-AI Workflow Types — FINAL (2025.11.28)

export interface NodeData {
  input?: string;
  language?: string;

  // API
  method?: string;
  url?: string;
  headers?: any;
  body?: any;

  // Condition
  condition?: string;
  trueNext?: string;
  falseNext?: string;

  // KB
  query?: string;

  // File
  fileId?: string;
  fileBase64?: string;
  fileName?: string;
  userId?: string;

  // Image
  imageUrl?: string;

  // Advisor
  projectId?: string;
  mode?: string;

  // HPE
  hpeInput?: string;
  hpeContext?: any[];
}

export interface FlowNode {
  id: string;
  type: string;     // task / code / api / hpe ...
  data: NodeData;
}

export interface FlowEdge {
  source: string;
  target: string;
}

export interface FlowInput {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
