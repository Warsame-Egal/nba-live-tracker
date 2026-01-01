import asyncio
import logging
import pandas as pd
from typing import List

from fastapi import HTTPException
from nba_api.stats.endpoints import leaguedashteamstats
from nba_api.stats.library.parameters import PerModeDetailed, SeasonTypeAllStar

from app.schemas.teamstats import TeamStatsResponse, TeamStatCategory, TeamStatSummary
from app.config import get_api_kwargs
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger(__name__)


async def get_team_stats(season: str = "2024-25") -> TeamStatsResponse:
    """Get team statistics for various categories sorted by performance."""
    try:
        api_kwargs = get_api_kwargs()
        
        try:
            # Get per 100 possessions stats for net rating calculation
            await rate_limit()
            stats_data = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: leaguedashteamstats.LeagueDashTeamStats(
                        season=season,
                        per_mode_detailed=PerModeDetailed.per_100_possessions,
                        season_type_all_star=SeasonTypeAllStar.regular,
                        league_id_nullable="00",
                        **api_kwargs
                    ).get_data_frames()[0]
                ),
                timeout=15.0
            )
        except Exception as api_error:
            error_msg = str(api_error).lower()
            if "invalid" in error_msg or "not found" in error_msg or "empty" in error_msg:
                logger.warning(f"Season {season} not available or invalid")
                raise HTTPException(status_code=404, detail=f"No data available for season {season}")
            raise
        
        if stats_data.empty:
            logger.warning(f"No team stats found for season {season}")
            return TeamStatsResponse(
                season=season,
                categories=[
                    TeamStatCategory(category_name="Points Per Game", teams=[]),
                    TeamStatCategory(category_name="Rebounds Per Game", teams=[]),
                    TeamStatCategory(category_name="Assists Per Game", teams=[]),
                    TeamStatCategory(category_name="Field Goal %", teams=[]),
                    TeamStatCategory(category_name="Three Point %", teams=[]),
                    TeamStatCategory(category_name="Win Percentage", teams=[]),
                ]
            )
        
        # Net rating is PLUS_MINUS per 100 possessions
        if "PLUS_MINUS" in stats_data.columns:
            stats_data["NET_RTG"] = pd.to_numeric(stats_data["PLUS_MINUS"], errors='coerce').fillna(0)
        
        for col in ["NET_RTG"]:
            if col in stats_data.columns:
                stats_data[col] = pd.to_numeric(stats_data[col], errors='coerce').fillna(0)
        
        def create_category(df: pd.DataFrame, stat_col: str, category_name: str, top_n: int = 30, ascending: bool = False) -> TeamStatCategory:
            if stat_col not in df.columns:
                return TeamStatCategory(category_name=category_name, teams=[])
            
            df_filtered = df[df.get("GP", 0) > 0].copy()
            
            if df_filtered.empty:
                return TeamStatCategory(category_name=category_name, teams=[])
            
            if ascending:
                sorted_df = df_filtered.nsmallest(top_n, stat_col)
            else:
                sorted_df = df_filtered.nlargest(top_n, stat_col)
            
            teams = []
            for _, row in sorted_df.iterrows():
                team_name = str(row.get("TEAM_NAME", "")).strip()
                value = float(row.get(stat_col, 0)) if pd.notna(row.get(stat_col)) else 0.0
                team_id = int(row.get("TEAM_ID", 0))
                
                if team_name and team_id:
                    teams.append(TeamStatSummary(
                        team_id=team_id,
                        team_name=team_name,
                        team_abbreviation=row.get("TEAM_ABBREVIATION"),
                        value=round(value, 1) if stat_col not in ["FG_PCT", "FG3_PCT", "W_PCT"] else round(value * 100, 1)
                    ))
            
            return TeamStatCategory(category_name=category_name, teams=teams)
        
        categories = []
        categories.append(create_category(stats_data, "NET_RTG", "Net Rating", top_n=30))
        
        return TeamStatsResponse(season=season, categories=categories)
        
    except Exception as e:
        logger.error(f"Error fetching team stats for season {season}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching team stats: {str(e)}")

