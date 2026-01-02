"""
Live game insights service using Groq LLM.
Generates insights only on specific triggers to respect rate limits.
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Tuple

from app.services.groq_client import GROQ_AVAILABLE, call_groq_api, get_groq_rate_limiter
from app.services.groq_prompts import build_live_game_insight_prompt, get_live_game_system_message
from app.config import get_groq_api_key

logger = logging.getLogger(__name__)


class LiveInsightTrigger:
    """Detects when to generate live game insights based on game events."""
    
    def __init__(self):
        self.last_scores: Dict[str, Tuple[int, int]] = {}  # game_id -> (home_score, away_score)
        self.last_periods: Dict[str, int] = {}  # game_id -> period
        self.last_play_counts: Dict[str, int] = {}  # game_id -> play_count
        self.consecutive_scoring: Dict[str, Tuple[str, int]] = {}  # game_id -> (team, count)
        self.last_insight_time: Dict[str, float] = {}  # game_id -> timestamp
    
    def should_generate_insight(
        self,
        game_id: str,
        home_score: int,
        away_score: int,
        period: int,
        clock: str,
        plays: List[Dict],
        current_time: float,
    ) -> Tuple[bool, Optional[str]]:
        """
        Determine if an insight should be generated based on triggers.
        
        Returns:
            Tuple[bool, Optional[str]]: (should_generate, trigger_type)
        """
        # Minimum 30 seconds between insights for same game
        if game_id in self.last_insight_time:
            if current_time - self.last_insight_time[game_id] < 30:
                return False, None
        
        # Trigger 1: Score change
        if game_id in self.last_scores:
            old_home, old_away = self.last_scores[game_id]
            if home_score != old_home or away_score != old_away:
                self.last_scores[game_id] = (home_score, away_score)
                self.last_insight_time[game_id] = current_time
                return True, "score_change"
        
        # Trigger 2: Period change
        if game_id in self.last_periods:
            if period != self.last_periods[game_id]:
                self.last_periods[game_id] = period
                self.last_insight_time[game_id] = current_time
                if period >= 5:
                    return True, "overtime"
                elif period > 1:
                    return True, "period_change"
        
        # Trigger 3: Timeout (check last play)
        if plays:
            last_play = plays[-1]
            action_type = last_play.get("action_type", "").lower()
            if "timeout" in action_type:
                self.last_insight_time[game_id] = current_time
                return True, "timeout"
        
        # Trigger 4: Last 2 minutes of quarter
        if clock and period <= 4:
            try:
                # Parse clock (format: "MM:SS" or "M:SS")
                parts = clock.split(":")
                if len(parts) == 2:
                    minutes = int(parts[0])
                    if minutes <= 2:
                        # Only trigger once per quarter in last 2 minutes
                        quarter_key = f"{game_id}_{period}"
                        if quarter_key not in self.last_insight_time:
                            self.last_insight_time[quarter_key] = current_time
                            self.last_insight_time[game_id] = current_time
                            return True, "end_of_quarter"
            except (ValueError, IndexError):
                pass
        
        # Trigger 5: 2+ consecutive scoring plays by same team
        if len(plays) >= 2:
            recent_plays = plays[-2:]
            scoring_actions = ["shot", "free throw", "3pt", "2pt", "layup", "dunk"]
            
            team_scores = []
            for play in recent_plays:
                action_type = play.get("action_type", "").lower()
                if any(score_action in action_type for score_action in scoring_actions):
                    team = play.get("team_tricode", "")
                    if team:
                        team_scores.append(team)
            
            if len(team_scores) >= 2:
                if len(set(team_scores)) == 1:  # Same team scored twice
                    self.last_insight_time[game_id] = current_time
                    return True, "momentum"
        
        # Update tracking
        self.last_scores[game_id] = (home_score, away_score)
        self.last_periods[game_id] = period
        self.last_play_counts[game_id] = len(plays)
        
        return False, None


_trigger_detector = LiveInsightTrigger()


async def generate_live_insight(
    game_id: str,
    home_team: str,
    away_team: str,
    home_score: int,
    away_score: int,
    period: int,
    clock: str,
    plays: List[Dict],
    top_performer: str = "",
) -> Optional[str]:
    """
    Generate a live game insight if a trigger condition is met.
    
    Args:
        game_id: Game ID
        home_team: Home team name
        away_team: Away team name
        home_score: Home team score
        away_score: Away team score
        period: Current period
        clock: Time remaining
        plays: List of play dictionaries
        top_performer: Optional top performer stat line
        
    Returns:
        Optional[str]: Insight text if generated, None otherwise
    """
    import time
    current_time = time.time()
    
    # Check if we should generate an insight
    should_generate, trigger_type = _trigger_detector.should_generate_insight(
        game_id=game_id,
        home_score=home_score,
        away_score=away_score,
        period=period,
        clock=clock,
        plays=plays,
        current_time=current_time,
    )
    
    if not should_generate or not trigger_type:
        return None
    
    # Check if Groq is available
    if not GROQ_AVAILABLE:
        logger.debug("Groq not available for live insights")
        return None
    
    groq_api_key = get_groq_api_key()
    if not groq_api_key:
        logger.debug("Groq API key not configured for live insights")
        return None
    
    try:
        # Get last 3 plays as text
        last_3_plays = []
        for play in plays[-3:]:
            action_type = play.get("action_type", "")
            description = play.get("description", "")
            if description:
                last_3_plays.append(f"{action_type}: {description}")
            elif action_type:
                last_3_plays.append(action_type)
        
        # Build prompt
        prompt = build_live_game_insight_prompt(
            home_team=home_team,
            away_team=away_team,
            home_score=home_score,
            away_score=away_score,
            period=period,
            clock=clock or "0:00",
            last_3_plays=last_3_plays,
            top_performer=top_performer,
            trigger_type=trigger_type,
        )
        
        # Get system message
        system_message = get_live_game_system_message()
        
        # Call Groq API with timeout
        try:
            response = await asyncio.wait_for(
                call_groq_api(
                    api_key=groq_api_key,
                    system_message=system_message,
                    user_prompt=prompt,
                    rate_limiter=get_groq_rate_limiter()
                ),
                timeout=5.0  # 5 second timeout for live insights
            )
        except asyncio.TimeoutError:
            logger.warning(f"Live insight generation timeout for game {game_id}")
            return None
        
        # Parse response
        content = response['content']
        
        # Try to extract JSON from response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        insight_data = json.loads(content)
        
        if isinstance(insight_data, dict) and "insight" in insight_data:
            insight_text = insight_data["insight"].strip()
            logger.debug(f"Generated live insight for game {game_id}: {insight_text}")
            return insight_text
        
        return None
        
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Groq JSON response for live insight: {e}")
        return None
    except Exception as e:
        logger.warning(f"Error generating live insight for game {game_id}: {e}")
        return None

