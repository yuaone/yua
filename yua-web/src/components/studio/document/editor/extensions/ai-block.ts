import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import AiBlockNodeView from "../nodes/AiBlockNodeView";

export type AiBlockAttrs = {
  id: string;
  prompt: string;
  result: string;
  status: "idle" | "generating" | "done" | "error";
  model: string;
};

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    aiBlock: {
      insertAiBlock: (attrs?: Partial<AiBlockAttrs>) => ReturnType;
    };
  }
}

export const AiBlock = Node.create({
  name: "aiBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addStorage() {
    return {
      authFetch: null as ((url: string, init?: RequestInit) => Promise<Response>) | null,
      docId: null as string | null,
    };
  },

  addAttributes() {
    return {
      id: { default: "" },
      prompt: { default: "" },
      result: { default: "" },
      status: { default: "idle" },
      model: { default: "yua" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="ai-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "ai-block" }),
      HTMLAttributes.prompt || "AI Block",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiBlockNodeView);
  },

  addCommands() {
    return {
      insertAiBlock:
        (attrs) =>
        ({ commands }) => {
          const id = attrs?.id || crypto.randomUUID();
          return commands.insertContent({
            type: this.name,
            attrs: { ...attrs, id },
          });
        },
    };
  },
});
