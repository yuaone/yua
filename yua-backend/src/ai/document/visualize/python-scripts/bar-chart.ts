// src/ai/document/visualize/python-scripts/bar-chart.ts
export const BAR_CHART_SCRIPT = `
import sys, json
import matplotlib.pyplot as plt

payload = json.load(sys.stdin)

data = payload["data"]
title = payload.get("title")
dpi = payload.get("dpi", 150)
purpose = payload.get("purpose", "DEFAULT")
highlight = payload.get("highlight")

plt.figure(dpi=dpi)

# 목적별 스타일
if purpose == "REPORT":
    plt.style.use("grayscale")
    plt.rcParams["font.size"] = 10
    plt.margins(0.15)
elif purpose == "PRESENTATION":
    plt.style.use("default")
    plt.rcParams["font.size"] = 16
    plt.margins(0.05)

bars = plt.bar(range(len(data)), data)

# 🔴 Highlight 처리
if highlight:
    idx = highlight["x"]
    val = highlight["y"]

    bars[idx].set_color("red")
    plt.scatter(idx, val, s=120, c="red", zorder=3)
    plt.annotate(
        f"{val}",
        (idx, val),
        xytext=(0, 8),
        textcoords="offset points",
        ha="center",
        fontsize=plt.rcParams["font.size"]
    )

if title:
    plt.title(title)

plt.tight_layout()
plt.savefig(sys.stdout.buffer, format="png")
`;
