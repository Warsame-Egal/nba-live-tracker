import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StandingRecord, StandingsResponse } from '../types/standings';
import Navbar from '../components/Navbar';

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

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/standings/season/${seasonParam}`);
        if (!res.ok) throw new Error('Network response not ok');
        const data: StandingsResponse = await res.json();
        setStandings(data.standings || []);
      } catch {
        setError('Failed to fetch standings.');
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [seasonParam]);

  if (loading) return <p className="text-gray-400 text-center mt-8">Loading standings...</p>;
  if (error) return <p className="text-red-500 text-center mt-8">{error}</p>;

  // Split standings by conference and sort by playoff_rank
  const east = standings.filter((t) => t.conference === 'East').sort((a, b) => a.playoff_rank - b.playoff_rank);
  const west = standings.filter((t) => t.conference === 'West').sort((a, b) => a.playoff_rank - b.playoff_rank);

  // Render table for a given conference
  const renderTable = (teams: StandingRecord[], title: string) => (
    <div className="mx-auto px-2 mb-8">
      <h3 className="text-xl text-white font-bold mb-3 text-center">{title}</h3>
      <div className="rounded-lg shadow-lg border border-neutral-700">
        <table className="w-full table-fixed text-white bg-neutral-950">
          <thead className="bg-neutral-900 border-b border-neutral-700 text-white text-xs uppercase">
            <tr>
              <th className="w-6 py-2 text-center">#</th>
              <th className="w-36 py-2 text-left pl-2">Team</th>
              <th className="w-14 py-2 text-center">W-L</th>
              <th className="w-14 py-2 text-center">Win%</th>
              <th className="w-12 py-2 text-center">GB</th>
              <th className="w-14 py-2 text-center">Streak</th>
              <th className="w-14 py-2 text-center">L10</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const teamFullName = `${team.team_city} ${team.team_name}`;
              const teamInfo = teamMappings[teamFullName] || {
                abbreviation: 'N/A',
                logo: '/logos/default.svg',
              };

              return (
                <tr
                  key={`${team.team_name}-${team.season_id}`}
                  className="hover:bg-neutral-800 border-b border-neutral-700"
                >
                  <td className="text-center py-2 text-sm font-semibold">{team.playoff_rank}</td>
                  <td
                    onClick={() => navigate(`/team/${team.team_id}`)}
                    className="py-2 pl-2 flex items-center gap-2 cursor-pointer hover:underline truncate"
                  >
                    <img src={teamInfo.logo} alt={teamInfo.abbreviation} className="w-5 h-5" />
                    <span className="truncate text-sm">{teamFullName}</span>
                  </td>
                  <td className="text-center text-sm">{team.wins}-{team.losses}</td>
                  <td className="text-center text-sm">{team.win_pct.toFixed(3)}</td>
                  <td className="text-center text-sm">{team.games_back}</td>
                  <td className="text-center text-sm">{team.current_streak_str}</td>
                  <td className="text-center text-sm">{team.l10_record}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h2 className="text-white text-3xl font-bold mb-6 text-center uppercase tracking-wide">
          NBA Standings ({seasonParam})
        </h2>
        {standings.length === 0 ? (
          <p className="text-gray-400 text-center">No standings data available.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 justify-center items-start max-w-5xl mx-auto">
            {renderTable(east, 'Eastern Conference')}
            {renderTable(west, 'Western Conference')}
          </div>
        )}
      </div>
    </div>
  );
};

export default Standings;
