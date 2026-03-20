import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect


from app.constants import GAME_STATUS_FINAL, GAME_STATUS_LIVE
from app.schemas.player import TeamRoster
from app.schemas.scoreboard import BoxScoreResponse, PlayByPlayResponse, KeyMomentsResponse, WinProbabilityResponse
from app.services.scoreboard import (
    fetchTeamRoster,
    format_games_for_insights,
    get_advanced_box_score,
    getBoxScore,
    get_game_matchups,
    get_hustle_box_score,
    getPlayByPlay,
)
from app.services.key_moments import get_key_moments_for_game
from app.services.win_probability import get_win_probability
from app.services.websockets_manager import (
    playbyplay_websocket_manager,
    scoreboard_websocket_manager,
)
from app.services.batched_insights import (
    generate_batched_insights,
    generate_lead_change_explanation,
)
from app.services.data_cache import data_cache
from app.services.game_detail import GameDetailService
from app.utils.errors import not_found, upstream_error

# Set up logger for this file
logger = logging.getLogger(__name__)

router = APIRouter()


# WebSocket endpoint for live score updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket connection for live NBA scoreboard updates.

    When a client connects:
    - They get the latest scores right away
    - They receive updates automatically when scores change
    - Connection stays open until client disconnects
    """

    # Accept the connection and register it
    await scoreboard_websocket_manager.connect(websocket)

    try:
        # Send the latest scores to the newly connected client
        await scoreboard_websocket_manager.send_initial_scoreboard(websocket)

        # Check if connection is still active after sending initial data
        if websocket not in scoreboard_websocket_manager.active_connections:
            return

        # Keep connection open and listen for messages from client
        while True:
            try:
                data = await websocket.receive_text()  # Get message from client
                logger.debug(f"Received message from client: {data}")
            except RuntimeError as e:
                # Connection was closed or not properly accepted
                if "not connected" in str(e).lower() or "accept" in str(e).lower():
                    logger.debug(f"WebSocket connection closed: {e}")
                    break
                raise

    except WebSocketDisconnect:
        # Client disconnected - clean up the connection
        logger.info("Client disconnected from scoreboard WebSocket")
    except Exception as e:
        # Log any other errors
        logger.error(f"Error in scoreboard WebSocket: {e}", exc_info=True)
    finally:
        # Always clean up the connection
        await scoreboard_websocket_manager.disconnect(websocket)


# Today's scoreboard (cached) — for MCP and API consumers
@router.get(
    "/scoreboard/today",
    tags=["scoreboard"],
    summary="Get Today's Scoreboard",
    description="Return the current cached scoreboard (today's games). Same data as WebSocket.",
)
async def get_scoreboard_today():
    """Return cached scoreboard for today. Used by MCP server and API clients."""
    scoreboard_data = await data_cache.get_scoreboard()
    if not scoreboard_data:
        return {"scoreboard": None, "games": []}
    return scoreboard_data.model_dump()


# Get team roster endpoint
@router.get(
    "/scoreboard/team/{team_id}/roster/{season}",
    response_model=TeamRoster,
    tags=["teams"],
    summary="Get Team Roster",
    description="Get the full roster (players and coaches) for a team in a season.",
)
async def getTeamRoster(team_id: int, season: str):
    """
    Get all players and coaches on a team for a specific season.

    Args:
        team_id: The NBA team ID
        season: The season year like "2024-25"

    Returns:
        TeamRoster: All players and coaches on the team
    """
    try:
        return await fetchTeamRoster(team_id, season)
    except HTTPException as e:
        raise e


# Get box score endpoint
@router.get(
    "/scoreboard/game/{game_id}/boxscore",
    response_model=BoxScoreResponse,
    tags=["boxscore"],
    summary="Get Box Score for a Game",
    description="Get detailed stats for a game including all player stats.",
)
async def get_game_boxscore(game_id: str):
    """
    Get the full box score (detailed stats) for a specific game.

    Args:
        game_id: The unique game ID from NBA

    Returns:
        BoxScoreResponse: Complete stats for both teams and all players
    """
    try:
        return await getBoxScore(game_id)
    except HTTPException as e:
        raise e


# Hustle box score (contested shots, deflections, screen assists, etc.)
@router.get(
    "/scoreboard/game/{game_id}/hustle",
    tags=["boxscore"],
    summary="Get Hustle Stats for a Game",
    description="Hustle stats: contested shots, deflections, charges drawn, screen assists, box outs.",
)
async def get_game_hustle(game_id: str):
    """Return hustle box score for the game or 404 if not available."""
    hustle = await get_hustle_box_score(game_id)
    if hustle is None:
        raise HTTPException(status_code=404, detail="Hustle stats not available for this game")
    return hustle


# Advanced box score (TS%, usage, net rating, PIE)
@router.get(
    "/scoreboard/game/{game_id}/advanced",
    tags=["boxscore"],
    summary="Get Advanced Box Score",
    description="Advanced stats: true shooting %, usage, net rating, PIE.",
)
async def get_game_advanced(game_id: str):
    advanced = await get_advanced_box_score(game_id)
    if advanced is None:
        raise HTTPException(status_code=404, detail="Advanced box score not available for this game")
    return advanced


# Matchups (who guarded who)
@router.get(
    "/scoreboard/game/{game_id}/matchups",
    tags=["boxscore"],
    summary="Get Matchup Data for a Game",
    description="Who guarded who: matchup minutes, FG% against defender, switches.",
)
async def get_game_matchups_route(game_id: str):
    """Return matchup data or 404 if not available."""
    matchups = await get_game_matchups(game_id)
    if matchups is None:
        raise HTTPException(status_code=404, detail="Matchup data not available for this game")
    return matchups


# Get play-by-play endpoint
@router.get(
    "/scoreboard/game/{game_id}/play-by-play",
    response_model=PlayByPlayResponse,
    tags=["play-by-play"],
    summary="Get Play-by-Play for a Game",
    description="Get all play-by-play events for a specific game. Works for both live and completed games.",
)
async def get_game_playbyplay(game_id: str):
    """
    Get the play-by-play (all game events) for a specific game.
    Works for both live and completed games.

    Args:
        game_id: The unique game ID from NBA

    Returns:
        PlayByPlayResponse: List of all plays/events that happened in the game
    """
    try:
        return await getPlayByPlay(game_id)
    except HTTPException as e:
        raise e


# WebSocket endpoint for play-by-play updates
@router.websocket("/ws/{game_id}/play-by-play")
async def playbyplay_websocket_endpoint(websocket: WebSocket, game_id: str):
    """
    WebSocket connection for live play-by-play updates for a specific game.

    When a client connects:
    - They get all plays that have happened so far
    - They receive new plays automatically as they happen
    - Connection stays open until client disconnects

    Args:
        game_id: The game to watch for play-by-play updates
    """
    await playbyplay_websocket_manager.connect(websocket, game_id)

    try:
        # Check if connection is still active after initial connection
        if (
            game_id not in playbyplay_websocket_manager.active_connections
            or websocket not in playbyplay_websocket_manager.active_connections[game_id]
        ):
            return

        # Keep connection open and listen for messages from client
        while True:
            try:
                data = await websocket.receive_text()
                logger.debug(f"Received message from client for game {game_id}: {data}")
            except RuntimeError as e:
                # Connection was closed or not properly accepted
                if "not connected" in str(e).lower() or "accept" in str(e).lower():
                    logger.debug(f"WebSocket connection closed: {e}")
                    break
                raise
    except WebSocketDisconnect:
        # Client disconnected - clean up the connection
        logger.info(f"Client disconnected from play-by-play WebSocket for game {game_id}")
    except Exception as e:
        # Log any other errors
        logger.error(f"Error in play-by-play WebSocket: {e}", exc_info=True)
    finally:
        # Always clean up the connection
        await playbyplay_websocket_manager.disconnect(websocket, game_id)


# Get batched insights for all live games
@router.get(
    "/scoreboard/insights",
    tags=["insights"],
    summary="Get Batched AI Insights",
    description="Get AI-generated insights for all live games in one call. Cached for 60 seconds.",
)
async def get_batched_insights():
    """Returns timestamp and insights list for live games (cached 60s)."""
    try:
        # Get current scoreboard
        scoreboard_data = await data_cache.get_scoreboard()

        if not scoreboard_data:
            return {"timestamp": "", "insights": []}

        live_games = [g for g in scoreboard_data.scoreboard.games if g.gameStatus == GAME_STATUS_LIVE]
        if not live_games:
            return {"timestamp": "", "insights": []}

        # Best-effort: use cached win probability payloads (architecture: DataCache-first).
        win_prob_data = {}
        try:
            for g in live_games:
                gid = getattr(g, "gameId", "")
                if not gid:
                    continue
                cached = await data_cache.get_win_probability_cached(str(gid))
                if cached is not None:
                    win_prob_data[str(gid)] = cached
        except Exception:
            win_prob_data = {}

        games_for_insights = format_games_for_insights(live_games, win_prob_data=win_prob_data)
        # Generate batched insights
        return await generate_batched_insights(games_for_insights)

    except Exception as e:
        logger.error(f"Error generating batched insights: {e}", exc_info=True)
        return {"timestamp": "", "insights": []}


# Get lead change explanation for a specific game
@router.get(
    "/scoreboard/game/{game_id}/lead-change",
    tags=["insights"],
    summary="Get Lead Change Explanation",
    description="Get AI-generated explanation for why the lead changed. Cached for 60 seconds per game.",
)
async def get_lead_change_explanation(game_id: str):
    """Uses last 5 plays to return summary and key_factors (cached 60s per game)."""
    try:
        # Get current game data
        scoreboard_data = await data_cache.get_scoreboard()

        if not scoreboard_data:
            raise HTTPException(status_code=404, detail="Scoreboard data not available")

        # Find the game
        game = None
        for g in scoreboard_data.scoreboard.games:
            if g.gameId == game_id:
                game = g
                break

        if not game:
            raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

        # Get play-by-play for last 5 plays
        playbyplay_data = await data_cache.get_playbyplay(game_id)

        last_5_plays = []
        if playbyplay_data and playbyplay_data.plays:
            # Get last 5 plays (most recent first)
            sorted_plays = sorted(playbyplay_data.plays, key=lambda p: p.action_number, reverse=True)
            last_5_plays = sorted_plays[:5]

            # Convert to dict format
            last_5_plays = [
                {
                    "action_type": play.action_type,
                    "description": play.description,
                    "team_tricode": play.team_tricode,
                }
                for play in last_5_plays
            ]

        home_team = game.homeTeam
        away_team = game.awayTeam
        current_home_score = home_team.score or 0
        current_away_score = away_team.score or 0

        # Get previous scores from cache if available
        from app.services.batched_insights import _insights_cache

        previous_scores = _insights_cache.get_previous_scores(game_id)

        if previous_scores:
            previous_home_score, previous_away_score = previous_scores
        else:
            # No previous scores tracked - use current as previous (first call)
            previous_home_score = current_home_score
            previous_away_score = current_away_score

        # Update tracking
        _insights_cache.last_scores[game_id] = (current_home_score, current_away_score)

        # Generate explanation
        explanation = await generate_lead_change_explanation(
            game_id=game_id,
            home_team=f"{home_team.teamCity} {home_team.teamName}".strip(),
            away_team=f"{away_team.teamCity} {away_team.teamName}".strip(),
            previous_home_score=previous_home_score,
            previous_away_score=previous_away_score,
            current_home_score=current_home_score,
            current_away_score=current_away_score,
            last_5_plays=last_5_plays,
            quarter=game.period,
            time_remaining=game.gameClock or "",
        )

        if not explanation:
            raise upstream_error("scoreboard", "Failed to generate lead change explanation")

        return explanation

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating lead change explanation for game {game_id}: {e}", exc_info=True)
        raise upstream_error("scoreboard", str(e))


# Get aggregated game detail (score, box score, impacts, key moments, win prob, summary)
@router.get(
    "/game/{game_id}/detail",
    tags=["scoreboard"],
    summary="Get Game Detail",
    description="Aggregated game detail: score section, box score, player impacts, key moments, win probability, and optional AI summary.",
)
async def get_game_detail(game_id: str):
    """
    Get full game detail for the game detail page.
    Uses scoreboard cache for status; fetches box score, play-by-play, key moments,
    and win probability in parallel. Returns 404 if game not found.
    """
    result = await GameDetailService().get_game_detail(game_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")
    return result


# Get or generate AI game summary (for completed games)
@router.get(
    "/game/{game_id}/summary",
    tags=["scoreboard"],
    summary="Get Game Summary",
    description="Returns cached AI summary or generates one (wait up to 15s). For completed games only.",
)
async def get_game_summary(game_id: str):
    """Return AI recap for a completed game. Generates on demand if not cached."""
    from app.services.game_detail import get_or_generate_game_summary

    summary = await get_or_generate_game_summary(game_id, wait_seconds=15.0)
    return {"summary": summary}


# Get post-game recap (completed games only)
@router.get(
    "/game/{game_id}/recap",
    tags=["scoreboard"],
    summary="Get Post-Game Recap",
    description="Get or generate a short AI post-game recap for a finished game. Cached permanently.",
)
async def get_postgame_recap(game_id: str):
    """Get post-game recap for a finished game. Generates on demand if not cached."""
    from app.services.postgame_recap_service import generate_postgame_recap, get_cached_recap

    recap = get_cached_recap(game_id)
    if recap:
        return {"game_id": game_id, "recap": recap, "cached": True}

    scoreboard = await data_cache.get_scoreboard()
    if not scoreboard or not scoreboard.scoreboard:
        raise not_found("recap", game_id)

    game = next((g for g in scoreboard.scoreboard.games if g.gameId == game_id), None)
    if not game or game.gameStatus != GAME_STATUS_FINAL:
        raise not_found("recap", game_id)

    home_name = f"{game.homeTeam.teamCity} {game.homeTeam.teamName}".strip() or game.homeTeam.teamName
    away_name = f"{game.awayTeam.teamCity} {game.awayTeam.teamName}".strip() or game.awayTeam.teamName
    home_score = game.homeTeam.score or 0
    away_score = game.awayTeam.score or 0
    away_top = "N/A"
    home_top = "N/A"
    if game.gameLeaders:
        if game.gameLeaders.awayLeaders:
            away_top = game.gameLeaders.awayLeaders.name
        if game.gameLeaders.homeLeaders:
            home_top = game.gameLeaders.homeLeaders.name

    game_data = {
        "home_team": {"name": home_name, "score": home_score},
        "away_team": {"name": away_name, "score": away_score},
        "away_top_performer": away_top,
        "home_top_performer": home_top,
    }
    recap = await generate_postgame_recap(game_id, game_data)
    if recap:
        return {"game_id": game_id, "recap": recap, "cached": False}
    raise not_found("recap", game_id)


# Get key moments for a specific game
@router.get(
    "/scoreboard/game/{game_id}/key-moments",
    response_model=KeyMomentsResponse,
    tags=["insights"],
    summary="Get Key Moments",
    description="Get recent key moments detected for a game (game-tying shots, lead changes, scoring runs, etc.).",
)
async def get_game_key_moments(game_id: str):
    """
    Get recent key moments for a game.

    This endpoint returns all key moments detected for a game in the last 5 minutes.
    Key moments are automatically detected by analyzing play-by-play events - things like
    game-tying shots, lead changes, scoring runs, clutch plays, and big shots.

    Each moment includes AI-generated context explaining why it matters. Moments are also
    automatically sent via WebSocket when detected, so you can use this endpoint to get
    historical moments or if you missed a WebSocket message.

    Args:
        game_id: The unique game ID from NBA

    Returns:
        KeyMomentsResponse: List of recent key moments with AI-generated context
    """
    try:
        moments = await get_key_moments_for_game(game_id)

        return KeyMomentsResponse(game_id=game_id, moments=moments)
    except Exception as e:
        logger.error(f"Error getting key moments for game {game_id}: {e}", exc_info=True)
        raise upstream_error("scoreboard", str(e))


# Get win probability for a specific game
@router.get(
    "/scoreboard/game/{game_id}/win-probability",
    response_model=WinProbabilityResponse,
    tags=["scoreboard"],
    summary="Get Win Probability",
    description="Get real-time win probability for a live game. Returns current probability and history.",
)
async def get_game_win_probability(game_id: str):
    """
    Get real-time win probability for a game.

    This endpoint fetches win probability data from the NBA API, which calculates
    the likelihood of each team winning based on the current game state (score,
    time remaining, etc.). Win probability updates as the game progresses.

    The response includes:
    - Current win probability for home and away teams (0.0-1.0)
    - Timestamp when probability was calculated
    - Optional probability history for visualization

    Args:
        game_id: The unique game ID from NBA (10-digit string)

    Returns:
        WinProbabilityResponse: Win probability data, or None if game hasn't started or data unavailable
    """
    try:
        win_prob_data = await get_win_probability(game_id)

        return WinProbabilityResponse(game_id=game_id, win_probability=win_prob_data)
    except Exception as e:
        logger.error(f"Error getting win probability for game {game_id}: {e}", exc_info=True)
        raise upstream_error("scoreboard", str(e))
