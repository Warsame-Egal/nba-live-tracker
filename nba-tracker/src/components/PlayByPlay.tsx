import { useEffect, useState, useRef } from 'react';
import PlayByPlayWebSocketService from '../services/PlayByPlayWebSocketService';
import { PlayByPlayResponse, PlayByPlayEvent } from '../types/playbyplay';

const PlayByPlay = ({ gameId }: { gameId: string }) => {
  const [actions, setActions] = useState<PlayByPlayEvent[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const socketRef = useRef<PlayByPlayWebSocketService | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const service = new PlayByPlayWebSocketService();
    socketRef.current = service;

    const handleUpdate = (data: PlayByPlayResponse) => {
      setHasLoadedOnce(true);
      if (data?.plays?.length > 0) {
        const sorted = [...data.plays].sort((a, b) => a.action_number - b.action_number);
        setActions(sorted.reverse()); // Newest at top
      } else {
        setActions([]); // clear if no plays
      }
    };

    service.connect(gameId);
    service.subscribe(handleUpdate);

    return () => {
      service.unsubscribe(handleUpdate);
      service.disconnect();
    };
  }, [gameId]);

  if (!actions.length && hasLoadedOnce) {
    return <div className="text-center text-gray-400 py-6">No play-by-play data available.</div>;
  }

  if (!actions.length) {
    return null; // Don't show anything until something loads
  }

  return (
    <div className="overflow-x-auto border border-neutral-800 rounded-md text-white max-h-[70vh]">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-900 text-gray-400 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left">Clock</th>
            <th className="px-3 py-2 text-left">Team</th>
            <th className="px-3 py-2 text-left">Score</th>
            <th className="px-3 py-2 text-left">Action</th>
            <th className="px-3 py-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((play, idx) => (
            <tr key={play.action_number} className={idx % 2 === 0 ? 'bg-black/30' : ''}>
              <td className="px-3 py-2">{formatClock(play.clock)}</td>
              <td className="px-3 py-2">{play.team_tricode || '-'}</td>
              <td className="px-3 py-2 text-blue-400">
                {play.score_home ?? '-'} - {play.score_away ?? '-'}
              </td>
              <td className="px-3 py-2">{play.action_type}</td>
              <td className="px-3 py-2">{play.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Format PT10M30.5S to 10:30, etc.
const formatClock = (clock: string | null): string => {
  if (!clock) return '';
  if (clock.startsWith('PT')) {
    const match = clock.match(/PT(\d+)M(\d+(\.\d+)?)S/);
    if (match) return `${match[1]}:${parseFloat(match[2]).toFixed(0).padStart(2, '0')}`;
    const minutesOnly = clock.match(/PT(\d+)M/);
    if (minutesOnly) return `${minutesOnly[1]}:00`;
    const secondsOnly = clock.match(/PT(\d+)S/);
    if (secondsOnly) return `0:${secondsOnly[1].padStart(2, '0')}`;
  }
  return clock;
};

export default PlayByPlay;
