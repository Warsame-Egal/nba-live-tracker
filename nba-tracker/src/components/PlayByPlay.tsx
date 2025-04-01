import { useEffect, useState } from "react";
import PlayByPlayWebSocketService from "../services/PlayByPlayWebSocketService";
import { PlayByPlayResponse, PlayByPlayEvent } from "../types/playbyplay";
import { FaClock } from "react-icons/fa";

const PlayByPlay = ({ gameId }: { gameId: string }) => {
  const [lastPlay, setLastPlay] = useState<PlayByPlayEvent | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const handleUpdate = (data: PlayByPlayResponse) => {
      if (data?.plays?.length > 0) {
        setLastPlay(data.plays[data.plays.length - 1]);
      }
    };

    PlayByPlayWebSocketService.connect(gameId);
    PlayByPlayWebSocketService.subscribe(handleUpdate);

    return () => {
      PlayByPlayWebSocketService.unsubscribe(handleUpdate);
      PlayByPlayWebSocketService.disconnect();
    };
  }, [gameId]);

  if (!lastPlay) return null;

  const formatTime = (clock: string): string => {
    const match = clock.match(/PT(\d+)M(\d+)S/);
    if (match) return `${match[1]}m ${match[2]}s`;

    const minutesOnly = clock.match(/PT(\d+)M/);
    if (minutesOnly) return `${minutesOnly[1]}m 0s`;

    return clock;
  };

  return (
    <div className="mt-2 px-3 py-2 rounded-md bg-black text-xs text-gray-300">
      <div className="flex justify-between mb-1 flex-wrap">
        <div className="flex items-center gap-2 mb-1">
          <FaClock className="text-gray-500" />
          <span className="text-gray-400">
            {formatTime(lastPlay.clock)} | Q{lastPlay.period}
          </span>
        </div>
      </div>
      <div className="leading-snug">
        {lastPlay.playerName && (
          <span className="text-white font-semibold">{lastPlay.playerName}</span>
        )}{" "}
        {lastPlay.description}
      </div>
    </div>
  );
};

export default PlayByPlay;
