def format_matchup(matchup: str) -> str:
    """Ensures matchup format is 'TEAM vs TEAM' without a period."""
    matchup = matchup.replace("vs.", "vs")  # Remove any existing period
    teams = matchup.split(" @ ")
    if len(teams) == 2:
        return f"{teams[1]} vs {teams[0]}"  # No period
    return matchup
