"""Standardized error responses for the NBA Live Tracker API."""

from fastapi import HTTPException


class NBATrackerError(HTTPException):
    """Base exception for NBA Tracker API errors."""

    pass


def not_found(resource: str, identifier: str) -> NBATrackerError:
    """Return 404 for missing resource."""
    return NBATrackerError(status_code=404, detail=f"{resource} not found: {identifier}")


def upstream_error(service: str, detail: str) -> NBATrackerError:
    """Return 503 for upstream/service failures."""
    return NBATrackerError(status_code=503, detail=f"Upstream error from {service}: {detail}")


def rate_limited() -> NBATrackerError:
    """Return 429 for rate limit exceeded."""
    return NBATrackerError(status_code=429, detail="Rate limit exceeded. Please try again shortly.")
