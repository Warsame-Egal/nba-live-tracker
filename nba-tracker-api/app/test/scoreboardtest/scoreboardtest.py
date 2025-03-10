from nba_api.stats.endpoints import playercareerstats
from nba_api.live.nba.endpoints import scoreboard

# Today's Score Board
games = scoreboard.ScoreBoard()


# Score Board as JSON:
print(games.get_json())

# Score Board as Dictionary
print(games.get_dict())
