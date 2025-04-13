import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { TeamRoster } from '../types/team';
import Navbar from '../components/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface TeamDetails {
  team_id: number;
  team_name: string;
  team_city: string;
  abbreviation: string;
  year_founded: number;
  arena: string;
  owner: string;
  general_manager: string;
  head_coach: string;
}

const TeamPage = () => {
  const { team_id } = useParams<{ team_id: string }>();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/teams/${team_id}`);
        if (!res.ok) throw new Error('Failed to fetch team details');
        const data = await res.json();
        setTeam(data);

        const rosterRes = await fetch(`${API_BASE_URL}/api/v1/teams/${team_id}/roster`);
        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          setRoster(rosterData);
        }
      } catch (err) {
        setError(`Failed to load team information. ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [team_id]);

  if (loading) return <p className="text-gray-400 text-center mt-8">Loading team details...</p>;
  if (error) return <p className="text-red-500 text-center mt-8">{error}</p>;
  if (!team) return <p className="text-gray-500 text-center mt-4">Team not found.</p>;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Team Logo */}
          <div className="w-52 h-auto">
            <img
              src={`/logos/${team.abbreviation ?? team.team_id}.svg`}
              alt={team.team_name}
              className="rounded-md w-full"
              onError={e => ((e.target as HTMLImageElement).src = '/fallback-team.png')}
            />
          </div>

          {/* Team Info */}
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold leading-tight">{team.team_name}</h1>
            <p className="text-sm text-gray-300 uppercase">{team.team_city}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm mt-4">
              <p>
                <span className="text-gray-400 uppercase">Founded:</span> {team.year_founded ?? '—'}
              </p>
              <p>
                <span className="text-gray-400 uppercase">Arena:</span> {team.arena ?? '—'}
              </p>
              <p>
                <span className="text-gray-400 uppercase">Owner:</span> {team.owner ?? '—'}
              </p>
              <p>
                <span className="text-gray-400 uppercase">GM:</span> {team.general_manager ?? '—'}
              </p>
              <p>
                <span className="text-gray-400 uppercase">Coach:</span> {team.head_coach ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Roster */}
        {roster?.players?.length ? (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-200">Roster</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left table-auto border border-neutral-700">
                <thead className="bg-neutral-900 border-b border-neutral-700">
                  <tr>
                    <th className="p-2 text-xs font-semibold">#</th>
                    <th className="p-2 text-xs font-semibold">Name</th>
                    <th className="p-2 text-xs font-semibold">Position</th>
                    <th className="p-2 text-xs font-semibold">Height</th>
                    <th className="p-2 text-xs font-semibold">Weight</th>
                    <th className="p-2 text-xs font-semibold">Age</th>
                    <th className="p-2 text-xs font-semibold">Experience</th>
                    <th className="p-2 text-xs font-semibold">School</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.players.map(player => (
                    <tr
                      key={player.player_id}
                      className="border-b border-neutral-700 hover:bg-neutral-800"
                    >
                      <td className="p-2 text-xs">{player.jersey_number}</td>
                      <td className="p-2 text-xs">{player.name}</td>
                      <td className="p-2 text-xs">{player.position}</td>
                      <td className="p-2 text-xs">{player.height}</td>
                      <td className="p-2 text-xs">{player.weight}</td>
                      <td className="p-2 text-xs">{player.age}</td>
                      <td className="p-2 text-xs">{player.experience}</td>
                      <td className="p-2 text-xs">{player.school}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TeamPage;
