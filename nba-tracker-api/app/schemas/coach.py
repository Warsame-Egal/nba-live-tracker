from pydantic import BaseModel


class Coach(BaseModel):
    coach_id: int
    name: str
    role: str
    is_assistant: bool
