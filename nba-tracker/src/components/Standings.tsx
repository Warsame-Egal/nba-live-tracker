import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StandingRecord, StandingsResponse } from '../types/standings';
import Navbar from '../components/Navbar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const teamMappings: { [key: string]: { abbreviation: string; logo: string } } = {
  'Atlanta Hawks': { abbreviation: 'ATL', logo: '/logos/ATL.svg' },
  'Boston Celtics': { abbreviation: 'BOS', logo: '/logos/BOS.svg' },
  'Brooklyn Nets': { abbreviation: 'BKN', logo: '/logos/BKN.svg' },
  'Charlotte Hornets': { abbreviation: 'CHA', logo: '/logos/CHA.svg' },
  'Chicago Bulls': { abbreviation: 'CHI', logo: '/logos/CHI.svg' },
  'Cleveland Cavaliers': { abbreviation: 'CLE', logo: '/logos/CLE.svg' },
  'Dallas Mavericks': { abbreviation: 'DAL', logo: '/logos/DAL.svg' },
  'Denver Nuggets': { abbreviation: 'DEN', logo: '/logos/DEN.svg' },
  'Detroit Pistons': { abbreviation: 'DET', logo: '/logos/DET.svg' },
  'Golden State Warriors': { abbreviation: 'GSW', logo: '/logos/GSW.svg' },
  'Houston Rockets': { abbreviation: 'HOU', logo: '/logos/HOU.svg' },
  'Indiana Pacers': { abbreviation: 'IND', logo: '/logos/IND.svg' },
  'LA Clippers': { abbreviation: 'LAC', logo: '/logos/LAC.svg' },
  'Los Angeles Lakers': { abbreviation: 'LAL', logo: '/logos/LAL.svg' },
  'Memphis Grizzlies': { abbreviation: 'MEM', logo: '/logos/MEM.svg' },
  'Miami Heat': { abbreviation: 'MIA', logo: '/logos/MIA.svg' },
  'Milwaukee Bucks': { abbreviation: 'MIL', logo: '/logos/MIL.svg' },
  'Minnesota Timberwolves': { abbreviation: 'MIN', logo: '/logos/MIN.svg' },
  'New Orleans Pelicans': { abbreviation: 'NOP', logo: '/logos/NOP.svg' },
  'New York Knicks': { abbreviation: 'NYK', logo: '/logos/NYK.svg' },
  'Oklahoma City Thunder': { abbreviation: 'OKC', logo: '/logos/OKC.svg' },
  'Orlando Magic': { abbreviation: 'ORL', logo: '/logos/ORL.svg' },
  'Philadelphia 76ers': { abbreviation: 'PHI', logo: '/logos/PHI.svg' },
  'Phoenix Suns': { abbreviation: 'PHX', logo: '/logos/PHX.svg' },
  'Portland Trail Blazers': { abbreviation: 'POR', logo: '/logos/POR.svg' },
  'Sacramento Kings': { abbreviation: 'SAC', logo: '/logos/SAC.svg' },
  'San Antonio Spurs': { abbreviation: 'SAS', logo: '/logos/SAS.svg' },
  'Toronto Raptors': { abbreviation: 'TOR', logo: '/logos/TOR.svg' },
  'Utah Jazz': { abbreviation: 'UTA', logo: '/logos/UTA.svg' },
  'Washington Wizards': { abbreviation: 'WAS', logo: '/logos/WAS.svg' },
};

const Standings = () => {
  const { season } = useParams<{ season?: string }>();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const seasonParam = season || `${currentYear - 1}-${currentYear.toString().slice(2)}`;
  const [standings, setStandings] = useState<StandingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conference, setConference] = useState<'East' | 'West'>('East');

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/standings/season/${seasonParam}`);
        if (!res.ok) throw new Error('Failed to fetch standings.');
        const data: StandingsResponse = await res.json();
        setStandings(data.standings);
      } catch {
        setError('Failed to fetch standings.');
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [seasonParam]);

  const filteredStandings = useMemo(() => {
    return standings
      .filter((team) => team.conference === conference)
      .sort((a, b) => a.playoff_rank - b.playoff_rank);
  }, [standings, conference]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h2 className="text-3xl font-bold text-center uppercase tracking-wide mb-6">
          NBA Standings ({seasonParam})
        </h2>

        <div className="flex justify-center mb-4">
          {(['East', 'West'] as const).map((conf) => (
            <button
              key={conf}
              onClick={() => setConference(conf)}
              className={`px-4 py-2 mx-1 rounded ${
                conference === conf
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
            >
              {conf}ern Conference
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-400 text-center">Loading standings...</p>}
        {error && <p className="text-red-500 text-center">{error}</p>}
        {!loading && !error && filteredStandings.length === 0 && (
          <p className="text-gray-400 text-center">No standings data available.</p>
        )}

        {!loading && !error && filteredStandings.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-neutral-700 shadow-lg">
            <table className="min-w-full bg-neutral-950 text-sm">
              <thead className="bg-neutral-900 uppercase text-xs border-b border-neutral-700">
                <tr>
                  <th className="px-2 py-3 text-center">#</th>
                  <th className="px-2 py-3 text-left">Team</th>
                  <th className="px-2 py-3 text-center">W</th>
                  <th className="px-2 py-3 text-center">L</th>
                  <th className="px-2 py-3 text-center">PCT</th>
                  <th className="px-2 py-3 text-center">GB</th>
                  <th className="px-2 py-3 text-center">Home</th>
                  <th className="px-2 py-3 text-center">Away</th>
                  <th className="px-2 py-3 text-center">Div</th>
                  <th className="px-2 py-3 text-center">Conf</th>
                  <th className="px-2 py-3 text-center">L10</th>
                  <th className="px-2 py-3 text-center">Strk</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandings.map((team) => {
                  const teamName = `${team.team_city} ${team.team_name}`;
                  const logo = teamMappings[teamName]?.logo || '/logos/default.svg';
                  return (
                    <tr
                      key={team.team_id}
                      className="border-b border-neutral-700 hover:bg-neutral-800"
                    >
                      <td className="px-2 py-2 text-center font-semibold">
                        {team.playoff_rank}
                      </td>
                      <td
                        className="px-2 py-2 flex items-center gap-2 cursor-pointer hover:underline"
                        onClick={() => navigate(`/team/${team.team_id}`)}
                      >
                        <img src={logo} alt={teamName} className="w-5 h-5" />
                        {teamName}
                      </td>
                      <td className="px-2 py-2 text-center">{team.wins}</td>
                      <td className="px-2 py-2 text-center">{team.losses}</td>
                      <td className="px-2 py-2 text-center">
                        {team.win_pct.toFixed(3)}
                      </td>
                      <td className="px-2 py-2 text-center">{team.games_back}</td>
                      <td className="px-2 py-2 text-center">{team.home_record}</td>
                      <td className="px-2 py-2 text-center">{team.road_record}</td>
                      <td className="px-2 py-2 text-center">{team.division_record}</td>
                      <td className="px-2 py-2 text-center">{team.conference_record}</td>
                      <td className="px-2 py-2 text-center">{team.l10_record}</td>
                      <td className={`px-2 py-2 text-center ${team.current_streak_str.startsWith('W') ? 'text-green-500' : 'text-red-500'}`}>
                        {team.current_streak_str}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Standings;
