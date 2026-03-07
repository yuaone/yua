from fastapi import FastAPI
from pydantic import BaseModel, Field
from fastapi.concurrency import run_in_threadpool
import argostranslate.translate
import hashlib
import os
import re
import json
import time
import urllib.parse
import urllib.request
import urllib.error
from typing import Optional, Tuple, List, Dict

# Optional deps (서버 죽지 않게)
try:
    import redis  # pip install redis
except Exception:
    redis = None

try:
    from langdetect import detect  # pip install langdetect
except Exception:
    detect = None


app = FastAPI(title="YUA Translator", version="1.0.0")

DEBUG_TRANSLATOR = os.getenv("DEBUG_TRANSLATOR", "0") == "1"

GOOGLE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "").strip()
GOOGLE_ENDPOINT = os.getenv(
    "GOOGLE_TRANSLATE_ENDPOINT",
    "https://translation.googleapis.com/language/translate/v2",
).strip()


def dlog(msg: str, payload: Optional[dict] = None):
    if not DEBUG_TRANSLATOR:
        return
    if payload is None:
        print(f"[TRANSLATOR] {msg}")
    else:
        print(f"[TRANSLATOR] {msg} {payload}")


# ----------------------------
# Request/Response
# ----------------------------

class Req(BaseModel):
    text: str = Field(..., description="Input text")
    target: str = Field(..., description="Target language code, e.g. 'ko', 'en'")
    source: Optional[str] = Field(None, description="Optional source language code")


class Res(BaseModel):
    text: str
    source: str
    target: str
    cached: bool = False
    pivoted: bool = False


# ----------------------------
# Redis (optional)
# ----------------------------

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", str(60 * 60 * 24 * 7)))  # 7d
TRANSLATOR_CACHE_EPOCH = os.getenv("TRANSLATOR_CACHE_EPOCH", "").strip()

redis_client = None
if redis is not None:
    try:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            decode_responses=True,
            socket_connect_timeout=0.2,
            socket_timeout=0.4,
        )
        redis_client.ping()
    except Exception:
        redis_client = None


def cache_key(source: str, target: str, text: str) -> str:
    # text 그대로 hash (원문 단위 캐시)
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return f"trans:auto:{CACHE_POLICY_VERSION}:{source}:{target}:{h}"


# ----------------------------
# Language helpers
# ----------------------------

def normalize_lang(code: str) -> str:
    # langdetect는 'ko', 'en' 같은 걸 주로 줌. 혹시 'zh-cn' 같은 케이스 대비
    code = (code or "").strip().lower()
    if code in ("zh-cn", "zh_cn"):
        return "zh"
    if code in ("zh-tw", "zh_tw"):
        return "zt"
    return code


Segment = Tuple[str, str]  # (type, text)

CODE_BLOCK_RE = re.compile(r"```[\s\S]*?```")
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
URL_RE = re.compile(r"https?://[^\s)]+")
FORCED_TOKEN_RE = re.compile(
    r"(?:\b(?:baseDir|cwd|run_process|child_process|stdio|MCP|read/write)\b|JSON-RPC)"
)
IDENTIFIER_RE = re.compile(
    r"(?:"
    r"[A-Za-z]:\\[^\s]+"
    r"|(?:\.{0,2}/)[^\s]+"
    r"|--[A-Za-z0-9_-]+"
    r"|\b[A-Za-z_][A-Za-z0-9]*_[A-Za-z0-9_]+\b"
    r"|\b[A-Za-z][A-Za-z0-9]*[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*\b"
    r"|\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b"
    r"|\b[A-Za-z0-9_.-]+\.(?:ts|tsx|js|jsx|py|json|yaml|yml|md|sh|sql)\b"
    r")"
)
UUID_RE = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b")
VERSION_RE = re.compile(r"\bv?\d+\.\d+(?:\.\d+)?(?:[-+._][A-Za-z0-9]+)*\b")
NUMBER_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")

PROTECT_RE = re.compile(
    "|".join(
        [
            URL_RE.pattern,
            FORCED_TOKEN_RE.pattern,
            INLINE_CODE_RE.pattern,
            UUID_RE.pattern,
            VERSION_RE.pattern,
        ]
    )
)


def _build_cache_policy_version() -> str:
    policy = {
        "epoch": TRANSLATOR_CACHE_EPOCH,
        "google_endpoint": GOOGLE_ENDPOINT,
        "has_google_key": bool(GOOGLE_API_KEY),
        "protect_re": PROTECT_RE.pattern,
        "forced_token_re": FORCED_TOKEN_RE.pattern,
        "quality_ratio_min": 0.30,
        "quality_ratio_max": 2.80,
        "quality_mixed_join_noise": 3,
        "batch_size": 32,
        "batch_max_len": 2000,
        "cache_len_min": 5,
        "cache_len_max": 4000,
        "fallback_argos_enabled": False,
    }
    raw = json.dumps(policy, ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


CACHE_POLICY_VERSION = _build_cache_policy_version()
if DEBUG_TRANSLATOR:
    dlog("cache_policy", {"version": CACHE_POLICY_VERSION})


def detect_language_simple(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return "unknown"
    if re.search(r"[\uac00-\ud7a3]", s):
        return "ko"
    ascii_letters = len(re.findall(r"[A-Za-z]", s))
    non_space = max(1, len(re.sub(r"\s+", "", s)))
    if (ascii_letters / non_space) >= 0.45:
        return "en"
    return "unknown"


def detect_language_from_segments(segments: List[Segment]) -> str:
    ko_weight = 0
    en_weight = 0

    for seg_type, seg_text in segments:
        if seg_type != "TEXT":
            continue
        if not (seg_text or "").strip():
            continue

        protected, _, _ = protect_tokens(seg_text)
        # placeholder는 언어판별에서 제외
        cleaned = re.sub(r"⟦X\d+⟧", " ", protected)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if not cleaned:
            continue

        lang = detect_language_simple(cleaned)
        weight = max(1, len(re.sub(r"\s+", "", cleaned)))
        if lang == "ko":
            ko_weight += weight
        elif lang == "en":
            en_weight += weight

    if ko_weight == 0 and en_weight == 0:
        return "unknown"
    return "ko" if ko_weight >= en_weight else "en"


FORCED_TOKEN_MARK_RE = re.compile(
    r"(?<!`)\b(baseDir|cwd|run_process|child_process|stdio|MCP|read/write)\b(?!`)|(?<!`)JSON-RPC(?!`)"
)


def mark_forced_tokens_as_inline_code(text: str) -> str:
    src = text or ""
    if not src:
        return src
    return FORCED_TOKEN_MARK_RE.sub(lambda m: f"`{m.group(0)}`", src)


def segment_text(text: str) -> List[Segment]:
    src = text or ""
    if not src:
        return [("TEXT", "")]

    out: List[Segment] = []
    cursor = 0

    for m in CODE_BLOCK_RE.finditer(src):
        if m.start() > cursor:
            out.extend(_segment_non_code(src[cursor:m.start()]))
        out.append(("CODE_BLOCK", m.group(0)))
        cursor = m.end()

    if cursor < len(src):
        out.extend(_segment_non_code(src[cursor:]))

    return out if out else [("TEXT", src)]


def _segment_non_code(text: str) -> List[Segment]:
    if not text:
        return []

    out: List[Segment] = []
    i = 0
    L = len(text)
    while i < L:
        matches = []
        for seg_type, pattern in (
            ("URL", URL_RE),
            ("INLINE_CODE", INLINE_CODE_RE),
        ):
            m = pattern.search(text, i)
            if m:
                matches.append((m.start(), m.end(), seg_type, m.group(0)))

        if not matches:
            out.append(("TEXT", text[i:]))
            break

        start, end, seg_type, value = min(matches, key=lambda x: x[0])
        if start > i:
            out.append(("TEXT", text[i:start]))
        out.append((seg_type, value))
        i = end

    return out


def protect_tokens(text: str) -> Tuple[str, Dict[str, str], List[str]]:
    src = text or ""
    if not src:
        return "", {}, []

    ph_to_token: Dict[str, str] = {}
    placeholders: List[str] = []
    idx = 0

    def replacer(match: re.Match[str]) -> str:
        nonlocal idx
        ph = f"⟦X{idx}⟧"
        idx += 1
        token = match.group(0)
        ph_to_token[ph] = token
        placeholders.append(ph)
        return ph

    # single-pass replacement to avoid rematching placeholder internals
    out = PROTECT_RE.sub(replacer, src)

    return out, ph_to_token, placeholders


def restore_tokens(text: str, ph_to_token: Dict[str, str]) -> str:
    out = text or ""
    for ph, token in ph_to_token.items():
        out = out.replace(ph, token)

    return normalize_mixed_spacing(out)


def normalize_mixed_spacing(text: str) -> str:
    out = text or ""
    # Post-restore spacing normalization for mixed Korean/technical tokens.
    # Prevents artifacts like "주목lsWindows" from placeholder restoration.
    out = re.sub(r"([\uac00-\ud7a3])([A-Za-z`_./\\-])", r"\1 \2", out)
    out = re.sub(r"([A-Za-z`_./\\-])([\uac00-\ud7a3])", r"\1 \2", out)
    out = re.sub(r"([.!?])([A-Za-z`_./\\-])", r"\1 \2", out)
    out = re.sub(r"\s+([.,!?;:])", r"\1", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def quality_check(original: str, translated: str, target: str, placeholders: List[str]) -> bool:
    if not translated:
        return False

    for ph in placeholders:
        if ph not in translated:
            return False

    in_len = max(1, len(original.strip()))
    out_len = max(1, len(translated.strip()))
    ratio = out_len / in_len
    if ratio < 0.30 or ratio > 2.80:
        return False

    if target == "ko":
        latin = len(re.findall(r"[A-Za-z]", translated))
        hangul = len(re.findall(r"[\uac00-\ud7a3]", translated))
        non_space = max(1, len(re.sub(r"\s+", "", translated)))
        latin_ratio = latin / non_space
        hangul_ratio = hangul / non_space
        mixed_join_noise = len(re.findall(r"[\uac00-\ud7a3][A-Za-z]{2,}|[A-Za-z]{2,}[\uac00-\ud7a3]", translated))
        if latin >= 12 and hangul == 0:
            return False
        if latin_ratio > 0.75 and hangul_ratio < 0.05:
            return False
        if mixed_join_noise >= 3:
            return False

    return True


def high_quality_translate(text: str, source: str, target: str) -> Optional[str]:
    # v2 stub only
    return None


def _google_translate_v2_request(q_list: List[str], source: str, target: str) -> List[str]:
    if not GOOGLE_API_KEY:
        raise RuntimeError("google_api_key_missing")
    if not q_list:
        return []

    pairs = [("key", GOOGLE_API_KEY), ("target", target), ("format", "text")]
    if source and source != "unknown":
        pairs.append(("source", source))
    for q in q_list:
        pairs.append(("q", q))

    body = urllib.parse.urlencode(pairs).encode("utf-8")
    req = urllib.request.Request(
        GOOGLE_ENDPOINT,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=2.5) as resp:
        raw = resp.read().decode("utf-8")
    parsed = json.loads(raw)
    data = parsed.get("data", {}).get("translations", [])
    out = []
    for item in data:
        text = item.get("translatedText", "")
        out.append(text if isinstance(text, str) else "")
    if len(out) != len(q_list):
        raise RuntimeError("google_invalid_response_length")
    return out


async def google_translate_v2_batch(q_list: List[str], source: str, target: str) -> Optional[List[str]]:
    if not GOOGLE_API_KEY:
        return None
    if not q_list:
        return []

    start = time.monotonic()
    for attempt in range(2):
        try:
            result = await run_in_threadpool(_google_translate_v2_request, q_list, source, target)
            dlog("google_batch_ok", {
                "size": len(q_list),
                "latency_ms": int((time.monotonic() - start) * 1000),
            })
            return result
        except urllib.error.HTTPError as e:
            status = getattr(e, "code", 0)
            dlog("google_batch_http_error", {"status": status, "attempt": attempt + 1, "size": len(q_list)})
            if 400 <= status < 500:
                return None
            if status >= 500 and attempt == 0:
                await run_in_threadpool(time.sleep, 0.1)
                continue
            return None
        except Exception as e:
            dlog("google_batch_error", {"reason": str(e), "attempt": attempt + 1, "size": len(q_list)})
            if attempt == 0:
                await run_in_threadpool(time.sleep, 0.25)
                continue
            return None
    return None


async def google_translate_v2_single(text: str, source: str, target: str) -> Optional[str]:
    out = await google_translate_v2_batch([text], source, target)
    if not out:
        return None
    return out[0]


def detect_language(text: str) -> str:
    # 실패해도 절대 죽지 않게
    if not detect:
        return "en"
    try:
        return normalize_lang(detect(text))
    except Exception:
        return "en"


def get_installed_pairs() -> set[Tuple[str, str]]:
    # 설치된 Argos 언어쌍 캐시(프로세스 단위)
    pairs = set()
    langs = argostranslate.translate.get_installed_languages()
    for lang in langs:
        src = getattr(lang, "code", None)
        if not src:
            continue
        # argostranslate 1.11+ : translations_to 사용
        for t in getattr(lang, "translations_to", []) or []:
            to_lang = getattr(getattr(t, "to_lang", None), "code", None)
            if to_lang:
                pairs.add((src, to_lang))
    return pairs


# 프로세스 시작 시 1회 로드
INSTALLED_PAIRS = get_installed_pairs()


def has_direct_pair(source: str, target: str) -> bool:
    return (source, target) in INSTALLED_PAIRS


async def translate_direct(text: str, source: str, target: str) -> str:
    # CPU 블로킹이라 threadpool로
    return await run_in_threadpool(
        argostranslate.translate.translate,
        text,
        source,
        target
    )


async def translate_with_pivot(text: str, source: str, target: str) -> Tuple[str, bool]:
    """
    pivot 규칙:
    - source->target direct 없으면
    - source->en, en->target 둘 다 설치되어 있을 때만 pivot
    - 아니면 direct 시도(실패하면 그대로 반환하는 게 아니라 에러를 올려 500 방지)
    """
    pivot = "en"
    if source == pivot or target == pivot:
        # pivot 의미 없으니 direct로 처리
        return await translate_direct(text, source, target), False

    if has_direct_pair(source, pivot) and has_direct_pair(pivot, target):
        temp = await translate_direct(text, source, pivot)
        out = await translate_direct(temp, pivot, target)
        return out, True

    # pivot 불가면 direct만 시도 (실패할 수 있으니 try/except)
    out = await translate_direct(text, source, target)
    return out, False


async def translate_with_existing_argos(text: str, source: str, target: str) -> str:
    # Keep existing direct/pivot behavior for compatibility
    try:
        if has_direct_pair(source, target):
            translated = await translate_direct(text, source, target)
        else:
            translated, _pivoted = await translate_with_pivot(text, source, target)
        return translated
    except Exception:
        return text


async def translate_text_segments(segments: List[Segment], source: str, target: str) -> str:
    rebuilt: List[str] = [seg_text for _seg_type, seg_text in segments]

    translatables: List[dict] = []
    for i, (seg_type, seg_text) in enumerate(segments):
        if seg_type != "TEXT":
            continue
        if not (seg_text or "").strip():
            continue
        prepared = mark_forced_tokens_as_inline_code(seg_text)
        protected, ph_to_token, placeholders = protect_tokens(prepared)
        if not protected.strip():
            continue
        translatables.append({
            "index": i,
            "original": seg_text,
            "protected": protected,
            "ph_to_token": ph_to_token,
            "placeholders": placeholders,
        })

    if not translatables:
        return "".join(rebuilt)

    def commit_result(item: dict, candidate: Optional[str]):
        if not candidate:
            rebuilt[item["index"]] = item["original"]
            return
        if not quality_check(item["protected"], candidate, target, item["placeholders"]):
            rebuilt[item["index"]] = item["original"]
            return
        rebuilt[item["index"]] = restore_tokens(candidate, item["ph_to_token"])

    # 1) 길거나 단건은 먼저 개별 처리
    batch_candidates: List[dict] = []
    for item in translatables:
        protected = item["protected"]
        if len(protected) > 2000:
            hq = high_quality_translate(protected, source, target)
            candidate = hq if isinstance(hq, str) and hq.strip() else None
            if not candidate:
                candidate = await google_translate_v2_single(protected, source, target)
            if not candidate:
                dlog("fallback_triggered", {"reason": "single_long_failed_no_argos", "len": len(protected)})
            commit_result(item, candidate)
            continue
        batch_candidates.append(item)

    # 2) Google batch translate (최대 32개)
    for start_idx in range(0, len(batch_candidates), 32):
        group = batch_candidates[start_idx:start_idx + 32]
        payload = [g["protected"] for g in group]
        dlog("batching", {"size": len(payload)})
        batch_out = await google_translate_v2_batch(payload, source, target)

        # batch 실패 시 단건 fallback
        if not batch_out or len(batch_out) != len(group):
            dlog("fallback_triggered", {"reason": "batch_failed_no_argos", "size": len(payload)})
            for g in group:
                candidate = await google_translate_v2_single(g["protected"], source, target)
                commit_result(g, candidate)
            continue

        for g, translated in zip(group, batch_out):
            commit_result(g, translated)

    return normalize_mixed_spacing("".join(rebuilt))


# ----------------------------
# Safe Korean refinement (헛소리 방지)
# ----------------------------

class KoreanRefinementEngine:
    """
    원칙:
    - 의미 바꾸는 치환은 최소/옵션
    - 안전한 것만: 띄어쓰기 정리, 종결(습니다), 조사(을/를) 정도
    - 과한 변환(시제/진행형 강제)은 '조건부'로만
    """

    PROGRESSIVE_KEYWORDS = [
        "분석", "검토", "확인", "검색",
        "검증", "계산", "정리", "생성",
        "구성", "처리", "추적"
    ]

    @staticmethod
    def normalize_spacing(text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    @staticmethod
    def _has_final_consonant(korean_char: str) -> bool:
        # 한글 종성 여부
        code = ord(korean_char)
        if 0xAC00 <= code <= 0xD7A3:
            return ((code - 0xAC00) % 28) != 0
        return False

    @staticmethod
    def add_object_particle(word: str) -> str:
        if not word:
            return word
        last = word[-1]
        if 0xAC00 <= ord(last) <= 0xD7A3:
            return word + ("을" if KoreanRefinementEngine._has_final_consonant(last) else "를")
        return word + "을"

    @staticmethod
    def ensure_formal_ending(text: str) -> str:
        # 이미 존댓말 종결이면 OK
        if text.endswith(("습니다.", "입니다.", "합니다.", "됩니다.")):
            return text

        # 문장부호 정리
        if text.endswith("."):
            base = text[:-1].strip()
        else:
            base = text.strip()

        # "합리적다입니다" 같은 이중 종결 방지
        if base.endswith("다"):
            return base + "."

        # 너무 짧으면 "입니다."가 어색할 수 있어 기본 "합니다." 선택
        # (번역 결과가 "~ 분석." 같은 명사구일 때)
        if re.search(r"(분석|검토|확인|검색|검증|계산|정리|생성|구성|처리|추적)$", base):
            return base + "합니다."
        return base + "입니다."

    @staticmethod
    def maybe_progressive(text: str) -> str:
        """
        진행형은 '진짜로' 명사구로 끝나는 케이스만 살짝:
        예) "요청 구조 분석." -> "요청 구조를 분석하고 있습니다."
        """
        # 이미 동사형/존댓말이면 건드리지 않기
        if text.endswith(("습니다.", "합니다.", "됩니다.", "있습니다.")):
            return text

        for kw in KoreanRefinementEngine.PROGRESSIVE_KEYWORDS:
            m = re.search(rf"^(.+?)\s*{kw}\.?$", text)
            if not m:
                continue

            subject = m.group(1).strip()

            # 너무 짧거나 이상하면 패스
            if len(subject) < 2:
                return text

            # 조사 보정
            if not subject.endswith(("을", "를")):
                subject = KoreanRefinementEngine.add_object_particle(subject)

            return f"{subject} {kw}하고 있습니다."
        return text

    @staticmethod
    def refine(text: str) -> str:
        text = KoreanRefinementEngine.normalize_spacing(text)
        # technical/mixed 번역에서는 과교정이 오히려 품질을 깬다.
        # 진행형 강제는 비활성화하고 종결만 최소 보정한다.
        text = KoreanRefinementEngine.ensure_formal_ending(text)
        return text


def should_refine_korean_text(text: str) -> bool:
    s = (text or "").strip()
    if not s:
        return False

    # 코드/백틱/URL/혼합 영문 비율이 높은 경우 후처리 금지
    if "```" in s or "`" in s or "http://" in s or "https://" in s:
        return False
    hangul = len(re.findall(r"[\uac00-\ud7a3]", s))
    latin = len(re.findall(r"[A-Za-z]", s))
    non_space = max(1, len(re.sub(r"\s+", "", s)))
    hangul_ratio = hangul / non_space
    latin_ratio = latin / non_space

    # 순수 한국어에 가까운 짧은 문장에만 적용
    if hangul_ratio < 0.55:
        return False
    if latin_ratio > 0.12:
        return False
    if len(s) > 240:
        return False
    return True


# ----------------------------
# Endpoint
# ----------------------------

@app.post("/translate", response_model=Res)
async def translate(req: Req):
    req_start = time.monotonic()
    text = req.text or ""
    if not text.strip():
        # 빈 입력은 그대로
        return Res(text=text, source=req.source or "", target=req.target, cached=False, pivoted=False)

    target = normalize_lang(req.target)
    if req.source:
        source = normalize_lang(req.source)
    else:
        segs_for_lang = segment_text(text)
        source = detect_language_from_segments(segs_for_lang)
        if source == "unknown":
            source = detect_language(text)
    source = normalize_lang(source)
    if source not in ("en", "ko"):
        source = "en"

    # 같으면 그대로
    if source == target:
        return Res(text=text, source=source, target=target, cached=False, pivoted=False)

    # 캐시
    key = cache_key(source, target, text)
    can_cache = 5 <= len(text.strip()) <= 4000
    if redis_client is not None and can_cache:
        try:
            cached = redis_client.get(key)
            if isinstance(cached, str) and cached:
                dlog("cache_hit", {"source": source, "target": target, "len": len(text)})
                return Res(text=cached, source=source, target=target, cached=True, pivoted=False)
            dlog("cache_miss", {"source": source, "target": target, "len": len(text)})
        except Exception:
            pass  # 캐시 실패해도 번역은 진행

    # 번역 수행 (안전)
    pivoted = False  # compatibility field
    try:
        translated: Optional[str] = None

        # Prefer whole-text Google translation first for naturalness.
        # If it fails quality/safety checks, fall back to segmented translation.
        whole_google = await google_translate_v2_single(text, source, target)
        if whole_google and quality_check(text, whole_google, target, []):
            translated = normalize_mixed_spacing(whole_google)
        else:
            segments = segment_text(text)
            translated = await translate_text_segments(segments, source, target)
    except Exception:
        # 번역 실패해도 스트림/서버 죽지 않게: 원문 반환
        return Res(text=text, source=source, target=target, cached=False, pivoted=False)

    # 한국어 후처리 (안전한 것만)
    # Korean refinement disabled:
    # Google translation output is generally better left untouched.
    # if target == "ko" and should_refine_korean_text(translated):
    #     translated = KoreanRefinementEngine.refine(translated)

    # 캐시 저장
    if redis_client is not None and can_cache:
        try:
            redis_client.setex(key, CACHE_TTL, translated)
        except Exception:
            pass

    dlog("translation_done", {
        "source": source,
        "target": target,
        "latency_ms": int((time.monotonic() - req_start) * 1000),
        "len": len(text),
    })

    return Res(text=translated, source=source, target=target, cached=False, pivoted=pivoted)
