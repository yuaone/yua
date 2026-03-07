"use client";

import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";

type Props = {
  formula: string;
  inline?: boolean;
};

export default function MathBlock({
  formula,
  inline = false,
}: Props) {
  try {
    if (inline) {
      return (
        <span className="mx-1">
          <InlineMath math={formula} />
        </span>
      );
    }

    return (
      <div className="my-8 overflow-x-auto">
        <BlockMath math={formula} />
      </div>
    );
  } catch (e) {
    return (
      <div className="my-2 text-xs text-red-500">
        수식 렌더링 오류
      </div>
    );
  }
}
