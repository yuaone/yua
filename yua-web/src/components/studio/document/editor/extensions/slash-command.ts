import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
type SlashState = {
  active: boolean;
  range: { from: number; to: number } | null;
  query: string;
};

export const SlashCommandPluginKey = new PluginKey<SlashState>("slashCommand");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin<SlashState>({
        key: SlashCommandPluginKey,
        state: {
          init(): SlashState {
            return { active: false, range: null, query: "" };
          },
          apply(tr, prev): SlashState {
            const meta = tr.getMeta(SlashCommandPluginKey);
            if (meta) return meta;
            if (prev.active && tr.docChanged && prev.range) {
              // Map the range forward through the transaction so typing after / doesn't close the menu
              const newFrom = tr.mapping.map(prev.range.from);
              const newTo = tr.mapping.map(prev.range.to);
              return { ...prev, range: { from: newFrom, to: newTo } };
            }
            return prev;
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = SlashCommandPluginKey.getState(view.state);

            if (event.key === "/" && !state?.active) {
              const { $from } = view.state.selection;
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

              if (textBefore.trim() === "") {
                const from = $from.pos - $from.parentOffset;
                const to = $from.pos;

                setTimeout(() => {
                  view.dispatch(
                    view.state.tr.setMeta(SlashCommandPluginKey, {
                      active: true,
                      range: { from, to: to + 1 },
                      query: "",
                    })
                  );
                }, 10);
              }
            }

            if (state?.active && event.key === "Escape") {
              view.dispatch(
                view.state.tr.setMeta(SlashCommandPluginKey, {
                  active: false,
                  range: null,
                  query: "",
                })
              );
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
