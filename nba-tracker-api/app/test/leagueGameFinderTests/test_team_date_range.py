from nba_api.stats.endpoints import leaguegamefinder

# Fetch all games for the Golden State Warriors (team ID: 1610612744) in a
# date range
game_finder = leaguegamefinder.LeagueGameFinder(
    team_id_nullable=str(1610612744),
    date_from_nullable="01/01/2024",
    date_to_nullable="03/07/2024",
    league_id_nullable="00",
)

# Convert response to DataFrame
df = game_finder.get_data_frames()[0]

# Print the fetched games for the team within the date range
print(df)
