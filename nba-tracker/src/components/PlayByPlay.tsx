import { useEffect, useState } from "react";
import PlayByPlayWebSocketService from "../services/PlayByPlayWebSocketService";
import { PlayByPlayResponse, PlayByPlayEvent } from "../types/playbyplay";

const PlayByPlay = ({ gameId }: { gameId: string | null }) => {
  const [plays, setPlays] = useState<PlayByPlayEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setPlays([]); // Clear plays when no game is selected
      return;
    }

    setPlays([]); // Reset plays when a new game is selected

    PlayByPlayWebSocketService.connect(gameId);

    const handlePlayByPlayUpdate = (data: PlayByPlayResponse) => {
      if (!data?.plays) {
        setError("Invalid play-by-play data received.");
        return;
      }
      setPlays(data.plays); // Replace the plays list
      setError(null);
    };

    PlayByPlayWebSocketService.subscribe(handlePlayByPlayUpdate);

    return () => {
      PlayByPlayWebSocketService.unsubscribe(handlePlayByPlayUpdate);
      PlayByPlayWebSocketService.disconnect();
    };
  }, [gameId]); // Effect runs when `gameId` changes

  return (
    <div className="bg-neutral-900 p-6 rounded-2xl shadow-lg border border-gray-700 
      overflow-y-auto max-h-[50vh] min-h-[300px] flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-3">Play-by-Play</h2>

      {error && <p className="text-red-400">{error}</p>}
      {!gameId ? (
        <p className="text-gray-400 text-center">Select a game to see play-by-play updates</p>
      ) : plays.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto">
          {[...plays].reverse().map((play, index) => <Play key={index} play={play} />)} {/* Reversed */}
        </ul>
      ) : (
        <p className="text-gray-500">No live play-by-play updates.</p>
      )}
    </div>
  );
};

/* Reusable Play by play Component */
const Play = ({ play }: { play: PlayByPlayEvent }) => (
  <li className="text-gray-300 text-sm border-b border-gray-700 py-2">
    <span className="text-xs text-gray-500">{play.clock} | Q{play.period} </span>
    {play.playerName && <span className="text-indigo-400">{play.playerName}</span>}
    <span> {play.description}</span>
  </li>
);

export default PlayByPlay;
