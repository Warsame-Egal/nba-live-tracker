import { useState, useEffect } from "react";
import { ScoreboardResponse, Game } from "../types/scoreboard";
import WebSocketService from "../services/websocketService";
import GameCard from "../components/GameCard";
import SearchBar from "../components/SearchBar";
import PlayByPlay from "../components/PlayByPlay";
import ScoringLeaders from "../components/ScoringLeaders";
import Navbar from "../components/Navbar"

const SCOREBOARD_WEBSOCKET_URL = "ws://127.0.0.1:8000/api/v1/ws";

const Scoreboard = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    WebSocketService.connect(SCOREBOARD_WEBSOCKET_URL);

    const handleScoreboardUpdate = (data: ScoreboardResponse) => {
      setGames(data.scoreboard.games);
      setLoading(false);
    };

    WebSocketService.subscribe(handleScoreboardUpdate);

    return () => {
      WebSocketService.unsubscribe(handleScoreboardUpdate);
      WebSocketService.disconnect();
    };
  }, []);

  // Filter games based on search input
  const filteredGames = searchQuery
    ? games.filter(
        (game) =>
          game.awayTeam.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.homeTeam.teamName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : games;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar Component */}
      <Navbar />

      {/* Scoreboard Search Bar */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <SearchBar setSearchQuery={setSearchQuery} />
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scoreboard */}
        <div className="md:col-span-2">
          {loading ? (
            <p className="text-center text-gray-400 text-lg">Loading games...</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.length > 0 ? (
                filteredGames.map((game) => (
                  <GameCard key={game.gameId} game={game} setSelectedGame={setSelectedGame} />
                ))
              ) : (
                <p className="text-center col-span-3 text-gray-400">No games found.</p>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Scoring Leaders & Play-by-Play */}
        <div className="space-y-6 flex flex-col h-full max-h-[80vh]">
          <ScoringLeaders selectedGame={selectedGame} />
          <PlayByPlay gameId={selectedGame?.gameId || null} />
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
