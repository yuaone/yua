// src/console/yua-shell/renderer.ts

export type RenderType =
  | "info"
  | "error"
  | "success"
  | "prompt"
  | "output";

export interface RenderBlock {
  type: RenderType;
  content: string;
}

const sanitize = (t: string) => t.replace(/\x1b\[[0-9;]*m/g, "");

export function renderInfo(t: string): RenderBlock {
  return { type: "info", content: sanitize(t) };
}

export function renderError(t: string): RenderBlock {
  return { type: "error", content: `❌ ${sanitize(t)}` };
}

export function renderSuccess(t: string): RenderBlock {
  return { type: "success", content: `✔ ${sanitize(t)}` };
}

export function renderOutput(t: string): RenderBlock {
  return { type: "output", content: sanitize(t) };
}

export function renderPrompt(cwd = "~"): RenderBlock {
  return { type: "prompt", content: `yua@local:${cwd}$ ` };
}
