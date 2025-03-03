import { useEffect, useState } from "react";
import { ScoreboardResponse, Game } from "./types/scoreboard";

export default function App() {
  // State for storing the list of games
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to fetch live scoreboard data from the backend API
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
      <header className="bg-black p-4 text-center text-2xl font-bold">
        NBA Scoreboard
      </header>

      {/* Loading State */}
      {loading ? (
        <p className="text-center mt-10 text-gray-400">Loading games...</p>
      ) : (
        <div className="max-w-7xl mx-auto px-4">
          {/* Grid layout for displaying games */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {games.length > 0 ? (
              games.map((game) => (
                <div key={game.gameId} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                  {/* Display Game Status */}
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>{game.gameStatusText}</span>
                    <span>{game.period > 0 ? `Q${game.period}` : "Upcoming"}</span>
                  </div>

                  {/* Teams Section */}
                  <div className="flex items-center justify-between mt-4">
                    {/* Home Team */}
                    <div className="flex flex-col items-center">
                      <img
                        src={`/logos/${game.homeTeam.teamTricode}.svg`} 
                        alt={game.homeTeam.teamName} 
                        className="w-16 h-16"
                      />
                      <p className="text-lg font-semibold">{game.homeTeam.teamName}</p>
                      <p className="text-2xl font-bold">{game.homeTeam.score}</p>
                    </div>

                    <span className="text-xl font-bold">VS</span>

                    {/* Away Team */}
                    <div className="flex flex-col items-center">
                      <img
                        src={`/logos/${game.awayTeam.teamTricode}.svg`} 
                        alt={game.awayTeam.teamName} 
                        className="w-16 h-16"
                      />
                      <p className="text-lg font-semibold">{game.awayTeam.teamName}</p>
                      <p className="text-2xl font-bold">{game.awayTeam.score}</p>
                    </div>
                  </div>

                  {/* Display top-performing players */}
                  <div className="mt-4 text-gray-400 text-sm">
                    <p>{game.gameLeaders.homeLeaders.name}: {game.gameLeaders.homeLeaders.points} PTS</p>
                    <p>{game.gameLeaders.awayLeaders.name}: {game.gameLeaders.awayLeaders.points} PTS</p>
                  </div>

                  {/* Show game clock if available */}
                  {game.gameClock && (
                    <p className="text-center mt-3 text-lg font-bold text-yellow-400">
                      {game.gameClock}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center col-span-3 text-gray-400">No live games currently.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
