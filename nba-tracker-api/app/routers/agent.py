"""Agent router: POST /api/v1/agent/ask and streaming endpoint."""

import logging

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.middleware.rate_limit import limiter
from app.schemas.agent import AgentRequest
from app.services.agent_service import run_agent, run_agent_streaming
from app.services.ai_queue import AIPriority, get_ai_request_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["agent"])


@router.post("/agent/ask")
@limiter.limit("5/minute")
async def ask_agent(request: Request, body: AgentRequest):
    """Non-streaming agent. Returns full JSON with answer, tools_used, tool_results."""
    history = [{"role": h.get("role", "user"), "content": h.get("content", "")} for h in (body.history or [])]
    result = await get_ai_request_queue().run(
        AIPriority.AGENT,
        run_agent(body.question, conversation_history=history if history else None),
    )
    return result


@router.post("/agent/stream")
@limiter.limit("5/minute")
async def ask_agent_streaming(request: Request, body: AgentRequest):
    """Streaming agent. Returns server-sent events (text/event-stream)."""
    history = [{"role": h.get("role", "user"), "content": h.get("content", "")} for h in (body.history or [])]
    return StreamingResponse(
        run_agent_streaming(body.question, conversation_history=history if history else None),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
