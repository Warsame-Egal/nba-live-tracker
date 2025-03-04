import { useEffect, useState } from "react";
import { ScoreboardResponse, Game } from "./types/scoreboard";
import GameCard from "./components/GameCard";

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScoreboard() {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/scoreboard");
        const data: ScoreboardResponse = await response.json();
        setGames(data.scoreboard.games);
      } catch (error) {
        console.error("Error fetching scoreboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchScoreboard();

    // Auto-refresh scoreboard every 30 seconds
    const interval = setInterval(fetchScoreboard, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="header">NBA Scoreboard</header>

      {/* Loading State */}
      {loading ? (
        <p className="loading">Loading games...</p>
      ) : (
        <div className="container">
          {/* Game Grid */}
          <div className="game-grid">
            {games.length > 0 ? (
              games.map((game) => <GameCard key={game.gameId} game={game} />)
            ) : (
              <p className="text-center col-span-3 text-gray-400">
                No live games currently.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
