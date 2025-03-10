from nba_api.stats.endpoints import leaguegamefinder

# Fetch past games between Chicago Bulls (1610612741) and Orlando Magic
# (1610612753)
game_finder = leaguegamefinder.LeagueGameFinder(
    team_id_nullable=str(1610612741),
    vs_team_id_nullable=str(1610612753),
    league_id_nullable="00"
)

# Convert response to DataFrame
df = game_finder.get_data_frames()[0]

# Print the fetched past head-to-head games
print(df)
