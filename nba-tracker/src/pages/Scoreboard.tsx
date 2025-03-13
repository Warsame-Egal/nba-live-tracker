import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScoreboardResponse, Game } from "../types/scoreboard";
import WebSocketService from "../services/webSocketService"; // WebSocket connection
import GameCard from "../components/GameCard";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const SCOREBOARD_WEBSOCKET_URL = "ws://127.0.0.1:8000/api/v1/ws";

const Scoreboard = () => {
    // State to hold the list of games
  const [games, setGames] = useState<Game[]>([]);
    // State to manage loading status
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    WebSocketService.connect(SCOREBOARD_WEBSOCKET_URL);

    // Handle incoming scoreboard updates
    const handleScoreboardUpdate = (data: ScoreboardResponse) => {
      setGames(data.scoreboard.games);
      setLoading(false);
    };

    // Subscribe to WebSocket updates
    WebSocketService.subscribe(handleScoreboardUpdate);

    return () => {
      // Unsubscribe and disconnect when the component unmounts
      WebSocketService.unsubscribe(handleScoreboardUpdate);
      WebSocketService.disconnect();
    };
  }, []);

  // Slider settings for the game cards
  const sliderSettings = {
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Scoreboard header */}
      <div className="bg-gray-800 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <Slider {...sliderSettings} className="overflow-hidden">
            {games.map((game) => (
              <div key={game.gameId} className="p-2">
                <div className="flex items-center justify-between bg-gray-700 px-4 py-2 rounded-lg shadow-lg">
                  
                  {/* Away Team */}
                  <div className="text-center">
                    <Link to={`/team/${game.awayTeam.teamId}`}>
                      <img
                        src={`/logos/${game.awayTeam.teamTricode}.svg`}
                        className="w-10 h-10 mx-auto cursor-pointer hover:scale-110 transition"
                        alt={game.awayTeam.teamName}
                      />
                    </Link>
                    <p className="text-sm text-gray-300">{game.awayTeam.teamTricode}</p>
                  </div>

                  {/* Score & Status */}
                  <div className="mx-4 text-center">
                    <p className="text-xl font-bold">
                      {game.awayTeam.score} - {game.homeTeam.score}
                    </p>
                    <p className={`text-xs px-2 py-1 rounded ${game.gameStatusText === "LIVE" ? "bg-red-600 text-white" : "bg-gray-600"}`}>
                      {game.gameStatusText} {game.period > 0 ? `Q${game.period}` : ""}
                    </p>
                  </div>

                  {/* Home Team */}
                  <div className="text-center">
                    <Link to={`/team/${game.homeTeam.teamId}`}>
                      <img
                        src={`/logos/${game.homeTeam.teamTricode}.svg`}
                        className="w-10 h-10 mx-auto cursor-pointer hover:scale-110 transition"
                        alt={game.homeTeam.teamName}
                      />
                    </Link>
                    <p className="text-sm text-gray-300">{game.homeTeam.teamTricode}</p>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        {loading ? (
          <p className="text-center text-gray-400 text-lg">Loading games...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.length > 0 ? (
              games.map((game) => <GameCard key={game.gameId} game={game} />)
            ) : (
              <p className="text-center col-span-3 text-gray-400">No live games currently.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;
