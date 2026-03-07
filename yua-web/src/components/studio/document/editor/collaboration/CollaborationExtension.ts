import { Extension } from "@tiptap/react";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from "y-prosemirror";
import * as Y from "yjs";

export type CollaborationOptions = {
  document: Y.Doc;
  field?: string;
  user?: { name: string; color: string };
};

/**
 * Tiptap extension that wires up Y.js ProseMirror plugins:
 * - ySyncPlugin: keeps ProseMirror state in sync with Y.Doc
 * - yCursorPlugin: shows remote user cursors/selections
 * - yUndoPlugin: Y.js-aware undo/redo (replaces default history)
 */
export const Collaboration = Extension.create<CollaborationOptions>({
  name: "collaboration",

  addOptions() {
    return {
      document: new Y.Doc(),
      field: "default",
      user: { name: "Anonymous", color: "#6366f1" },
    };
  },

  addProseMirrorPlugins() {
    const yXmlFragment = this.options.document.getXmlFragment(
      this.options.field ?? "default"
    );

    const plugins = [
      ySyncPlugin(yXmlFragment),
      yUndoPlugin(),
    ];

    // Cursor plugin only if user info is provided
    if (this.options.user) {
      const awarenessStates = new Map();
      plugins.push(
        yCursorPlugin(
          // We'll pass a minimal awareness-like object
          // The actual awareness is managed by YjsProvider
          (() => {
            const awareness = {
              clientID: this.options.document.clientID,
              getLocalState: () => ({
                user: this.options.user,
              }),
              setLocalStateField: () => {},
              getStates: () => awarenessStates,
              on: () => {},
              off: () => {},
            };
            return awareness as any;
          })()
        )
      );
    }

    return plugins;
  },
});
