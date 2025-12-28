from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.player import PlayerSummary
from app.services.players import getPlayer, search_players

router = APIRouter()


@router.get(
    "/player/{player_id}",
    response_model=PlayerSummary,
    summary="Get Player Details",
    tags=["players"],
    description="Retrieve detailed information about a specific player, including stats and recent performances.",
)
async def fetchPlayer(player_id: str):
    try:
        return await getPlayer(player_id)
    except HTTPException as e:
        raise e


@router.get(
    "/players/search/{search_term}",
    response_model=List[PlayerSummary],
    summary="Search Players",
    tags=["players"],
    description="Search for players by name using the NBA API.",
)
async def searchPlayers(search_term: str):
    try:
        return await search_players(search_term)
    except HTTPException as e:
        raise e
