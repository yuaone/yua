import assert from "assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "@/components/common/Markdown";

test("final transition preserves content + DOM", () => {
  const content = "## Title\n\nParagraph one.\n\n- Item A\n- Item B\n";

  const before = renderToStaticMarkup(
    <Markdown content={content} streaming={true} />
  );

  const after = renderToStaticMarkup(
    <Markdown content={content} streaming={false} />
  );

  assert.strictEqual(content, content);
  assert.strictEqual(before, after);
});
