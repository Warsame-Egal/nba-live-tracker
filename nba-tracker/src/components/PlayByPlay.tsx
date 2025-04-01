import { useEffect, useState, useRef } from "react";
import PlayByPlayWebSocketService from "../services/PlayByPlayWebSocketService";
import { PlayByPlayResponse, PlayByPlayEvent } from "../types/playbyplay";
import { FaClock, FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";

const PlayByPlay = ({ gameId }: { gameId: string | null }) => {
  const [plays, setPlays] = useState<PlayByPlayEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const playsContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true); // Track initial load

  useEffect(() => {
    if (!gameId) {
      setPlays([]);
      return;
    }

    setPlays([]);

    PlayByPlayWebSocketService.connect(gameId);

    const handlePlayByPlayUpdate = (data: PlayByPlayResponse) => {
      if (!data?.plays) {
        setError("Invalid play-by-play data received.");
        return;
      }
      setPlays(data.plays);
      setError(null);

      // Scroll to bottom on initial load
      if (isInitialLoad.current && playsContainerRef.current) {
        playsContainerRef.current.scrollTop =
          playsContainerRef.current.scrollHeight;
        isInitialLoad.current = false; // Set to false after initial scroll
      }
    };

    PlayByPlayWebSocketService.subscribe(handlePlayByPlayUpdate);

    return () => {
      PlayByPlayWebSocketService.unsubscribe(handlePlayByPlayUpdate);
      PlayByPlayWebSocketService.disconnect();
    };
  }, [gameId]);

  useEffect(() => {
    // Scroll to bottom on new updates
    if (!isInitialLoad.current && playsContainerRef.current && plays.length > 0) {
      playsContainerRef.current.scrollTop =
        playsContainerRef.current.scrollHeight;
    }
  }, [plays]);

  return (
    <div
      className="bg-gradient-to-br from-nba-card-light to-nba-card-dark p-6 rounded-2xl shadow-lg border border-nba-border overflow-y-auto max-h-[60vh] min-h-[350px] w-full"
      ref={playsContainerRef}
    >
      <h2 className="text-xl font-bold text-white mb-4 tracking-tight flex items-center justify-center">
        <FaInfoCircle className="mr-2 text-nba-accent" /> Live Play-by-Play
      </h2>

      {error ? (
        <div className="text-red-400 flex items-center justify-center">
          <FaExclamationTriangle className="mr-2 text-red-500" /> {error}
        </div>
      ) : !gameId ? (
        <div className="text-gray-400 text-center flex items-center justify-center h-full">
          Select a game to see live updates
        </div>
      ) : plays.length > 0 ? (
        <ul className="space-y-4 overflow-y-auto">
          {plays.map((play, index) => <Play key={index} play={play} />)}
        </ul>
      ) : (
        <div className="text-gray-500 text-center flex items-center justify-center h-full">
          No live updates.
        </div>
      )}
    </div>
  );
};

const Play = ({ play }: { play: PlayByPlayEvent }) => {
  const formatTime = (clock: string): string => {
    // If clock matches format PTXmYs (e.g., PT12M34S)
    const match = clock.match(/PT(\d+)M(\d+)S/);
    if (match) {
      return `${match[1]}m ${match[2]}s`;
    }

    // If it's just minutes (PTXm)
    const minutesMatch = clock.match(/PT(\d+)M/);
    if (minutesMatch) {
      return `${minutesMatch[1]}m 0s`; // Adding 0 seconds if no seconds provided
    }

    return clock; // Return original if not in expected format
  };

  return (
    <li className="text-gray-300 text-sm border-b border-nba-border pb-2 pt-2 last:border-b-0">
      <div className="flex items-center mb-1">
        <FaClock className="mr-1 text-gray-500" />
        <span className="text-xs text-gray-500">
          {formatTime(play.clock)} | Q{play.period}
        </span>
      </div>
      <span className="font-medium">
        {play.playerName && (
          <span className="text-nba-accent font-semibold">{play.playerName}</span>
        )}{" "}
        {play.description}
      </span>
    </li>
  );
};

export default PlayByPlay;