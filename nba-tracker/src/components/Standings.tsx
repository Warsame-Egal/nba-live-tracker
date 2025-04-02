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

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h2 className="text-white text-3xl font-bold mb-6 text-center uppercase tracking-wide">
          NBA Standings ({seasonParam})
        </h2>
        {standings.length === 0 ? (
          <p className="text-gray-400 text-center">No standings data available.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-lg">
            <table className="w-full text-white bg-black border border-neutral-700 rounded-lg overflow-hidden">
              <thead className="bg-neutral-900 border-b border-neutral-700 text-white uppercase text-sm">
                <tr>
                  <th className="py-4 px-6 text-left border-r border-neutral-700">Rank</th>
                  <th className="py-4 px-6 text-left border-r border-neutral-700">Team</th>
                  <th className="py-4 px-6 text-center border-r border-neutral-700">
                    Conference Record
                  </th>
                  <th className="py-4 px-6 text-center border-r border-neutral-700">
                    Division Record
                  </th>
                  <th className="py-4 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => {
                  const teamFullName = `${team.team_city} ${team.team_name}`;
                  const teamInfo = teamMappings[teamFullName] || {
                    abbreviation: 'N/A',
                    logo: '/logos/default.svg',
                  };

                  return (
                    <tr
                      key={`${team.team_name}-${team.season_id}`}
                      className={`transition ${
                        index % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-950'
                      } hover:bg-neutral-800 border-b border-neutral-700`}
                    >
                      <td className="py-4 px-6 text-sm font-semibold border-r border-neutral-700">
                        {team.conference[0]}-{team.playoff_rank}
                      </td>
                      <td
                        onClick={() => navigate(`/team/${team.team_id}`)}
                        className="py-4 px-6 flex items-center gap-3 border-r border-neutral-700 cursor-pointer hover:underline"
                      >
                        <img src={teamInfo.logo} alt={teamInfo.abbreviation} className="w-8 h-8" />
                        <span>{teamFullName}</span>
                        <span className="text-neutral-400">({teamInfo.abbreviation})</span>
                      </td>
                      <td className="py-4 px-6 text-center border-r border-neutral-700">
                        {team.conference_record}
                      </td>
                      <td className="py-4 px-6 text-center border-r border-neutral-700">
                        {team.division_record}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {team.clinch_indicator === 'c' && (
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Clinched
                          </span>
                        )}
                        {team.clinch_indicator === 'x' && (
                          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Eliminated
                          </span>
                        )}
                        {team.clinch_indicator === '-' && (
                          <span className="text-neutral-500">—</span>
                        )}
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
