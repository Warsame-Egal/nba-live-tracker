import { useEffect, useState } from "react";
import { Game } from "./types/game"

export default function App() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    async function fetchLiveScores() {
      try {
        const response = await fetch("http://127.0.0.1:8000/live_scores");
        const data = await response.json();
        setGames(data.games);
      } catch (error) {
        console.error("Error fetching live scores:", error);
      }
    }
    fetchLiveScores();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold">🏀 NBA Live Tracker</h1>
      {games.length === 0 ? (
        <p className="text-gray-400">No live games currently.</p>
      ) : (
        <ul className="mt-4">
          {games.map((game) => (
            <li key={game.gameId} className="text-lg">
              {game.homeTeam.teamName} vs {game.awayTeam.teamName} - {game.gameClock}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
