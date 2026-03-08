// src/renderer/lib/answer/closeCopy.ts
// Ported from yua-web/src/lib/answer/closeCopy.ts

import type { CloseIntent } from "./closeTypes";

export const closeCopyMap: Record<
  CloseIntent,
  {
    LOW: string[];
    MID: string[];
    HIGH: string[];
  }
> = {
  CONTINUE: {
    LOW: ["조금 더 정리해볼 필요가 있어."],
    MID: [
      "필요하면 이걸 더 풀어서 볼 수 있어.",
      "여기서 한 단계 더 들어갈 수도 있어.",
    ],
    HIGH: ["이 다음 단계로 바로 넘어가도 돼."],
  },

  APPLY: {
    LOW: ["간단한 부분부터 써보면 좋아."],
    MID: ["지금 상황에 맞는 부분부터 써보면 돼."],
    HIGH: ["이대로 적용해도 무리 없을 거야."],
  },

  DECIDE: {
    LOW: ["어느 쪽이 맞는지부터 정해보자."],
    MID: ["이제 방향만 하나 고르면 돼."],
    HIGH: ["이 선택으로 바로 진행하면 돼."],
  },

  VERIFY: {
    LOW: ["조금만 더 확인해보자."],
    MID: ["어느 쪽이 필요한지부터 정해보자."],
    HIGH: ["이 부분만 확인하면 충분해."],
  },

  STOP: {
    LOW: [],
    MID: [],
    HIGH: [],
  },
};
