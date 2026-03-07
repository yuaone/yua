// src/utils/chat-utils.ts
// ✔ Next.js 15 / TypeScript 호환
// ✔ ChatMessageItem / ChatContainer / MarkdownRenderer 등과 100% 호환
// ✔ 날짜 비교, 날짜 포맷, 메시지 블록 파싱 기능 포함

// 📌 같은 날 메시지인지 비교
export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// 📌 날짜 포맷팅 → "YYYY.MM.DD" 형태로
export function formatDate(date: string | Date): string {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

// ----------------------------------------------------------
// 📌 메시지 내용을 렌더링 가능한 블록으로 분해하는 파서
//   - 코드블록 ```xxx ```
//   - 일반 텍스트
//   - 이미지 URL 자동 감지
// ----------------------------------------------------------

export type ParsedBlock =
  | { type: "text"; content: string }
  | { type: "code"; lang: string | null; content: string }
  | { type: "image"; url: string };

const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;
const IMAGE_URL_REGEX = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp))/gi;

export function parseBlocks(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let lastIndex = 0;

  // 1) 코드 블록 처리
  for (const match of text.matchAll(CODE_BLOCK_REGEX)) {
    const [full, lang, codeContent] = match;
    const index = match.index ?? 0;

    // 코드 블록 이전 텍스트 push
    if (index > lastIndex) {
      const plainText = text.slice(lastIndex, index);
      blocks.push(...splitImagesInText(plainText));
    }

    blocks.push({
      type: "code",
      lang: lang || null,
      content: codeContent,
    });

    lastIndex = index + full.length;
  }

  // 2) 남은 텍스트 처리
  if (lastIndex < text.length) {
    blocks.push(...splitImagesInText(text.slice(lastIndex)));
  }

  return blocks;
}

// 텍스트 안의 이미지 URL을 분리하여 image/text block으로 변환
function splitImagesInText(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(IMAGE_URL_REGEX)) {
    const [url] = match;
    const index = match.index ?? 0;

    if (index > lastIndex) {
      blocks.push({
        type: "text",
        content: text.slice(lastIndex, index),
      });
    }

    blocks.push({
      type: "image",
      url,
    });

    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return blocks;
}