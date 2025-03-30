from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.player import PlayerSummary
from app.services.players import getPlayer, search_players

#router = APIRouter(prefix="/players", tags=["players"])
router = APIRouter()


@router.get("/player/{player_id}", response_model=PlayerSummary,
            summary="Get Player Details",
            description="Retrieve detailed information about a specific player, including stats and recent performances.")
async def fetchPlayer(player_id: str):
    try:
        return await getPlayer(player_id)
    except HTTPException as e:
        raise e


# @router.get("/players", response_model=List[PlayerSummary],
#             summary="Get All Players",
#             description="Retrieve a list of all players.")
# async def fetchAllPlayers():
#     try:
#         return await search_players()  # Assuming search_players with no args returns all
#     except HTTPException as e:
#         raise e


@router.get("/players/search/{search_term}", response_model=List[PlayerSummary],
            summary="Search Players",
            description="Search for players by name.")
async def searchPlayers(search_term: str):
    try:
        return await search_players(search_term)
    except HTTPException as e:
        raise e