# 🔥 Event Extractor (SSOT)
# - 단일 bar에 대해 event 중복 허용 ❌
# - 의미 단위로만 기록

from .event_definitions import (
    is_high_volume,
    is_large_bullish,
    is_gap_up,
)


def extract_events(bars):
    events = []

    volumes = [b["volume"] for b in bars if b.get("volume") is not None]
    if not volumes:
        return events

    avg_volume = sum(volumes) / len(volumes)

    for i in range(1, len(bars)):
        bar = bars[i]
        prev = bars[i - 1]

        triggered = []

        if is_high_volume(bar, avg_volume):
            triggered.append("HIGH_VOLUME")

        if is_large_bullish(bar):
            triggered.append("LARGE_BULLISH")

        if is_gap_up(prev, bar):
            triggered.append("GAP_UP")

        # 🔒 같은 날 여러 이벤트 → 각각 독립 샘플
        for event_id in triggered:
            events.append((i, event_id))

    return events
