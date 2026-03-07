// markdown-utils.ts
type MdNode = {
  type?: string;
  value?: string;
  children?: MdNode[];
};

/**
 * mdast node에서 사람이 읽을 수 있는 텍스트만 재귀 추출
 * - table / paragraph / emphasis / link / inlineCode 대응
 * - value 없는 노드는 children 순회
 */
export function extractText(node: MdNode | MdNode[] | undefined): string {
  if (!node) return "";

  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }

  if (typeof node.value === "string") {
    return node.value;
  }

  if (Array.isArray(node.children)) {
    return node.children.map(extractText).join("");
  }

  return "";
}
