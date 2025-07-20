import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBasketballBall, FaTrophy } from 'react-icons/fa';
import { toOrdinal } from '../utils/format';

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
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const fetchLeaders = async (season: string, stat: string): Promise<Leader[]> => {
  const res = await fetch(`${API_BASE_URL}/api/v1/leaders/${season}/${stat}`);
  const data = await res.json();
  return data.leaders as Leader[];
};

const TopPerformers = ({ season }: Props) => {
  const [scoring, setScoring] = useState<Leader[]>([]);
  const [assists, setAssists] = useState<Leader[]>([]);

  useEffect(() => {
    fetchLeaders(season, 'PTS').then(setScoring).catch(console.error);
    fetchLeaders(season, 'AST').then(setAssists).catch(console.error);
  }, [season]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold mb-2">
          <FaBasketballBall className="text-orange-400" /> Scoring Leaders
        </h3>
        <ul className="space-y-1 text-sm">
          {scoring.slice(0, 5).map(l => (
            <li key={l.player_id}>
              <Link to={`/players/${l.player_id}`} className="hover:underline">
                {l.name}
              </Link>{' '}
              <span className="text-gray-400">
                {toOrdinal(l.rank)} • {l.stat_value.toFixed(1)} PPG • {l.team_abbreviation}

              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold mb-2">
          <FaTrophy className="text-yellow-400" /> Assist Leaders
        </h3>
        <ul className="space-y-1 text-sm">
          {assists.slice(0, 5).map(l => (
            <li key={l.player_id}>
              <Link to={`/players/${l.player_id}`} className="hover:underline">
                {l.name}
              </Link>{' '}
              <span className="text-gray-400">
                {toOrdinal(l.rank)} • {l.stat_value.toFixed(1)} APG • {l.team_abbreviation}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TopPerformers;