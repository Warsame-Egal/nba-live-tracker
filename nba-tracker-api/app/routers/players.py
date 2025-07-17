from typing import List

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

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
async def fetchPlayer(player_id: str, db: AsyncSession = Depends(get_db)):
    try:
        return await getPlayer(player_id, db)
    except HTTPException as e:
        raise e


@router.get(
    "/players/search/{search_term}",
    response_model=List[PlayerSummary],
    summary="Search Players",
    tags=["players"],
    description=(
        "Search for players by name. If the player table is empty it will be "
        "populated from the NBA player index on the first search."
    ),)
async def searchPlayers(search_term: str, db: AsyncSession = Depends(get_db)):
    try:
        return await search_players(search_term, db)
    except HTTPException as e:
        raise e
