"""
Key moments detection service for NBA games.

This service watches live games and automatically spots the important plays that change
the game - things like shots that tie the game, when the lead switches hands, scoring
runs, clutch plays in the final minutes, and big shots that change momentum.

We analyze play-by-play data in real-time to find these moments, then use AI to explain
why each moment matters. AI context is generated in batches (one Groq call for all moments
that need context) for efficiency, following the same pattern as batched insights.

The moments are cached for 5 minutes so users can see recent highlights even if they just
tuned in. Key moments are sent to the frontend via WebSocket so they appear instantly
when detected.
"""

import asyncio
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict

from app.services.data_cache import data_cache
from app.services.groq_client import call_groq_api
from app.services.groq_prompts import (
    build_key_moment_context_prompt,
    get_key_moment_system_message,
)
from app.config import get_groq_api_key

logger = logging.getLogger(__name__)

# Cache for recent key moments per game (stores last 5 minutes of moments)
_key_moments_cache: Dict[str, List[Dict]] = {}
_last_checked_plays: Dict[str, int] = {}  # game_id -> last action_number checked


class KeyMomentType:
    """Types of key moments that can be detected."""
    GAME_TYING_SHOT = "game_tying_shot"
    LEAD_CHANGE = "lead_change"
    SCORING_RUN = "scoring_run"
    CLUTCH_PLAY = "clutch_play"
    BIG_SHOT = "big_shot"


def parse_clock(clock_str: str) -> Optional[Tuple[int, int]]:
    """
    Parse clock string (ISO 8601 format like "PT12M00S") to (minutes, seconds).
    
    Args:
        clock_str: Clock string in ISO 8601 format
        
    Returns:
        Tuple of (minutes, seconds) or None if parsing fails
    """
    if not clock_str:
        return None
    
    try:
        # Handle ISO 8601 format: PT12M00S
        match = re.match(r"PT(\d+)M(\d+)S", clock_str)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            return (minutes, seconds)
        
        # Handle MM:SS format
        match = re.match(r"(\d+):(\d+)", clock_str)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            return (minutes, seconds)
    except Exception:
        pass
    
    return None


def parse_score(score_str: str) -> Optional[int]:
    """Parse score string to integer."""
    if not score_str:
        return None
    try:
        return int(score_str)
    except (ValueError, TypeError):
        return None


def detect_game_tying_shot(
    play: Dict,
    previous_home_score: int,
    previous_away_score: int,
    current_home_score: int,
    current_away_score: int,
) -> bool:
    """
    Detect if a play resulted in a game-tying shot.
    
    This catches those exciting moments when a team ties the game - the score was different
    before this play, and now it's tied. We only count actual scoring plays (shots or free throws),
    not just any play that happens when scores are equal.
    """
    # Game is tied now and wasn't before
    is_tied_now = current_home_score == current_away_score
    was_tied_before = previous_home_score == previous_away_score
    
    if is_tied_now and not was_tied_before:
        # Check if this play resulted in a score
        action_type = play.get("action_type", "").lower()
        if "shot" in action_type or "free throw" in action_type:
            return True
    
    return False


def detect_lead_change(
    previous_home_score: int,
    previous_away_score: int,
    current_home_score: int,
    current_away_score: int,
) -> bool:
    """
    Detect if the lead changed between plays.
    
    This is one of the most important moments - when one team takes the lead from the other.
    We check if a different team is leading now compared to before this play. If the game
    was tied before and someone took the lead, that counts too.
    """
    previous_leader = "home" if previous_home_score > previous_away_score else ("away" if previous_away_score > previous_home_score else None)
    current_leader = "home" if current_home_score > current_away_score else ("away" if current_away_score > current_home_score else None)
    
    # Lead changed if different team is leading now
    return previous_leader is not None and current_leader is not None and previous_leader != current_leader


def detect_scoring_run(
    recent_plays: List[Dict],
    team_tricode: str,
    period: int,
) -> bool:
    """
    Detect if a team has scored 6+ points in quick succession.
    
    Scoring runs are when a team gets hot and scores multiple times in a row. We look
    at the last 15 plays (roughly 2 minutes of game time) and check if one team scored
    6 or more points in consecutive plays. This catches those momentum-shifting stretches
    where a team goes on a run.
    
    Args:
        recent_plays: List of recent plays (most recent first)
        team_tricode: Team to check for scoring run
        period: Current period
        
    Returns:
        True if scoring run detected
    """
    if len(recent_plays) < 2:
        return False
    
    # Get plays from last 2 minutes (rough estimate: ~10-15 plays)
    plays_to_check = recent_plays[:15]
    
    team_points = 0
    consecutive_team_plays = 0
    
    for play in plays_to_check:
        play_team = play.get("team_tricode", "")
        action_type = play.get("action_type", "").lower()
        
        # Check if this is a scoring play for the team
        if play_team == team_tricode and ("shot" in action_type or "free throw" in action_type):
            # Estimate points (2 for 2pt, 3 for 3pt, 1 for FT)
            if "3-pt" in action_type or "three" in action_type:
                team_points += 3
            elif "free throw" in action_type:
                team_points += 1
            else:
                team_points += 2
            
            consecutive_team_plays += 1
        else:
            # Reset if other team scores or non-scoring play
            if "shot" in action_type or "free throw" in action_type:
                break
    
    # Scoring run: 6+ points in consecutive plays
    return team_points >= 6 and consecutive_team_plays >= 2


def detect_clutch_play(
    play: Dict,
    period: int,
    clock: Optional[Tuple[int, int]],
    home_score: int,
    away_score: int,
) -> bool:
    """
    Detect if a play is a clutch play - an important play in the final minutes of a close game.
    
    Clutch plays are those high-pressure moments that can decide the game. We look for scoring
    plays in the 4th quarter (or later) with less than 2 minutes left, and the score is within
    5 points. These are the plays that really matter when the game is on the line.
    
    Args:
        play: The play to check
        period: Current period
        clock: Current clock (minutes, seconds)
        home_score: Home team score
        away_score: Away team score
        
    Returns:
        True if clutch play detected
    """
    # Must be in 4th quarter or later
    if period < 4:
        return False
    
    # Must be in last 2 minutes
    if clock:
        minutes, seconds = clock
        total_seconds = minutes * 60 + seconds
        if total_seconds > 120:  # More than 2 minutes left
            return False
    else:
        return False
    
    # Score must be within 5 points
    score_diff = abs(home_score - away_score)
    if score_diff > 5:
        return False
    
    # Must be a scoring play
    action_type = play.get("action_type", "").lower()
    if "shot" in action_type or "free throw" in action_type:
        return True
    
    return False


def detect_big_shot(
    play: Dict,
    previous_home_score: int,
    previous_away_score: int,
    current_home_score: int,
    current_away_score: int,
) -> bool:
    """
    Detect if a 3-pointer is a "big shot" that significantly changes the game situation.
    
    Big shots are 3-pointers that either extend a lead to double digits (10+ points) or
    cut a deficit down to 5 points or less. These are momentum-changing shots that can
    swing the game in one direction or the other. A 3-pointer that puts you up by 10
    feels very different than being up by 7, and a 3 that cuts a deficit from 8 to 5
    makes it a one-possession game.
    
    Args:
        play: The play to check
        previous_home_score: Previous home score
        previous_away_score: Previous away score
        current_home_score: Current home score
        current_away_score: Current away score
        
    Returns:
        True if big shot detected
    """
    action_type = play.get("action_type", "").lower()
    
    # Must be a 3-pointer
    if "3-pt" not in action_type and "three" not in action_type:
        return False
    
    # Determine which team scored
    play_team = play.get("team_tricode", "")
    if not play_team:
        return False
    
    # Get previous and current score differentials
    previous_diff = previous_home_score - previous_away_score
    current_diff = current_home_score - current_away_score
    
    # Determine if home or away team scored
    if play_team:
        # Check if this extends lead to 10+ or cuts deficit to 5 or less
        if abs(current_diff) >= 10 and abs(previous_diff) < 10:
            return True
        if abs(current_diff) <= 5 and abs(previous_diff) > 5:
            return True
    
    return False


async def detect_key_moments(game_id: str) -> List[Dict]:
    """
    Detect key moments for a game by analyzing play-by-play events.
    
    This is the main function that runs the detection. We grab the latest play-by-play data
    from the cache (no API calls needed), then check each new play to see if it matches any
    of our key moment patterns. We only check plays we haven't seen before to avoid duplicate
    detections.
    
    Args:
        game_id: Game ID to analyze
        
    Returns:
        List of detected key moments
    """
    # Get play-by-play data from cache (this is fast, no API call)
    playbyplay_data = await data_cache.get_playbyplay(game_id)
    
    if not playbyplay_data or not playbyplay_data.plays:
        return []
    
    # Get scoreboard data to get current game state (scores, period, clock)
    scoreboard_data = await data_cache.get_scoreboard()
    if not scoreboard_data:
        return []
    
    # Find the game in scoreboard
    game = None
    for g in scoreboard_data.scoreboard.games:
        if g.gameId == game_id:
            game = g
            break
    
    # Only detect moments for live games (gameStatus == 2 means "In Progress")
    if not game or game.gameStatus != 2:
        return []
    
    current_home_score = game.homeTeam.score or 0
    current_away_score = game.awayTeam.score or 0
    current_period = game.period
    current_clock = parse_clock(game.gameClock or "")
    
    # Sort plays by action number (most recent first) so we process newest plays first
    plays = sorted(playbyplay_data.plays, key=lambda p: p.action_number, reverse=True)
    
    # Track which plays we've already checked to avoid re-detecting the same moment
    last_checked = _last_checked_plays.get(game_id, 0)
    
    # Only check new plays we haven't seen before
    new_plays = [p for p in plays if p.action_number > last_checked]
    
    if not new_plays:
        return []
    
    # Remember which plays we've checked so we don't check them again next time
    if new_plays:
        _last_checked_plays[game_id] = max(p.action_number for p in new_plays)
    
    detected_moments = []
    
    # Check each new play to see if it's a key moment
    # We run all the detection functions on each play - a single play could be multiple
    # types of moments (e.g., a clutch play that also changes the lead)
    for i, play in enumerate(new_plays):
        # Current scores after this play
        play_home_score = parse_score(play.score_home) or current_home_score
        play_away_score = parse_score(play.score_away) or current_away_score
        
        # Previous scores: look at the play before this one, or use current if first play
        if i < len(new_plays) - 1:
            # There's a previous play in new_plays
            prev_play = new_plays[i + 1]
            previous_home_score = parse_score(prev_play.score_home) or play_home_score
            previous_away_score = parse_score(prev_play.score_away) or play_away_score
        else:
            # This is the first new play, need to look at all plays
            # Find the play with action_number just before this one
            prev_action = play.action_number - 1
            prev_play = next((p for p in plays if p.action_number == prev_action), None)
            if prev_play:
                previous_home_score = parse_score(prev_play.score_home) or play_home_score
                previous_away_score = parse_score(prev_play.score_away) or play_away_score
            else:
                # No previous play found, use current scores (can't detect changes)
                previous_home_score = play_home_score
                previous_away_score = play_away_score
        
        # Get clock and period from play
        play_period = play.period
        play_clock = parse_clock(play.clock)
        
        # Detect different moment types
        if detect_game_tying_shot(
            play.model_dump(),
            previous_home_score,
            previous_away_score,
            play_home_score,
            play_away_score,
        ):
            detected_moments.append({
                "type": KeyMomentType.GAME_TYING_SHOT,
                "play": play.model_dump(),
                "timestamp": datetime.utcnow().isoformat(),
            })
        
        if detect_lead_change(
            previous_home_score,
            previous_away_score,
            play_home_score,
            play_away_score,
        ):
            detected_moments.append({
                "type": KeyMomentType.LEAD_CHANGE,
                "play": play.model_dump(),
                "timestamp": datetime.utcnow().isoformat(),
            })
        
        if detect_clutch_play(
            play.model_dump(),
            play_period,
            play_clock,
            play_home_score,
            play_away_score,
        ):
            detected_moments.append({
                "type": KeyMomentType.CLUTCH_PLAY,
                "play": play.model_dump(),
                "timestamp": datetime.utcnow().isoformat(),
            })
        
        if detect_big_shot(
            play.model_dump(),
            previous_home_score,
            previous_away_score,
            play_home_score,
            play_away_score,
        ):
            detected_moments.append({
                "type": KeyMomentType.BIG_SHOT,
                "play": play.model_dump(),
                "timestamp": datetime.utcnow().isoformat(),
            })
        
        # Check for scoring runs (need to look at recent plays)
        if i < len(new_plays) - 1:  # Need at least 2 plays
            recent_plays = [p.model_dump() for p in new_plays[max(0, i-10):i+1]]
            play_team = play.team_tricode
            if play_team and detect_scoring_run(recent_plays, play_team, play_period):
                detected_moments.append({
                    "type": KeyMomentType.SCORING_RUN,
                    "play": play.model_dump(),
                    "timestamp": datetime.utcnow().isoformat(),
                })
    
    # Cache detected moments so we can show them to users even if they just tuned in
    # We keep the last 5 minutes of moments - anything older gets cleaned up automatically
    # Note: Moments are cached WITHOUT context initially - context is added later via Groq
    # This means detection works even if Groq is down or fails. The badge will still show,
    # just without the AI explanation.
    if game_id not in _key_moments_cache:
        _key_moments_cache[game_id] = []
    
    _key_moments_cache[game_id].extend(detected_moments)
    
    # Clean up old moments (older than 5 minutes) to keep the cache from growing forever
    cutoff_time = datetime.utcnow().timestamp() - 300  # 5 minutes ago
    _key_moments_cache[game_id] = [
        m for m in _key_moments_cache[game_id]
        if datetime.fromisoformat(m["timestamp"]).timestamp() > cutoff_time
    ]
    
    return detected_moments


async def generate_batched_moment_contexts(moments_with_game_info: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Generate AI context for multiple key moments in ONE Groq API call.
    
    This batches all moments that need context into a single Groq call, similar to how
    batched insights work. This is much more efficient than calling Groq per-moment.
    
    Args:
        moments_with_game_info: List of dicts with keys:
            - moment_id: Unique identifier (e.g., "game_id:timestamp")
            - moment: Key moment dictionary with type and play
            - game_info: Game information (home_team, away_team, scores, period, clock)
        
    Returns:
        Dict mapping moment_id to context string (empty dict if generation fails)
    """
    if not moments_with_game_info:
        return {}
    
    try:
        api_key = get_groq_api_key()
        if not api_key:
            logger.debug("Groq API key not available, skipping batched context generation")
            return {}
        
        from app.services.groq_prompts import (
            get_batched_moment_context_system_message,
            build_batched_moment_context_prompt,
        )
        from app.services.groq_client import get_groq_rate_limiter
        
        system_message = get_batched_moment_context_system_message()
        prompt = build_batched_moment_context_prompt(moments_with_game_info)
        
        response = await call_groq_api(
            api_key=api_key,
            system_message=system_message,
            user_prompt=prompt,
            rate_limiter=get_groq_rate_limiter()
        )
        
        if response and response.get("content"):
            import json
            try:
                content = response["content"]
                # Remove markdown code blocks if present
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                parsed = json.loads(content)
                contexts = {}
                
                # Parse response - should have "contexts" array
                if isinstance(parsed, dict) and "contexts" in parsed:
                    for item in parsed["contexts"]:
                        if isinstance(item, dict) and "moment_id" in item and "context" in item:
                            contexts[item["moment_id"]] = item["context"]
                
                logger.info(f"Generated batched context for {len(contexts)} moments")
                return contexts
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse batched context JSON: {e}")
                return {}
        
        return {}
    except Exception as e:
        logger.warning(f"Error generating batched moment contexts: {e}")
        return {}


async def generate_moment_context(moment: Dict, game_info: Dict) -> Optional[str]:
    """
    Generate AI context for a key moment using Groq.
    
    Once we detect a key moment, we use AI to explain why it matters. This gives users
    a quick understanding of the significance - like "This shot tied the game with 2 minutes
    left" or "The lead change gives the visiting team momentum heading into the final quarter."
    
    We use Groq because it's fast - we want the context to appear quickly when a moment happens.
    If Groq isn't available or fails, we just return None and the moment still gets shown,
    just without the AI explanation.
    
    Args:
        moment: Key moment dictionary with type and play
        game_info: Game information (home_team, away_team, scores, etc.)
        
    Returns:
        AI-generated context string or None if generation fails
    """
    try:
        api_key = get_groq_api_key()
        if not api_key:
            logger.warning("Groq API key not available, skipping context generation")
            return None
        
        system_message = get_key_moment_system_message()
        prompt = build_key_moment_context_prompt(moment, game_info)
        
        response = await call_groq_api(api_key, system_message, prompt)
        
        if response and response.get("content"):
            # Parse JSON response
            import json
            try:
                content = response["content"]
                # Remove markdown code blocks if present
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                parsed = json.loads(content)
                return parsed.get("context", "")
            except json.JSONDecodeError:
                # If not JSON, try to extract text directly
                return content.strip()
        
        return None
    except Exception as e:
        logger.warning(f"Error generating moment context: {e}")
        return None


async def get_key_moments_for_game(game_id: str) -> List[Dict]:
    """
    Get recent key moments for a game.
    
    This is the function that the API endpoint calls. It returns all cached moments for
    a game from the last 5 minutes. If any moments don't have AI context yet (maybe Groq
    was busy when we first detected them), we generate it now.
    
    Important: This function always returns a list, even if something goes wrong. If Groq
    fails or context generation fails, we still return the moments - they just won't have
    context. The badge will still show, just without the AI explanation.
    
    Args:
        game_id: Game ID
        
    Returns:
        List of key moments with AI context (context may be None if Groq failed)
    """
    try:
        # Get cached moments (these are already detected, we're just retrieving them)
        moments = _key_moments_cache.get(game_id, [])
        
        # Get current game info so we can generate context if needed
        scoreboard_data = await data_cache.get_scoreboard()
        if not scoreboard_data:
            return moments
        
        game = None
        for g in scoreboard_data.scoreboard.games:
            if g.gameId == game_id:
                game = g
                break
        
        if not game:
            return moments
        
        game_info = {
            "home_team": f"{game.homeTeam.teamCity} {game.homeTeam.teamName}".strip(),
            "away_team": f"{game.awayTeam.teamCity} {game.awayTeam.teamName}".strip(),
            "home_score": game.homeTeam.score or 0,
            "away_score": game.awayTeam.score or 0,
            "period": game.period,
            "clock": game.gameClock or "",
        }
        
        # Generate AI context for any moments that don't have it yet using batched approach
        # We batch all moments that need context into one Groq call for efficiency
        # This follows the same pattern as batched insights - one API call instead of many
        moments_needing_context = []
        for moment in moments:
            if "context" not in moment:
                moment_id = f"{game_id}:{moment.get('timestamp', 'unknown')}"
                moments_needing_context.append({
                    "moment_id": moment_id,
                    "moment": moment,
                    "game_info": game_info,
                })
        
        if moments_needing_context:
            # Generate context for all moments in one batched call
            contexts = await generate_batched_moment_contexts(moments_needing_context)
            
            # Apply contexts to moments
            for item in moments_needing_context:
                moment_id = item["moment_id"]
                moment = item["moment"]
                if moment_id in contexts:
                    moment["context"] = contexts[moment_id]
        
        return moments
    except Exception as e:
        # If anything goes wrong, return empty list rather than crashing
        # This ensures the API endpoint and WebSocket broadcasting don't break
        logger.warning(f"Error getting key moments for game {game_id}: {e}")
        return []


async def process_live_games():
    """
    Background task to continuously detect key moments for all live games.
    
    This function runs periodically (called from the WebSocket manager) and checks all
    live games for new key moments. After detecting moments, it batches all moments
    that need AI context into one Groq call for efficiency (same pattern as batched insights).
    
    It's non-blocking and handles errors gracefully - if one game fails, we still check
    the others. If Groq fails, moments still appear without context.
    
    This should be called periodically (e.g., every 5-10 seconds) while games are live.
    """
    try:
        scoreboard_data = await data_cache.get_scoreboard()
        if not scoreboard_data:
            return
        
        # Get all live games
        live_games = [
            game.gameId
            for game in scoreboard_data.scoreboard.games
            if game.gameStatus == 2
        ]
        
        # Detect moments for each live game
        all_moments_needing_context = []
        for game_id in live_games:
            try:
                moments = await detect_key_moments(game_id)
                if moments:
                    logger.info(f"Detected {len(moments)} key moments for game {game_id}")
                    
                    # Collect moments that need context for batching
                    game = None
                    for g in scoreboard_data.scoreboard.games:
                        if g.gameId == game_id:
                            game = g
                            break
                    
                    if game:
                        game_info = {
                            "home_team": f"{game.homeTeam.teamCity} {game.homeTeam.teamName}".strip(),
                            "away_team": f"{game.awayTeam.teamCity} {game.awayTeam.teamName}".strip(),
                            "home_score": game.homeTeam.score or 0,
                            "away_score": game.awayTeam.score or 0,
                            "period": game.period,
                            "clock": game.gameClock or "",
                        }
                        
                        for moment in moments:
                            if "context" not in moment:
                                moment_id = f"{game_id}:{moment.get('timestamp', 'unknown')}"
                                all_moments_needing_context.append({
                                    "moment_id": moment_id,
                                    "moment": moment,
                                    "game_info": game_info,
                                })
            except Exception as e:
                logger.warning(f"Error detecting moments for game {game_id}: {e}")
        
        # Batch generate context for all moments that need it (one Groq call)
        # This follows the same efficient pattern as batched insights
        if all_moments_needing_context:
            logger.info(f"Generating batched context for {len(all_moments_needing_context)} moments")
            contexts = await generate_batched_moment_contexts(all_moments_needing_context)
            
            # Apply contexts to cached moments
            for item in all_moments_needing_context:
                moment_id = item["moment_id"]
                moment = item["moment"]
                if moment_id in contexts:
                    moment["context"] = contexts[moment_id]
                    # Update cache
                    game_id = moment_id.split(":")[0]
                    if game_id in _key_moments_cache:
                        for cached_moment in _key_moments_cache[game_id]:
                            if cached_moment.get("timestamp") == moment.get("timestamp"):
                                cached_moment["context"] = contexts[moment_id]
                                break
    
    except Exception as e:
        logger.error(f"Error processing live games for key moments: {e}")

