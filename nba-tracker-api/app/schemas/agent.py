from typing import Any, Dict, List

from pydantic import BaseModel, Field


class AgentRequest(BaseModel):
    """
    Request payload for the CourtIQ agent endpoints.

    `history` is intentionally permissive because the frontend may send
    different message shapes. We only rely on `role` + `content`.
    """

    question: str = Field(..., min_length=1, max_length=500)
    history: List[Dict[str, Any]] = Field(default_factory=list)
