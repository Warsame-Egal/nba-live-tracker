from nba_api.stats.endpoints import leaguegamefinder
from datetime import datetime, timedelta

# Default to yesterday's date
date_str = (datetime.now() - timedelta(days=1)).strftime("%m/%d/%Y")

# Fetch past games for the given date
game_finder = leaguegamefinder.LeagueGameFinder(
    date_from_nullable=date_str,
    date_to_nullable=date_str,
    league_id_nullable="00"
)

# Convert response to DataFrame
df = game_finder.get_data_frames()[0]

# Print the fetched past games
print(df)
