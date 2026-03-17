"""Shared pagination params and response schema."""

from typing import Generic, List, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number (1-based).")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page.")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T] = Field(..., description="Page of items.")
    page: int = Field(..., description="Current page.")
    limit: int = Field(..., description="Page size.")
    total: int = Field(..., description="Total item count.")
    has_more: bool = Field(..., description="True if more pages exist.")
