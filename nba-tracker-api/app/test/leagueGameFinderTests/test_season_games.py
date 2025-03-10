from nba_api.stats.endpoints import leaguegamefinder

# Fetch all games for the 2023-24 NBA season
game_finder = leaguegamefinder.LeagueGameFinder(
    season_nullable="2023-24",
    league_id_nullable="00"
)

# Convert response to DataFrame
df = game_finder.get_data_frames()[0]

# Print all games for the season
print(df)
