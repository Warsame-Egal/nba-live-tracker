from nba_api.live.nba.endpoints import scoreboard

def get_live_scores():
    """Fetch and format live NBA game scores."""
    try:
        games_data = scoreboard.ScoreBoard().get_dict()["scoreboard"]["games"]

        formatted_games = []
        for game in games_data:
            formatted_games.append({
                "gameId": game["gameId"],
                "status": game["gameStatusText"],
                "period": game["period"],
                "gameClock": game["gameClock"],
                "gameTimeUTC": game["gameTimeUTC"],
                "homeTeam": {
                    "id": game["homeTeam"]["teamId"],
                    "name": game["homeTeam"]["teamName"],
                    "tricode": game["homeTeam"]["teamTricode"],
                    "score": game["homeTeam"]["score"]
                },
                "awayTeam": {
                    "id": game["awayTeam"]["teamId"],
                    "name": game["awayTeam"]["teamName"],
                    "tricode": game["awayTeam"]["teamTricode"],
                    "score": game["awayTeam"]["score"]
                },
                "topScorers": {
                    "home": game["gameLeaders"]["homeLeaders"],
                    "away": game["gameLeaders"]["awayLeaders"]
                }
            })

        return formatted_games
    except Exception as e:
        raise Exception(f"Error fetching live scores: {e}")
