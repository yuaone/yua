from typing import List, Literal, Optional
from pydantic import BaseModel, Field

ThinkingProfile = Literal["FAST", "NORMAL", "DEEP"]

class YuaMaxV1Input(BaseModel):
    path: str
    turnIntent: Literal[
        "QUESTION",
        "CONTINUATION",
        "REACTION",
        "AGREEMENT",
        "SHIFT",
    ]
    turnFlow: Literal["NEW", "FOLLOW_UP", "ACK_CONTINUE", "TOPIC_SHIFT"]
    anchorConfidence: float = Field(ge=0.0, le=1.0)
    failureRisk: Literal["LOW", "MEDIUM", "HIGH"]
    verifierVerdict: Literal["PASS", "WEAK", "FAIL"]
    inputLength: int = Field(ge=0)
    modality: Literal["TEXT_ONLY", "IMAGE_ONLY", "MIXED"]

class YuaMaxV1Output(BaseModel):
    risk: float = Field(ge=0.0, le=1.0)
    uncertainty: float = Field(ge=0.0, le=1.0)
    reasons: List[str]
    modelVersion: str
    latencyMs: float
    recommendedThinkingProfile: Optional[ThinkingProfile] = None
    uiDelayMs: Optional[int] = None
    minThinkingMs: Optional[int] = None
