import logging
from typing import Any, Dict

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.middleware.rate_limit import limiter
from app.schemas.agent import AgentRequest
from app.services.agent_service import run_agent, run_agent_streaming
from app.utils.errors import upstream_error

logger = logging.getLogger(__name__)

router = APIRouter(tags=["agent"])


@router.post("/api/v1/agent/ask")
@limiter.limit("5/minute")
async def agent_ask(request: Request, body: AgentRequest) -> Dict[str, Any]:
    """
    Non-streaming agent endpoint.
    """
    try:
        return await run_agent(body.question, body.history)
    except Exception as e:
        logger.error("agent_ask failed: %s", e, exc_info=True)
        raise upstream_error("agent", str(e))


@router.post("/api/v1/agent/stream")
@limiter.limit("5/minute")
async def agent_stream(request: Request, body: AgentRequest) -> StreamingResponse:
    """
    SSE streaming agent endpoint.
    """

    async def _event_gen():
        async for chunk in run_agent_streaming(body.question, body.history):
            yield chunk

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }

    return StreamingResponse(_event_gen(), media_type="text/event-stream", headers=headers)
