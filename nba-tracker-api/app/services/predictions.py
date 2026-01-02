import asyncio
import logging
import math
import json
import time
from typing import Optional

from fastapi import HTTPException
from nba_api.stats.endpoints import leaguestandingsv3, leaguedashteamstats
from nba_api.stats.library.parameters import PerModeDetailed, SeasonTypeAllStar

from app.schemas.predictions import PredictionsResponse, GamePrediction, GamePredictionInsight
from app.services.schedule import getGamesForDate
from app.config import get_api_kwargs, get_groq_api_key
from app.services.groq_client import GROQ_AVAILABLE, call_groq_api, get_groq_rate_limiter
from app.services.groq_prompts import get_system_message, build_insight_prompt

logger = logging.getLogger(__name__)


def calculate_win_probability(
    home_win_pct: float,
    away_win_pct: float,
    home_net_rating: Optional[float] = None,
    away_net_rating: Optional[float] = None,
) -> float:
    """
    Calculate win probability using deterministic stat-based formula.
    
    Formula: Based on team win percentages with home court advantage.
    Net ratings provide additional context if available.
    
    Args:
        home_win_pct: Home team win percentage (0-1)
        away_win_pct: Away team win percentage (0-1)
        home_net_rating: Home team net rating (optional)
        away_net_rating: Away team net rating (optional)
        
    Returns:
        float: Home team win probability (0-1)
    """
    # Base probability from win percentages
    if home_win_pct + away_win_pct == 0:
        base_prob = 0.5
    else:
        base_prob = home_win_pct / (home_win_pct + away_win_pct)
    
    # Adjust for net rating if available (net rating difference affects probability)
    if home_net_rating is not None and away_net_rating is not None:
        net_rating_diff = home_net_rating - away_net_rating
        # 10 point net rating difference ≈ 5% win probability difference
        rating_adjustment = net_rating_diff * 0.005
        base_prob = base_prob + rating_adjustment
    
    # Add home court advantage (typically 3-4% in NBA)
    home_court_advantage = 0.035  # 3.5%
    home_prob = base_prob + home_court_advantage
    
    # Keep probability in reasonable range (5% to 95%)
    home_prob = max(0.05, min(0.95, home_prob))
    
    return home_prob


def predict_score(win_prob: float) -> float:
    """
    Predict score using deterministic formula based on win probability.
    
    Formula: Winner scores more, loser scores less, based on probability.
    Average NBA game score is ~112 points.
    
    Args:
        win_prob: Win probability (0-1)
        
    Returns:
        float: Predicted score
    """
    avg_score = 112.0
    
    # Winner scores more, loser scores less
    if win_prob > 0.5:
        # Home team wins - they score more
        home_score = avg_score + (win_prob - 0.5) * 15
        return round(home_score, 1)
    else:
        # Away team wins - home scores less
        home_score = avg_score - (0.5 - win_prob) * 15
        return round(home_score, 1)


async def generate_ai_insights(
    home_team_name: str,
    away_team_name: str,
    home_win_prob: float,
    predicted_home_score: float,
    predicted_away_score: float,
    home_win_pct: float,
    away_win_pct: float,
    home_net_rating: Optional[float],
    away_net_rating: Optional[float],
) -> list[GamePredictionInsight]:
    """
    Generate AI-powered insights using Groq LLM.
    Falls back to simple insights if Groq is unavailable or fails.
    
    IMPORTANT: Only uses data visible in the UI (win probabilities, predicted scores).
    Does NOT reference win percentages or net ratings that aren't displayed.
    
    Args:
        home_team_name: Home team name
        away_team_name: Away team name
        home_win_prob: Home team win probability (0-1) - VISIBLE IN UI
        predicted_home_score: Predicted home team score - VISIBLE IN UI
        predicted_away_score: Predicted away team score - VISIBLE IN UI
        home_win_pct: Home team win percentage (0-1) - NOT VISIBLE, used for fallback only
        away_win_pct: Away team win percentage (0-1) - NOT VISIBLE, used for fallback only
        home_net_rating: Home team net rating (optional) - NOT VISIBLE, used for fallback only
        away_net_rating: Away team net rating (optional) - NOT VISIBLE, used for fallback only
        
    Returns:
        List of insights (2-3 items)
    """
    # Check if Groq is available and configured
    if not GROQ_AVAILABLE:
        return generate_simple_insights(
            home_team_name, away_team_name, home_win_prob,
            predicted_home_score, predicted_away_score,
            home_win_pct, away_win_pct, home_net_rating, away_net_rating
        )
    
    groq_api_key = get_groq_api_key()
    if not groq_api_key:
        logger.debug("Groq API key not configured, using fallback insights")
        return generate_simple_insights(
            home_team_name, away_team_name, home_win_prob,
            predicted_home_score, predicted_away_score,
            home_win_pct, away_win_pct, home_net_rating, away_net_rating
        )
    
    try:
        # Prepare ONLY data that is visible in the UI
        home_win_prob_pct = home_win_prob * 100
        away_win_prob_pct = (1.0 - home_win_prob) * 100
        
        # Calculate net rating difference if available
        net_rating_diff_str = ""
        if home_net_rating is not None and away_net_rating is not None:
            net_rating_diff = home_net_rating - away_net_rating
            net_rating_diff_str = f"\nNet Rating Difference: {net_rating_diff:+.1f} ({home_team_name if net_rating_diff > 0 else away_team_name})"
        
        # Build prompt using groq_prompts module
        prompt = build_insight_prompt(
            home_team_name=home_team_name,
            away_team_name=away_team_name,
            home_win_prob_pct=home_win_prob_pct,
            away_win_prob_pct=away_win_prob_pct,
            predicted_home_score=predicted_home_score,
            predicted_away_score=predicted_away_score,
            net_rating_diff_str=net_rating_diff_str,
        )
        
        # Get system message
        system_message = get_system_message()
        
        # Call Groq API using groq_client module
        response = await call_groq_api(
            api_key=groq_api_key,
            system_message=system_message,
            user_prompt=prompt,
            rate_limiter=get_groq_rate_limiter()
        )
        
        # Parse response
        content = response['content']
        
        # Try to extract JSON from response (handle markdown code blocks)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        insights_data = json.loads(content)
        
        # Calculate which team is favored (for validation)
        prob_diff = abs(home_win_prob_pct - away_win_prob_pct)
        home_favored = home_win_prob_pct > away_win_prob_pct
        home_wins_by_score = predicted_home_score > predicted_away_score
        
        # Determine which team should be mentioned as favored/winning
        favored_team_lower = (home_team_name if home_favored else away_team_name).lower()
        underdog_team_lower = (away_team_name if home_favored else home_team_name).lower()
        winning_team_lower = (home_team_name if home_wins_by_score else away_team_name).lower()
        
        # Convert to GamePredictionInsight objects and validate consistency
        insights = []
        for item in insights_data[:3]:  # Limit to 3
            if isinstance(item, dict) and "title" in item and "description" in item:
                title = item["title"]
                description = item["description"]
                
                # Validate that insights are consistent with the actual data
                # Check if insight contradicts the favored team or predicted winner
                text_lower = (title + " " + description).lower()
                
                # Skip insights that contradict the data
                # If it says underdog is favored when they're not, skip it
                if underdog_team_lower in text_lower and any(word in text_lower for word in ["favored", "advantage", "likely to win", "expected to win"]):
                    # Check if it's actually saying the underdog is favored (contradiction)
                    if favored_team_lower not in text_lower or text_lower.find(underdog_team_lower) < text_lower.find(favored_team_lower):
                        logger.warning(f"Skipping contradictory insight: {title}")
                        continue
                
                insights.append(GamePredictionInsight(
                    title=title,
                    description=description,
                    impact=""  # Impact field not used for AI insights
                ))

        if insights:
            logger.debug(f"Generated {len(insights)} AI insights for {home_team_name} vs {away_team_name}")
            return insights
        
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Groq JSON response: {e}")
    except Exception as e:
        error_str = str(e)
        # Handle rate limit errors specifically
        if "429" in error_str or "rate_limit" in error_str.lower() or "Rate limit" in error_str:
            logger.warning(f"Groq rate limit hit, using fallback insights: {e}")
            # Wait longer before next attempt to avoid hitting limit again
            await asyncio.sleep(12)
        else:
            logger.warning(f"Error generating AI insights: {e}")
    
    # Fallback to simple insights
    return generate_simple_insights(
        home_team_name, away_team_name, home_win_prob,
        predicted_home_score, predicted_away_score,
        home_win_pct, away_win_pct, home_net_rating, away_net_rating
    )


def generate_simple_insights(
    home_team_name: str,
    away_team_name: str,
    home_win_prob: float,
    predicted_home_score: float,
    predicted_away_score: float,
    home_win_pct: float,
    away_win_pct: float,
    home_net_rating: Optional[float],
    away_net_rating: Optional[float],
) -> list[GamePredictionInsight]:
    """
    Generate deterministic, explainable insights based on clear rules.
    Uses only win probabilities, predicted scores, and net ratings.
    
    Args:
        home_team_name: Home team name
        away_team_name: Away team name
        home_win_prob: Home team win probability (0.0-1.0)
        predicted_home_score: Predicted home team score
        predicted_away_score: Predicted away team score
        home_win_pct: Home team win percentage (for reference, not shown in UI)
        away_win_pct: Away team win percentage (for reference, not shown in UI)
        home_net_rating: Home team net rating
        away_net_rating: Away team net rating
        
    Returns:
        List of 2-3 insights that never contradict the probabilities
    """
    insights = []
    
    # Calculate key metrics
    home_win_prob_pct = home_win_prob * 100
    away_win_prob_pct = (1.0 - home_win_prob) * 100
    prob_diff = abs(home_win_prob_pct - away_win_prob_pct)
    score_diff = abs(predicted_home_score - predicted_away_score)
    
    # Determine favored team
    favored_team = home_team_name if home_win_prob > 0.5 else away_team_name
    favored_prob = home_win_prob_pct if home_win_prob > 0.5 else away_win_prob_pct
    
    # 1. Probability gap insight (always include if significant)
    if prob_diff >= 15.0:
        insights.append(GamePredictionInsight(
            title="Large probability gap",
            description=f"{favored_team} have a clear edge based on win probability.",
            impact=""
        ))
    elif prob_diff >= 8.0:
        insights.append(GamePredictionInsight(
            title="Moderate probability gap",
            description=f"{favored_team} are favored based on win probability.",
            impact=""
        ))
    elif prob_diff < 8.0:
        insights.append(GamePredictionInsight(
            title="Close matchup",
            description="Win probabilities suggest a competitive game.",
            impact=""
        ))
    
    # 2. Home court advantage (only if home team is actually favored)
    if home_win_prob > 0.5:
        insights.append(GamePredictionInsight(
            title="Home court advantage",
            description=f"{home_team_name} playing at home provides an edge.",
            impact=""
        ))
    
    # 3. Net rating advantage (only if difference >= 5)
    if home_net_rating is not None and away_net_rating is not None:
        net_rating_diff = abs(home_net_rating - away_net_rating)
        if net_rating_diff >= 5.0:
            better_team = home_team_name if home_net_rating > away_net_rating else away_team_name
            better_rating = max(home_net_rating, away_net_rating)
            worse_rating = min(home_net_rating, away_net_rating)
            insights.append(GamePredictionInsight(
                title="Efficiency advantage",
                description=f"{better_team} have a stronger net rating ({better_rating:.1f} vs {worse_rating:.1f}).",
                impact=""
            ))
    
    # 4. Winning margin category (based on predicted score difference)
    if score_diff <= 5.0:
        margin_insight = "Close game expected based on predicted score."
    elif score_diff <= 10.0:
        margin_insight = "Moderate winning margin expected."
    else:
        margin_insight = "Large winning margin expected."
    
    # Only add margin insight if we don't have 3 already
    if len(insights) < 3:
        insights.append(GamePredictionInsight(
            title="Predicted margin",
            description=margin_insight,
            impact=""
        ))
    
    return insights[:3]  # Limit to 3 insights


async def get_team_statistics(season: str) -> dict:
    """
    Get basic team statistics (win percentage and net rating).
    
    Args:
        season: Season (e.g., "2024-25")
        
    Returns:
        dict: {team_id: {"win_pct": float, "net_rating": float, "team_name": str}}
    """
    try:
        api_kwargs = get_api_kwargs()
        
        try:
            # Add timeouts to prevent hanging (10 seconds each)
            standings_df, stats_df = await asyncio.gather(
                asyncio.wait_for(
                    asyncio.to_thread(
                        lambda: leaguestandingsv3.LeagueStandingsV3(
                            league_id="00",
                            season=season,
                            season_type="Regular Season",
                            **api_kwargs
                        ).get_data_frames()[0]
                    ),
                    timeout=10.0
                ),
                asyncio.wait_for(
                    asyncio.to_thread(
                        lambda: leaguedashteamstats.LeagueDashTeamStats(
                            season=season,
                            per_mode_detailed=PerModeDetailed.per_100_possessions,
                            season_type_all_star=SeasonTypeAllStar.regular,
                            league_id_nullable="00",
                            **api_kwargs
                        ).get_data_frames()[0]
                    ),
                    timeout=10.0
                ),
                return_exceptions=True
            )
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching team statistics for season {season}")
            return {}
        except Exception as e:
            logger.error(f"Error in asyncio.gather for season {season}: {e}")
            return {}
        
        # Handle exceptions from API calls
        if isinstance(standings_df, Exception):
            logger.warning(f"Error fetching standings for season {season}: {standings_df}")
            standings_df = None
        if isinstance(stats_df, Exception):
            logger.warning(f"Error fetching stats for season {season}: {stats_df}")
            stats_df = None
        
        # Check if DataFrames are empty (common for future seasons)
        if standings_df is None or standings_df.empty:
            logger.warning(f"No standings data available for season {season}")
            return {}
        
        team_stats = {}
        
        # Process standings for win percentages and team names
        for _, row in standings_df.iterrows():
            team_id = int(row.get("TeamID", 0))
            if team_id:
                team_city = str(row.get("TeamCity", "")).strip()
                team_name = str(row.get("TeamName", "")).strip()
                full_name = f"{team_city} {team_name}".strip() if team_city and team_name else (team_name or team_city or "")
                team_stats[team_id] = {
                    "win_pct": float(row.get("WinPCT", 0.5)),
                    "team_name": full_name,
                }
        
        # Process net ratings (if available)
        if stats_df is not None and not stats_df.empty:
            for _, row in stats_df.iterrows():
                team_id = int(row.get("TEAM_ID", 0))
                if team_id in team_stats:
                    plus_minus = row.get("PLUS_MINUS", 0)
                    net_rating = float(plus_minus) if not math.isnan(plus_minus) else None
                    team_stats[team_id]["net_rating"] = net_rating
        
        return team_stats
    except Exception as e:
        logger.error(f"Error fetching team statistics for season {season}: {e}", exc_info=True)
        return {}


async def predict_games_for_date(date: str, season: str) -> PredictionsResponse:
    """
    Predict outcomes for all games on a given date.
    
    Prediction model (deterministic, stat-based):
    1. Get team win percentages and net ratings
    2. Calculate win probability (win % + home court advantage + net rating adjustment)
    3. Predict scores based on win probability
    4. Generate AI insights (with fallback to simple insights)
    
    Args:
        date: Date in YYYY-MM-DD format
        season: Season (e.g., "2024-25")
        
    Returns:
        PredictionsResponse: Predictions for all games
    """
    try:
        # Get games for the date (with timeout)
        try:
            games_response = await asyncio.wait_for(
                getGamesForDate(date),
                timeout=30.0
            )
            games = games_response.games
            logger.info(f"Found {len(games)} games for date {date}")
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching games for date {date}")
            return PredictionsResponse(
                date=date,
                predictions=[],
                season=season
            )
        except HTTPException as e:
            # If 404, it means no games found - return empty predictions
            if e.status_code == 404:
                logger.info(f"No games found for date {date} (404 from schedule service)")
                return PredictionsResponse(
                    date=date,
                    predictions=[],
                    season=season
                )
            raise
        
        if not games:
            return PredictionsResponse(
                date=date,
                predictions=[],
                season=season
            )
        
        # Get team statistics
        team_stats = await get_team_statistics(season)
        
        # If no team stats available (e.g., future season), return empty predictions
        if not team_stats:
            logger.info(f"No team statistics available for season {season}, returning empty predictions")
            return PredictionsResponse(
                date=date,
                predictions=[],
                season=season
            )
        
        predictions = []
        
        logger.info(f"Processing {len(games)} games for predictions on {date}")
        start_time = time.time()
        
        for idx, game in enumerate(games, 1):
            try:
                logger.debug(f"Processing game {idx}/{len(games)}: {game.game_id}")
                
                home_team_id = game.home_team.team_id
                away_team_id = game.away_team.team_id
                
                home_stats = team_stats.get(home_team_id, {})
                away_stats = team_stats.get(away_team_id, {})
                
                # Get team names
                home_team_name = home_stats.get("team_name", "")
                away_team_name = away_stats.get("team_name", "")
                
                # Fallback: parse from matchup if team name not available
                if not home_team_name or not away_team_name:
                    # Try both " vs. " and " vs " formats
                    matchup_parts = game.matchup.split(' vs. ') if ' vs. ' in game.matchup else game.matchup.split(' vs ')
                    if len(matchup_parts) == 2:
                        if not away_team_name:
                            away_team_name = matchup_parts[0].strip()
                        if not home_team_name:
                            home_team_name = matchup_parts[1].strip()
                
                # Final fallback to abbreviation
                if not home_team_name:
                    home_team_name = game.home_team.team_abbreviation
                if not away_team_name:
                    away_team_name = game.away_team.team_abbreviation
                
                # Get basic stats
                home_win_pct = home_stats.get("win_pct", 0.5)
                away_win_pct = away_stats.get("win_pct", 0.5)
                home_net_rating = home_stats.get("net_rating")
                away_net_rating = away_stats.get("net_rating")
                
                # Calculate win probability (simple formula)
                home_win_prob = calculate_win_probability(
                    home_win_pct, away_win_pct, home_net_rating, away_net_rating
                )
                away_win_prob = 1.0 - home_win_prob
                
                # Predict scores
                predicted_home_score = predict_score(home_win_prob)
                predicted_away_score = predict_score(away_win_prob)
                
                # Generate AI insights (with fallback to simple insights)
                # AI only receives visible UI data (win probabilities, predicted scores)
                # Fallback data (win pct, net rating) is only used if AI fails
                logger.info(f"Generating AI insights for game {idx}/{len(games)}: {away_team_name} @ {home_team_name}")
                try:
                    insights = await asyncio.wait_for(
                        generate_ai_insights(
                            home_team_name,
                            away_team_name,
                            home_win_prob,
                            predicted_home_score,
                            predicted_away_score,
                            home_win_pct,
                            away_win_pct,
                            home_net_rating,
                            away_net_rating,
                        ),
                        timeout=10.0  # 10 second timeout per game's AI insights - fail fast and use fallback
                    )
                    logger.info(f"AI insights generated for game {idx}/{len(games)}")
                except asyncio.TimeoutError:
                    logger.warning(f"AI insights timeout for game {idx}, using fallback")
                    insights = generate_simple_insights(
                        home_team_name, away_team_name, home_win_prob,
                        predicted_home_score, predicted_away_score,
                        home_win_pct, away_win_pct, home_net_rating, away_net_rating
                    )
                except Exception as insight_error:
                    logger.warning(f"Error generating AI insights for game {idx}: {insight_error}, using fallback")
                    insights = generate_simple_insights(
                        home_team_name, away_team_name, home_win_prob,
                        predicted_home_score, predicted_away_score,
                        home_win_pct, away_win_pct, home_net_rating, away_net_rating
                    )
                
                prediction = GamePrediction(
                    game_id=game.game_id,
                    home_team_id=home_team_id,
                    home_team_name=home_team_name,
                    away_team_id=away_team_id,
                    away_team_name=away_team_name,
                    game_date=date,
                    home_win_probability=home_win_prob,
                    away_win_probability=away_win_prob,
                    predicted_home_score=predicted_home_score,
                    predicted_away_score=predicted_away_score,
                    confidence=0.75,  # Fixed confidence for simplicity
                    insights=insights,
                    home_team_win_pct=home_win_pct,
                    away_team_win_pct=away_win_pct,
                    home_team_net_rating=home_net_rating,
                    away_team_net_rating=away_net_rating,
                )
                
                predictions.append(prediction)
                logger.debug(f"Completed game {idx}/{len(games)}: {away_team_name} @ {home_team_name}")
                
            except Exception as game_error:
                logger.error(f"Error processing game {idx} ({game.game_id}): {game_error}", exc_info=True)
                # Continue with next game instead of failing entirely
                continue
        
        elapsed_time = time.time() - start_time
        logger.info(f"Successfully generated {len(predictions)} predictions for date {date} in {elapsed_time:.1f}s")
        
        response = PredictionsResponse(
            date=date,
            predictions=predictions,
            season=season
        )
        
        logger.info(f"Returning {len(predictions)} predictions to client for date {date}")
        return response
        
    except HTTPException:
        raise
    except KeyboardInterrupt:
        raise
    except Exception as e:
        error_msg = str(e)
        if "No game data found" in error_msg or "No games found" in error_msg:
            logger.info(f"No games found for date {date}, returning empty predictions")
            return PredictionsResponse(
                date=date,
                predictions=[],
                season=season
            )
        logger.error(f"Error predicting games for date {date}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating predictions: {str(e)}")
