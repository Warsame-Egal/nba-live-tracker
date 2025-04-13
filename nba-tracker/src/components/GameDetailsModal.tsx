import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import clsx from 'clsx';
import { BoxScoreResponse, TeamBoxScoreStats, PlayerBoxScoreStats } from '../types/scoreboard';
import PlayByPlay from './PlayByPlay';

interface GameDetailsModalProps {
  gameId: string | null;
  open: boolean;
  onClose: () => void;
}

const GameDetailsModal = ({ gameId, open, onClose }: GameDetailsModalProps) => {
  const [tab, setTab] = useState<'box' | 'play'>('box');
  const [boxScore, setBoxScore] = useState<BoxScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/v1/scoreboard/game/${gameId}/boxscore`);
        const boxRes = await res.json();
        setBoxScore(boxRes);
      } catch (err) {
        console.error('Failed to fetch game details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [gameId]);

  const renderTeamStats = (team: TeamBoxScoreStats) => (
    <div className="mb-6 border border-neutral-800 rounded-md overflow-hidden">
      <div className="bg-neutral-900 px-4 py-2 flex justify-between items-center font-semibold text-white">
        <span>{team.team_name}</span>
        <span className="text-blue-400 text-lg font-bold">{team.score}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-white">
          <thead className="bg-neutral-800 text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left">PLAYER</th>
              <th className="px-2 py-2">MIN</th>
              <th className="px-2 py-2">PTS</th>
              <th className="px-2 py-2">REB</th>
              <th className="px-2 py-2">AST</th>
              <th className="px-2 py-2">STL</th>
              <th className="px-2 py-2">BLK</th>
              <th className="px-2 py-2">TO</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p: PlayerBoxScoreStats, idx) => (
              <tr key={idx} className="border-t border-neutral-700">
                <td className="px-4 py-1">{p.name}</td>
                <td className="text-center">{p.minutes?.replace('PT', '').replace('M', ':00') || '0:00'}</td>
                <td className="text-center">{p.points}</td>
                <td className="text-center">{p.rebounds}</td>
                <td className="text-center">{p.assists}</td>
                <td className="text-center">{p.steals}</td>
                <td className="text-center">{p.blocks}</td>
                <td className="text-center">{p.turnovers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen bg-black/80 px-4 text-center">
        <div className="fixed inset-0 bg-black/80" />
        <div className="inline-block w-full max-w-5xl my-8 overflow-hidden text-left align-middle transition-all transform bg-neutral-950 shadow-xl rounded-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
            <h2 className="text-xl font-semibold text-white">Game Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>

          <div className="px-6 pt-4">
            <div className="flex border-b border-neutral-700 mb-4">
              <button
                className={clsx(
                  'px-4 py-2 font-semibold border-b-2 text-sm',
                  tab === 'box'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent'
                )}
                onClick={() => setTab('box')}
              >
                Box Score
              </button>
              <button
                className={clsx(
                  'ml-4 px-4 py-2 font-semibold border-b-2 text-sm',
                  tab === 'play'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent'
                )}
                onClick={() => setTab('play')}
              >
                Play by Play
              </button>
            </div>

            {loading ? (
              <div className="text-center text-gray-400 py-6">Loading...</div>
            ) : tab === 'box' && boxScore ? (
              <>
                {renderTeamStats(boxScore.home_team)}
                {renderTeamStats(boxScore.away_team)}
              </>
            ) : tab === 'play' ? (
              <PlayByPlay gameId={gameId!} />
            ) : (
              <div className="text-center text-gray-400 py-6">No data available.</div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default GameDetailsModal;
