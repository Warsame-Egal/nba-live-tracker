from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check():
    """Health check endpoint for API status."""
    return {"status": "ok", "message": "NBA API is running"}
