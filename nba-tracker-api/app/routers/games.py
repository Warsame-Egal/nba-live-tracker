from fastapi import APIRouter, HTTPException

from app.schemas.game import GameDetailsResponse, PlayerGameEntry, PlayerGameStats
from app.services.games import getGameDetails, getGamePlayers, getGameStats

router = APIRouter()


@router.get(
    "/games/{game_id}",
    response_model=GameDetailsResponse,
    summary="Get Game Details",
    tags=["games"],
    description="Retrieve detailed information about a specific game.",
)
async def fetchGameDetails(game_id: str):
    try:
        return await getGameDetails(game_id)
    except HTTPException as e:
        raise e


@router.get(
    "/games/{game_id}/players",
    response_model=list[PlayerGameEntry],
    summary="Get Players in a Game",
    tags=["games"],
    description="Retrieve a list of players who participated in the game.",
)
async def fetchGamePlayers(game_id: str):
    try:
        return await getGamePlayers(game_id)
    except HTTPException as e:
        raise e


@router.get(
    "/games/{game_id}/stats",
    response_model=list[PlayerGameStats],
    summary="Get Player Stats for a Game",
    tags=["games"],
    description="Retrieve detailed player statistics for a specific game.",
)
async def fetchGameStats(game_id: str):
    try:
        return await getGameStats(game_id)
    except HTTPException as e:
        raise e
