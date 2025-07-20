import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaTrophy } from 'react-icons/fa';

interface Leader {
  player_id: number;
  rank: number;
  name: string;
  team_id: number;
  team_abbreviation: string;
  games_played: number;
  stat_value: number;
}

interface Props {
  season: string;
  statCategory: string; // e.g., 'AST'
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LeagueLeaderHighlights = ({ season, statCategory }: Props) => {
  const [leader, setLeader] = useState<Leader | null>(null);

  useEffect(() => {
    const fetchLeader = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/leaders/${season}/${statCategory}`
        );
        const data = await res.json();
        if (data.leaders && data.leaders.length > 0) {
          setLeader(data.leaders[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeader();
  }, [season, statCategory]);

  if (!leader) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm mb-6">
      <div className="flex items-center gap-2 font-semibold text-white">
        <FaTrophy className="text-yellow-400" />
        <span>
          Led league in {statCategory === 'AST' ? 'Assists per Game' : statCategory}{' '}
          – {leader.stat_value.toFixed(1)}{' '}
          {statCategory === 'PTS' ? 'PPG' : statCategory === 'AST' ? 'APG' : ''} ({season})
        </span>
      </div>
      <Link
        to={`/players/${leader.player_id}`}
        className="block mt-1 text-blue-400 hover:underline"
      >
        {leader.name}
      </Link>
    </div>
  );
};

export default LeagueLeaderHighlights;