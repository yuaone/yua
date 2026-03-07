# 🔒 Event Definitions (SSOT)

def is_high_volume(bar, avg_volume, threshold=1.5):
    vol = bar.get("volume")
    if vol is None:
        return False
    return vol > avg_volume * threshold


def is_large_bullish(bar, body_ratio=0.6):
    o = bar.get("open")
    c = bar.get("close")
    h = bar.get("high")
    l = bar.get("low")

    if None in (o, c, h, l):
        return False

    body = abs(c - o)
    range_ = h - l

    return (
        c > o
        and range_ > 0
        and body / range_ >= body_ratio
    )


def is_gap_up(prev_bar, bar, gap_ratio=0.01):
    pc = prev_bar.get("close")
    o = bar.get("open")

    if None in (pc, o):
        return False

    return o > pc * (1 + gap_ratio)
