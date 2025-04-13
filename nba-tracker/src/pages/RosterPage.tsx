import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TeamRoster, Player } from '../types/team';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RosterPage = () => {
  const { team_id } = useParams<{ team_id: string }>();
  const [teamRoster, setTeamRoster] = useState<TeamRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeamRoster() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/scoreboard/team/${team_id}/roster/2024-25`,
        );

        if (!response.ok) throw new Error('Failed to fetch roster');

        const data = await response.json();
        setTeamRoster(data);
      } catch (error) {
        console.error('Error fetching team roster:', error);
        setError('Failed to load team roster.');
      } finally {
        setLoading(false);
      }
    }

    fetchTeamRoster();
  }, [team_id]);

  return (
    <div className="min-h-screen bg-black -900 text-white">
      {/* Nav Bar */}
      <nav className="flex gap-8 p-4 bg-black text-gray-400 border-b border-gray-700">
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        <Link to={`/team/${team_id}/roster`} className="text-white border-b-2 border-red-500">
          Roster
        </Link>
        <Link to={`/team/${team_id}/schedule`} className="hover:text-white">
          Schedule
        </Link>
      </nav>

      {loading ? (
        <p className="loading">Loading roster...</p>
      ) : error ? (
        <p className="text-center text-red-400">{error}</p>
      ) : (
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-4 text-center">{teamRoster?.team_name} Roster</h1>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-700 text-left">
              <thead className="bg-black -800 text-gray-400 uppercase text-sm">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">POS</th>
                  <th className="p-3">Age</th>
                  <th className="p-3">HT</th>
                  <th className="p-3">WT</th>
                  <th className="p-3">College</th>
                  <th className="p-3">Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {teamRoster?.players.map((player: Player) => (
                  <tr key={player.player_id} className="hover:bg-black -800">
                    <td className="p-3 flex items-center gap-3">
                      <img
                        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`}
                        alt={player.name}
                        className="w-10 h-10 rounded-full"
                        onError={e =>
                          (e.currentTarget.src =
                            'https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png')
                        }
                      />
                      {player.name}
                    </td>
                    <td className="p-3">{player.position || '--'}</td>
                    <td className="p-3">{player.age || '--'}</td>
                    <td className="p-3">{player.height || '--'}</td>
                    <td className="p-3">{player.weight ? `${player.weight} lbs` : '--'}</td>
                    <td className="p-3">{player.experience || '--'}</td>
                    <td className="p-3">{player.school || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterPage;
