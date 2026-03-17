"""Request/response schemas for the agent endpoint (used when agent is added in File 3.3)."""

import re
from pydantic import BaseModel, Field, field_validator


def sanitize_question(v: str) -> str:
    """Strip dangerous patterns from user question. Raises ValueError if invalid."""
    dangerous_patterns = [
        r"ignore (previous|all|above)",
        r"forget (everything|all|previous)",
        r"you are now",
        r"act as",
        r"<\|.*?\|>",
        r"###\s*(system|instruction)",
    ]
    v_lower = v.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, v_lower):
            raise ValueError("Invalid question format")
    return v.strip()


class AgentRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    history: list = Field(default_factory=list, max_length=10)

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        return sanitize_question(v)
