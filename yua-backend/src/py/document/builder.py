# 🔒 YUA Document Builder — SSOT FINAL v1.1
# - TEXT 100% 보존
# - GPT 스타일 자연어
# - 수식 위치 절대 고정

from typing import Dict, Any, List
import hashlib
import re


SECTION_ORDER = [
    "ABSTRACT",
    "PROBLEM_STATEMENT",
    "ASSUMPTIONS",
    "METHOD",
    "FORMULA",
    "CALCULATION",
    "RESULT",
    "INTERPRETATION",
    "LIMITATION",
    "CONCLUSION",
]


# -------------------------
# 🔒 Hash (의미 안정화)
# -------------------------
def _normalize_text(text: str) -> str:
    # 의미 없는 공백/개행 차이 제거 (의미 보존)
    t = text.strip()
    t = re.sub(r"\s+", " ", t)
    return t


def _hash_text(text: str) -> str:
    norm = _normalize_text(text)
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


# -------------------------
# 🔒 도메인별 자연어 톤
# -------------------------
DOMAIN_TONE = {
    "FINANCE": {
        "abstract": "본 문서는 재무적 관점에서 문제를 분석하고 정량적 계산을 통해 결론을 도출한다.",
        "interpretation": "이 결과는 리스크와 불확실성을 고려했을 때 합리적인 수준의 추정치를 의미한다.",
    },
    "PHYSICS": {
        "abstract": "본 문서는 물리 법칙과 수식 모델을 기반으로 현상을 분석한다.",
        "interpretation": "이 결과는 주어진 조건 하에서 물리적으로 타당한 값을 나타낸다.",
    },
    "MEDICAL": {
        "abstract": "본 문서는 통계적 방법과 의학적 가정을 기반으로 분석을 수행한다.",
        "interpretation": "이 결과는 통계적으로 유의미한 경향을 시사한다.",
    },
    "LAW": {
        "abstract": "본 문서는 규칙과 조건을 기반으로 논리적 판단 구조를 분석한다.",
        "interpretation": "이 결론은 주어진 규칙 체계 내에서 일관된 해석에 해당한다.",
    },
    "ENGINEERING": {
        "abstract": "본 문서는 공학적 모델과 수치 해석을 통해 문제를 분석한다.",
        "interpretation": "이 결과는 시스템 설계 관점에서 유효한 해를 제공한다.",
    },
}


def build_document(
    solver_result: Dict[str, Any],
    domain: str,
    document_type: str,
    language: str = "ko",
) -> Dict[str, Any]:
    """
    🔒 SSOT
    - 구조는 여기서 고정
    - LLM은 문장 다듬기만 가능
    """

    steps: List[str] = solver_result.get("steps") or []
    final = solver_result.get("final")
    value = solver_result.get("value")

    domain = domain.upper()
    tone = DOMAIN_TONE.get(domain, DOMAIN_TONE["ENGINEERING"])

    sections: List[Dict[str, str]] = []

    def add(section_type: str, content: str):
        if content and content.strip():
            sections.append({
                "type": section_type,
                "content": content.strip()
            })

    # 1️⃣ ABSTRACT
    add("ABSTRACT", tone["abstract"])

    # 2️⃣ PROBLEM
    add(
        "PROBLEM_STATEMENT",
        f"분석 대상 도메인: {domain}\n문서 유형: {document_type}"
    )

    # 3️⃣ ASSUMPTIONS
    add(
        "ASSUMPTIONS",
        "- 입력 값은 유효하다고 가정한다.\n"
        "- 모델 외부 요인은 고려하지 않는다."
    )

    # 4️⃣ METHOD
    add(
        "METHOD",
        "Solver를 사용하여 기호적 계산 및 수치 해석을 수행하였다."
    )

    # 5️⃣ FORMULA (수식만)
    if isinstance(final, dict) and final:
        formulas = [f"{k} = {v}" for k, v in final.items()]
        add("FORMULA", "\n".join(formulas))
    elif isinstance(final, str) and final.strip():
        add("FORMULA", final.strip())

    # 6️⃣ CALCULATION (과정만)
    if steps:
        add("CALCULATION", "\n".join(steps))

    # 7️⃣ RESULT (자연어 + 값만)
    if value is not None:
        add("RESULT", f"계산 결과 값: {value}")
    else:
        add("RESULT", "계산 결과는 기호적 형태로 도출되었다.")

    # 8️⃣ INTERPRETATION
    add("INTERPRETATION", tone["interpretation"])

    # 9️⃣ LIMITATION
    add(
        "LIMITATION",
        "가정의 범위 및 입력 조건에 따라 결과 해석에는 한계가 존재한다."
    )

    # 🔟 CONCLUSION
    add(
        "CONCLUSION",
        "본 분석은 내부적으로 일관된 계산 결과를 제공하며, 추가 확장이 가능하다."
    )

    # 🔒 순서 강제
    ordered = []
    for t in SECTION_ORDER:
        for s in sections:
            if s["type"] == t:
                ordered.append(s)

    return {
        "meta": {
            "domain": domain,
            "document_type": document_type,
            "language": language,
            # 🔥 다음 단계 대비 (아직 사용 안 함)
            "structure_version": "1.1",
        },
        "sections": [
            {
                "order": i + 1,
                "type": s["type"],
                "content": s["content"],
                "hash": _hash_text(s["content"]),
            }
            for i, s in enumerate(ordered)
        ],
        "file": {
            "uri": None,
            "hash": None,
        },
    }
