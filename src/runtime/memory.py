"""YUA Runtime — 대화 기억.

파라미터를 바꾸지 않는 학습. 학습 비용 0, 즉시 반영, 즉시 수정 가능.
JSONL 한 줄이 한 턴이다. 나중에 임베딩 검색으로 갈아끼울 수 있게
recall() 인터페이스만 지키면 된다.
"""

from __future__ import annotations

import json
import re
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

__all__ = ["Memory", "Turn"]

_WORD_RE = re.compile(r"[0-9A-Za-z가-힣]{2,}")
# 검색 신호가 없는 흔한 말 — 한국어 조사/영어 불용어 최소 집합
_STOP = frozenset({
    "그리고", "하지만", "그래서", "이거", "저거", "너는", "나는", "우리",
    "the", "and", "for", "you", "that", "this", "with", "what", "have",
})


@dataclass(frozen=True)
class Turn:
    ts: float
    role: str
    content: str

    @property
    def when(self) -> str:
        return time.strftime("%Y-%m-%d %H:%M", time.localtime(self.ts))


def _has_hangul(text: str) -> bool:
    return any("\uac00" <= ch <= "\ud7a3" for ch in text)


def _tokens(text: str) -> list[str]:
    """검색용 토큰.

    한국어는 조사가 붙어 어절이 매번 달라진다 ("맥미니는" vs "맥미니").
    그래서 한글이 섞인 어절은 글자 bigram으로도 펼쳐 둔다 —
    형태소 분석기 의존성 없이 조사 변형을 흡수하기 위한 최소 장치.
    """
    out: list[str] = []
    for word in _WORD_RE.findall(text):
        lowered = word.lower()
        if lowered in _STOP:
            continue
        out.append(lowered)
        if _has_hangul(lowered):
            out.extend(lowered[i : i + 2] for i in range(len(lowered) - 1))
    return out


class Memory:
    """대화를 디스크에 남기고, 관련된 과거 턴을 되살린다."""

    def __init__(self, path: str | Path, max_recall: int = 4) -> None:
        self.path = Path(path).expanduser()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.max_recall = max_recall
        self._turns: list[Turn] = self._load()

    def _load(self) -> list[Turn]:
        if not self.path.exists():
            return []
        turns: list[Turn] = []
        with self.path.open("r", encoding="utf-8") as fh:
            for line in fh:
                try:
                    d = json.loads(line)
                    turns.append(Turn(d["ts"], d["role"], d["content"]))
                except (json.JSONDecodeError, KeyError):
                    continue        # 깨진 줄은 건너뛴다 — 기억이 통째로 날아가지 않게
        return turns

    def append(self, role: str, content: str) -> None:
        if not content.strip():
            return
        turn = Turn(time.time(), role, content)
        self._turns.append(turn)
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"ts": turn.ts, "role": role, "content": content},
                                ensure_ascii=False) + "\n")

    def recall(self, query: str, exclude_recent: int = 0) -> list[Turn]:
        """질의와 단어가 겹치는 과거 턴을 점수순으로 돌려준다."""
        wanted = set(_tokens(query))
        if not wanted:
            return []

        pool = self._turns[: len(self._turns) - exclude_recent] if exclude_recent else self._turns
        scored: list[tuple[float, Turn]] = []
        for turn in pool:
            counts = Counter(_tokens(turn.content))
            overlap = sum(counts[w] for w in wanted if w in counts)
            if overlap:
                # 짧은 턴이 과대평가되지 않도록 길이로 정규화
                scored.append((overlap / (1 + len(counts) ** 0.5), turn))

        scored.sort(key=lambda p: p[0], reverse=True)
        return [t for _, t in scored[: self.max_recall]]

    def as_context(self, query: str, exclude_recent: int = 0) -> str:
        """시스템 프롬프트에 붙일 회상 블록. 없으면 빈 문자열."""
        hits = self.recall(query, exclude_recent)
        if not hits:
            return ""
        lines = [f"- [{t.when}] {t.role}: {t.content[:200]}" for t in hits]
        return "이전 대화에서 관련 있어 보이는 내용:\n" + "\n".join(lines)

    def __len__(self) -> int:
        return len(self._turns)

    def __bool__(self) -> bool:
        """비어 있어도 항상 True — `if memory:`가 턴 수로 오해되지 않게 한다."""
        return True
