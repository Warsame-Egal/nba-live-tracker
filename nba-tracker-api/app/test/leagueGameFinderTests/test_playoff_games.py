from nba_api.stats.endpoints import leaguegamefinder

# Fetch all NBA Playoff games from the 2023-24 season
game_finder = leaguegamefinder.LeagueGameFinder(
    season_nullable="2023-24", season_type_nullable="Playoffs", league_id_nullable="00"
)

# Convert response to DataFrame
df = game_finder.get_data_frames()[0]

# Print the fetched playoff games
print(df)
