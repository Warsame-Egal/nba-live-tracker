from nba_api.stats.endpoints import leaguegamefinder

# Fetch all wins/losses for the Boston Celtics (1610612738) in a date range
game_finder = leaguegamefinder.LeagueGameFinder(
    team_id_nullable=str(1610612738),
    date_from_nullable="01/01/2024",
    date_to_nullable="03/07/2024",
    league_id_nullable="00",
)

# Convert response to DataFrame
df = game_finder.get_data_frames()[0]

# Filter only wins/losses columns
df_wl = df[["GAME_DATE", "MATCHUP", "WL"]]

# Print the fetched win/loss records
print(df_wl)
