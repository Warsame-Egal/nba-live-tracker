import { useEffect, useState } from "react";
import PlayByPlayWebSocketService from "../services/PlayByPlayWebSocketService";
import { PlayByPlayResponse, PlayByPlayEvent } from "../types/playbyplay";

const PlayByPlay = ({ gameId }: { gameId: string | null }) => {
  const [plays, setPlays] = useState<PlayByPlayEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    PlayByPlayWebSocketService.connect(gameId);

    const handlePlayByPlayUpdate = (data: PlayByPlayResponse) => {
      if (!data || !data.plays) {
        setError("Invalid play-by-play data received.");
        return;
      }
      setPlays((prev) => [...data.plays, ...prev]); // Add new plays on top
      setError(null);
    };

    PlayByPlayWebSocketService.subscribe(handlePlayByPlayUpdate);

    return () => {
      PlayByPlayWebSocketService.unsubscribe(handlePlayByPlayUpdate);
      PlayByPlayWebSocketService.disconnect();
    };
  }, [gameId]);

  return (
    <div className="bg-neutral-900 p-6 rounded-lg shadow-lg border border-neutral-800 h-64 overflow-y-auto">
      <h2 className="text-xl font-bold text-white mb-3">Play-by-Play</h2>

      {error && <p className="text-red-400">{error}</p>}

      <ul className="space-y-2">
        {plays.length > 0 ? (
          [...plays].reverse().map((play, index) => ( // Reverse to show newest plays first
            <li key={index} className="text-gray-300 text-sm border-b border-gray-700 py-2">
              <span className="text-xs text-gray-500">{play.clock} | Q{play.period} </span>
              {play.playerName && <span className="text-indigo-400">{play.playerName}</span>}
              <span> {play.description}</span>
            </li>
          ))
        ) : (
          <p className="text-gray-500">No live play-by-play updates.</p>
        )}
      </ul>
    </div>
  );
};

export default PlayByPlay;
