import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { StandingRecord, StandingsResponse } from '../types/standings';
import Navbar from '../components/Navbar';

// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Map of team names to their abbreviations and logo paths.
 * Used to display team logos in the standings table.
 */
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

/**
 * Page that displays NBA standings (win/loss records for all teams).
 * Shows teams ranked by their playoff position.
 */
const Standings = () => {
  // Get season from URL if provided
  const { season } = useParams<{ season?: string }>();
  const navigate = useNavigate();
  // Default to current season if not provided
  // NBA season starts in October, so if we're in Oct-Dec, we're in the current year's season
  // If we're in Jan-Sep, we're in the previous year's season
  const getCurrentSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
    
    // If we're in October (10) or later, we're in the current year's season
    // Otherwise, we're in the previous year's season
    if (currentMonth >= 10) {
      // October-December: 2025-26 season
      return `${currentYear}-${(currentYear + 1).toString().slice(2)}`;
    } else {
      // January-September: 2024-25 season (if current year is 2025)
      return `${currentYear - 1}-${currentYear.toString().slice(2)}`;
    }
  };
  const seasonParam = season || getCurrentSeason();
  // List of all team standings
  const [standings, setStandings] = useState<StandingRecord[]>([]);
  // Whether we're loading the standings
  const [loading, setLoading] = useState(true);
  // Error message if something goes wrong
  const [error, setError] = useState('');
  // Which conference to show (East or West)
  const [conference, setConference] = useState<'East' | 'West'>('East');

  /**
   * Fetch standings when component loads or season changes.
   */
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

  /**
   * Filter standings by selected conference and sort by playoff rank.
   * This is memoized so it only recalculates when standings or conference changes.
   */
  const filteredStandings = useMemo(() => {
    return standings
      .filter(team => team.conference === conference)
      .sort((a, b) => a.playoff_rank - b.playoff_rank);
  }, [standings, conference]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4, md: 5 } }}>
        {/* Page title */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            textAlign: 'center',
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' },
          }}
        >
          NBA Standings
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 4 }}
        >
          {seasonParam} Season
        </Typography>

        {/* Conference selector buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <ToggleButtonGroup
            value={conference}
            exclusive
            onChange={(_, newValue) => newValue && setConference(newValue)}
            sx={{
              '& .MuiToggleButton-root': {
                px: 4,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderColor: 'divider',
                color: 'text.secondary',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              },
            }}
          >
            <ToggleButton value="East">Eastern Conference</ToggleButton>
            <ToggleButton value="West">Western Conference</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Loading spinner */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}
        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {/* Empty state */}
        {!loading && !error && filteredStandings.length === 0 && (
          <Typography variant="body1" color="text.secondary" textAlign="center">
            No standings data available.
          </Typography>
        )}

        {/* Standings table */}
        {!loading && !error && filteredStandings.length > 0 && (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 700, minWidth: 50 }}>
                    #
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Team</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>W</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>L</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>PCT</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>GB</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Home</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Away</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Div</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Conf</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>L10</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Strk</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStandings.map(team => {
                  const teamName = `${team.team_city} ${team.team_name}`;
                  const logo = teamMappings[teamName]?.logo || '/logos/default.svg';
                  return (
                    <TableRow
                      key={team.team_id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                        },
                      }}
                      onClick={() => navigate(`/team/${team.team_id}`)}
                    >
                      {/* Playoff rank */}
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                        {team.playoff_rank}
                      </TableCell>
                      {/* Team name and logo */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={logo}
                            alt={teamName}
                            sx={{ width: 32, height: 32, backgroundColor: 'transparent' }}
                          />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {teamName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      {/* Wins */}
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {team.wins}
                      </TableCell>
                      {/* Losses */}
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {team.losses}
                      </TableCell>
                      {/* Win percentage */}
                      <TableCell align="center">{team.win_pct.toFixed(3)}</TableCell>
                      {/* Games behind */}
                      <TableCell align="center">{team.games_back}</TableCell>
                      {/* Home record */}
                      <TableCell align="center">{team.home_record}</TableCell>
                      {/* Road record */}
                      <TableCell align="center">{team.road_record}</TableCell>
                      {/* Division record */}
                      <TableCell align="center">{team.division_record}</TableCell>
                      {/* Conference record */}
                      <TableCell align="center">{team.conference_record}</TableCell>
                      {/* Last 10 games record */}
                      <TableCell align="center">{team.l10_record}</TableCell>
                      {/* Current streak (green for wins, red for losses) */}
                      <TableCell
                        align="center"
                        sx={{
                          color: team.current_streak_str.startsWith('W')
                            ? 'success.main'
                            : 'error.main',
                          fontWeight: 700,
                        }}
                      >
                        {team.current_streak_str}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

export default Standings;
