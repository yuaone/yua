const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const MarkdownMod = require('/home/dmsal020813/projects/yua-web/src/components/common/Markdown.tsx');
const Markdown = MarkdownMod.default || MarkdownMod;

const input = "1️⃣ 먼저 '디자인 기준'을 하나로 잡아\n이것만 잘하면 보통 세 가지가 좋아.\n\n- 첫번째 불릿\n- 두번째 불릿";
const el = React.createElement(Markdown, { content: input, streaming: false, rhythm: 'flow' });
console.log(renderToStaticMarkup(el));
