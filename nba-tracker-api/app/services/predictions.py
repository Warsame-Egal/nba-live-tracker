import asyncio
import logging
import math
from typing import Optional

from fastapi import HTTPException
from nba_api.stats.endpoints import leaguestandingsv3, leaguedashteamstats
from nba_api.stats.library.parameters import PerModeDetailed, SeasonTypeAllStar

from app.schemas.predictions import PredictionsResponse, GamePrediction, GamePredictionInsight
from app.services.schedule import getGamesForDate
from app.config import get_api_kwargs

logger = logging.getLogger(__name__)


def calculate_win_probability(
    home_win_pct: float,
    away_win_pct: float,
    home_net_rating: Optional[float] = None,
    away_net_rating: Optional[float] = None,
) -> float:
    """
    Simple win probability calculation.
    
    Formula: Based on team win percentages with home court advantage.
    If net ratings are available, they provide additional context.
    
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
    Simple score prediction based on win probability.
    
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


def generate_simple_insights(
    home_team_name: str,
    away_team_name: str,
    home_win_prob: float,
    home_win_pct: float,
    away_win_pct: float,
    home_net_rating: Optional[float],
    away_net_rating: Optional[float],
) -> list[GamePredictionInsight]:
    """
    Generate simple, explainable insights based on basic stats.
    
    Args:
        home_team_name: Home team name
        away_team_name: Away team name
        home_win_prob: Home team win probability
        home_win_pct: Home team win percentage
        away_win_pct: Away team win percentage
        home_net_rating: Home team net rating
        away_net_rating: Away team net rating
        
    Returns:
        List of simple insights
    """
    insights = []
    
    # Home court advantage
    if home_win_prob > 0.52:
        insights.append(GamePredictionInsight(
            title="Home Court Advantage",
            description=f"{home_team_name} playing at home",
            impact="Home teams win ~54% of games in the NBA"
        ))
    
    # Win percentage comparison
    win_pct_diff = abs(home_win_pct - away_win_pct)
    if win_pct_diff > 0.15:
        better_team = home_team_name if home_win_pct > away_win_pct else away_team_name
        insights.append(GamePredictionInsight(
            title="Team Record",
            description=f"{better_team} has a better season record ({better_team}: {max(home_win_pct, away_win_pct):.1%} vs {min(home_win_pct, away_win_pct):.1%})",
            impact=f"Favors {better_team}"
        ))
    
    # Net rating comparison
    if home_net_rating is not None and away_net_rating is not None:
        net_rating_diff = abs(home_net_rating - away_net_rating)
        if net_rating_diff > 5:
            better_team = home_team_name if home_net_rating > away_net_rating else away_team_name
            insights.append(GamePredictionInsight(
                title="Team Efficiency",
                description=f"{better_team} has a better net rating ({better_team}: {max(home_net_rating, away_net_rating):.1f} vs {min(home_net_rating, away_net_rating):.1f})",
                impact=f"Favors {better_team}"
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
    
    Simple prediction model:
    1. Get team win percentages and net ratings
    2. Calculate win probability (win % + home court advantage + net rating adjustment)
    3. Predict scores based on win probability
    4. Generate simple insights
    
    Args:
        date: Date in YYYY-MM-DD format
        season: Season (e.g., "2024-25")
        
    Returns:
        PredictionsResponse: Predictions for all games
    """
    try:
        # Get games for the date (with timeout, skip game leaders for performance)
        try:
            games_response = await asyncio.wait_for(
                getGamesForDate(date, skip_game_leaders=True),
                timeout=10.0
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
        
        for game in games:
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
            
            # Generate simple insights
            insights = generate_simple_insights(
                home_team_name,
                away_team_name,
                home_win_prob,
                home_win_pct,
                away_win_pct,
                home_net_rating,
                away_net_rating,
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
        
        return PredictionsResponse(
            date=date,
            predictions=predictions,
            season=season
        )
        
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
