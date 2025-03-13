import { useEffect, useState } from "react";
import { PlayByPlayResponse, PlayByPlayEvent } from "../types/playbyplay";

const PlayByPlay = ({ gameId }: { gameId: string | null }) => {
  const [plays, setPlays] = useState<PlayByPlayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchPlayByPlay = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/playbyplay/${gameId}`);
        if (!response.ok) throw new Error("Failed to fetch play-by-play data");

        const data: PlayByPlayResponse = await response.json();
        setPlays(data.plays);
      } catch (err) {
        console.error("Error fetching play-by-play:", err);
        setError("Could not load play-by-play data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayByPlay();
  }, [gameId]);

  return (
    <div className="bg-neutral-900 p-6 rounded-lg shadow-lg border border-neutral-800 h-64 overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-3">Play-by-Play</h2>

      {loading && <p className="text-gray-400">Loading play-by-play...</p>}
      {error && <p className="text-red-400">{error}</p>}

      <ul className="space-y-2">
        {plays.length > 0 ? (
          plays.map((play, index) => (
            <li key={index} className="text-gray-300 text-sm border-b border-gray-700 py-2">
              <span className="text-xs text-gray-500">{play.clock} | Q{play.period} </span>
              <span className="font-semibold text-white"> {play.teamTricode ? `[${play.teamTricode}]` : ""} </span>
              {play.playerName && <span className="text-indigo-400">{play.playerName}</span>} 
              <span> {play.description}</span>
              <span className="text-gray-400 ml-2">({play.scoreAway} - {play.scoreHome})</span>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No play-by-play data available.</p>
        )}
      </ul>
    </div>
  );
};

export default PlayByPlay;
