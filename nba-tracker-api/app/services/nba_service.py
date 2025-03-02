from nba_api.live.nba.endpoints import scoreboard


def get_live_scores():
    """Fetch and format live NBA game scores."""
    try:
        games_data = scoreboard.ScoreBoard().get_dict()["scoreboard"]


        return 
        
    except Exception as e:
        raise Exception(f"Error fetching live scores: {e}")
