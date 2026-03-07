import math
from typing import Dict, List, Tuple

from .schemas import YuaMaxV1Input, YuaMaxV1Output

MODEL_VERSION = "yua-max-v1-placeholder-0.1"

# Static baselines for drift/ood detection
BASELINES: Dict[str, Tuple[float, float]] = {
    "anchorConfidence": (0.55, 0.18),
    "inputLength": (220.0, 180.0),
    "pathScore": (0.45, 0.20),
    "intentScore": (0.45, 0.25),
    "flowScore": (0.30, 0.20),
    "failureScore": (0.45, 0.25),
    "verdictScore": (0.45, 0.25),
    "modalityScore": (0.30, 0.25),
}

WEIGHTS = {
    "bias": -0.35,
    "anchorConfidence": -0.6,
    "inputLength": 0.35,
    "pathScore": 0.5,
    "intentScore": 0.35,
    "flowScore": 0.2,
    "failureScore": 1.15,
    "verdictScore": 0.85,
    "modalityScore": 0.25,
}

# TODO: Replace with LightGBM / XGBoost model inference


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def score_path(path: str) -> float:
    if path == "SEARCH":
        return 0.7
    if path == "DEEP":
        return 0.8
    if path == "FAST":
        return 0.2
    if path == "NORMAL":
        return 0.4
    return 0.45


def score_turn_intent(intent: str) -> float:
    if intent == "QUESTION":
        return 0.6
    if intent == "CONTINUATION":
        return 0.4
    if intent == "REACTION":
        return 0.3
    if intent == "AGREEMENT":
        return 0.25
    if intent == "SHIFT":
        return 0.5
    return 0.4


def score_turn_flow(flow: str) -> float:
    if flow == "TOPIC_SHIFT":
        return 0.45
    if flow == "FOLLOW_UP":
        return 0.35
    if flow == "ACK_CONTINUE":
        return 0.25
    if flow == "NEW":
        return 0.2
    return 0.3


def score_failure(risk: str) -> float:
    if risk == "HIGH":
        return 1.0
    if risk == "MEDIUM":
        return 0.6
    if risk == "LOW":
        return 0.25
    return 0.4


def score_verdict(verdict: str) -> float:
    if verdict == "FAIL":
        return 1.0
    if verdict == "WEAK":
        return 0.6
    if verdict == "PASS":
        return 0.2
    return 0.4


def score_modality(modality: str) -> float:
    if modality == "IMAGE_ONLY":
        return 0.1
    if modality == "MIXED":
        return 0.4
    if modality == "TEXT_ONLY":
        return 0.3
    return 0.3


def input_length_norm(length: int) -> float:
    return clamp01(math.log1p(max(0, length)) / 8.0)


def drift_term(features: Dict[str, float]) -> float:
    max_z = 0.0
    for key, (mean, std) in BASELINES.items():
        if key not in features or std <= 0:
            continue
        z = abs(features[key] - mean) / std
        if z > max_z:
            max_z = z
    return clamp01((max_z - 2.0) / 3.0)


def evaluate(input_data: YuaMaxV1Input, latency_ms: float) -> YuaMaxV1Output:
    path_score = score_path(input_data.path)
    intent_score = score_turn_intent(input_data.turnIntent)
    flow_score = score_turn_flow(input_data.turnFlow)
    failure_score = score_failure(input_data.failureRisk)
    verdict_score = score_verdict(input_data.verifierVerdict)
    modality_score = score_modality(input_data.modality)
    length_score = input_length_norm(input_data.inputLength)

    features = {
        "anchorConfidence": input_data.anchorConfidence,
        "inputLength": float(input_data.inputLength),
        "pathScore": path_score,
        "intentScore": intent_score,
        "flowScore": flow_score,
        "failureScore": failure_score,
        "verdictScore": verdict_score,
        "modalityScore": modality_score,
    }

    z = (
        WEIGHTS["bias"]
        + WEIGHTS["anchorConfidence"] * features["anchorConfidence"]
        + WEIGHTS["inputLength"] * length_score
        + WEIGHTS["pathScore"] * path_score
        + WEIGHTS["intentScore"] * intent_score
        + WEIGHTS["flowScore"] * flow_score
        + WEIGHTS["failureScore"] * failure_score
        + WEIGHTS["verdictScore"] * verdict_score
        + WEIGHTS["modalityScore"] * modality_score
    )

    risk = clamp01(sigmoid(z))
    uncertainty = clamp01(1.0 - abs(risk - 0.5) * 2.0 + drift_term(features))

    reasons: List[str] = []
    if input_data.failureRisk == "HIGH":
        reasons.append("FS_HIGH")
    if input_data.failureRisk == "MEDIUM":
        reasons.append("FS_MEDIUM")
    if input_data.verifierVerdict == "FAIL":
        reasons.append("VERDICT_FAIL")
    if input_data.verifierVerdict == "WEAK":
        reasons.append("VERDICT_WEAK")
    if input_data.anchorConfidence <= 0.4:
        reasons.append("LOW_ANCHOR")
    if input_data.inputLength >= 600:
        reasons.append("LONG_INPUT")
    if input_data.turnFlow == "TOPIC_SHIFT":
        reasons.append("TOPIC_SHIFT")

    recommended = None
    ui_delay = None
    min_thinking = None

    if input_data.modality == "IMAGE_ONLY":
        recommended = "FAST"
    elif input_data.failureRisk == "HIGH" or input_data.verifierVerdict == "FAIL":
        recommended = "DEEP"
        ui_delay = 400
        min_thinking = 1200
    elif risk >= 0.65:
        recommended = "DEEP"
        min_thinking = 800
    elif risk <= 0.25 and input_data.verifierVerdict == "PASS":
        recommended = "NORMAL"

    return YuaMaxV1Output(
        risk=risk,
        uncertainty=uncertainty,
        reasons=reasons,
        modelVersion=MODEL_VERSION,
        latencyMs=latency_ms,
        recommendedThinkingProfile=recommended,
        uiDelayMs=ui_delay,
        minThinkingMs=min_thinking,
    )
