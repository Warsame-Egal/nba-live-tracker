from nba_api.stats.endpoints import leaguegamefinder

# Fetch all games for the Chicago Bulls (team ID: 1610612741) in the 2023-24 season
game_finder = leaguegamefinder.LeagueGameFinder(
    season_nullable="2023-24",
    team_id_nullable=str(1610612741),
    league_id_nullable="00"
)

# Convert response to DataFrame
df = game_finder.get_data_frames()[0]

# Print the fetched games for the team
print(df)
