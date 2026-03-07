// 🔥 Global CSS Module Declaration for Next.js + TypeScript
// 모든 *.css 파일을 모듈로 인식하도록 선언
// xterm/css/xterm.css 포함하여 import 오류를 100% 해결함

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// xterm 전용 선언 (CSS 모듈이 아닌 global CSS)
// 이 선언이 있어야 import "xterm/css/xterm.css" 에러가 완전히 사라짐
declare module "xterm/css/xterm.css";
