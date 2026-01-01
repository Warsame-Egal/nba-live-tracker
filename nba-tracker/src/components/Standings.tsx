import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { StandingRecord, StandingsResponse } from '../types/standings';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import Navbar from './Navbar';
import UniversalSidebar from './UniversalSidebar';
import { responsiveSpacing, borderRadius, transitions, typography } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Map of team names to their abbreviations and logo paths.
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

type ViewType = 'league' | 'conference' | 'division';

/**
 * Standings page with polished table design and multiple view options.
 * Displays teams in a professional table format with clear hierarchy.
 */
const Standings = () => {
  const { season } = useParams<{ season?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const seasonParam = season || getCurrentSeason();
  const [standings, setStandings] = useState<StandingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewType, setViewType] = useState<ViewType>('league');
  const [selectedConference, setSelectedConference] = useState<'East' | 'West'>('East');

  // Handle season change from sidebar
  const handleSeasonChange = (newSeason: string) => {
    if (newSeason !== seasonParam) {
      navigate(`/standings/${newSeason}`);
    }
  };

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      setError('');
      setStandings([]);
      try {
        const data = await fetchJson<StandingsResponse>(
          `${API_BASE_URL}/api/v1/standings/season/${seasonParam}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setStandings(data.standings || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch standings. Please try again.';
        setError(errorMessage);
        setStandings([]);
        console.error('Error fetching standings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [seasonParam]);

  // League view: all teams sorted by overall rank
  const leagueStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      // Sort by conference first, then by playoff rank
      if (a.conference !== b.conference) {
        return a.conference === 'East' ? -1 : 1;
      }
      return a.playoff_rank - b.playoff_rank;
    });
  }, [standings]);

  // Conference view: teams grouped by conference
  const conferenceStandings = useMemo(() => {
    return standings
      .filter(team => team.conference === selectedConference)
      .sort((a, b) => a.playoff_rank - b.playoff_rank);
  }, [standings, selectedConference]);

  // Division view: teams grouped by division within conference
  const divisionStandings = useMemo(() => {
    const grouped: { [conference: string]: { [division: string]: StandingRecord[] } } = {
      East: {},
      West: {},
    };

    standings.forEach(team => {
      if (!grouped[team.conference][team.division]) {
        grouped[team.conference][team.division] = [];
      }
      grouped[team.conference][team.division].push(team);
    });

    // Sort each division by playoff rank
    Object.keys(grouped).forEach(conf => {
      Object.keys(grouped[conf]).forEach(div => {
        grouped[conf][div].sort((a, b) => a.playoff_rank - b.playoff_rank);
      });
    });

    return grouped;
  }, [standings]);

  const formatGamesBack = (gb: string) => {
    if (!gb || gb === '0.0' || gb === '0') return '—';
    return gb;
  };

  const formatPercentage = (pct: number) => {
    return (pct * 100).toFixed(1);
  };

  const formatDiff = (diff: number | null | undefined) => {
    if (diff === null || diff === undefined) return '—';
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}`;
  };


  const renderTableRow = (team: StandingRecord, showRank: boolean = true) => {
    const fullTeamName = `${team.team_city} ${team.team_name}`;
    const logo = teamMappings[fullTeamName]?.logo || '/logos/default.svg';
    const abbreviation = teamMappings[fullTeamName]?.abbreviation || '';
    const isPlayoffTeam = team.playoff_rank <= 8;
    const isTopSeed = team.playoff_rank <= 3;
    const streakColor = team.current_streak_str.startsWith('W') ? 'success.main' : 'error.main';
    const gamesBack = formatGamesBack(team.games_back);
    const hasPPG = team.ppg !== null && team.ppg !== undefined;

    return (
      <TableRow
        key={team.team_id}
        onClick={() => navigate(`/team/${team.team_id}`)}
        sx={{
          cursor: 'pointer',
          transition: transitions.normal,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          borderLeft: isTopSeed ? '3px solid' : 'none',
          borderLeftColor: isTopSeed ? 'primary.main' : 'transparent',
        }}
      >
        {showRank && (
          <TableCell sx={{ py: 2 }}>
            <Chip
              label={team.playoff_rank}
              size="small"
              sx={{
                height: 28,
                minWidth: 28,
                fontWeight: typography.weight.bold,
                fontSize: typography.size.bodySmall,
                backgroundColor: isTopSeed
                  ? 'primary.main'
                  : isPlayoffTeam
                    ? 'rgba(25, 118, 210, 0.1)'
                    : 'transparent',
                color: isTopSeed ? 'primary.contrastText' : 'text.primary',
                border: isPlayoffTeam && !isTopSeed ? '1px solid' : 'none',
                borderColor: isPlayoffTeam && !isTopSeed ? 'primary.main' : 'transparent',
              }}
            />
          </TableCell>
        )}
        <TableCell sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={logo}
              alt={fullTeamName}
              sx={{
                width: 32,
                height: 32,
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: typography.size.bodySmall,
                }}
              >
                {abbreviation || team.team_city}
                {!showRank && (
                  <Typography component="span" sx={{ color: 'text.secondary', ml: 0.5, fontSize: typography.size.caption }}>
                    ({team.playoff_rank})
                  </Typography>
                )}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: typography.size.caption,
                }}
              >
                {team.team_city} {team.team_name}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: typography.size.bodySmall,
            }}
          >
            {team.wins}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: typography.size.bodySmall,
            }}
          >
            {team.losses}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Chip
            label={formatPercentage(team.win_pct)}
            size="small"
            sx={{
              height: 24,
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.caption,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              color: 'primary.main',
            }}
          />
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: typography.size.bodySmall,
              color: 'text.secondary',
            }}
          >
            {gamesBack}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: typography.size.bodySmall,
            }}
          >
            {team.home_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: typography.size.bodySmall,
            }}
          >
            {team.road_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: typography.size.bodySmall,
            }}
          >
            {team.division_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: typography.size.bodySmall,
            }}
          >
            {team.conference_record}
          </Typography>
        </TableCell>
        {hasPPG && (
          <>
            <TableCell align="center" sx={{ py: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: typography.size.bodySmall,
                }}
              >
                {team.ppg?.toFixed(1) || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: typography.size.bodySmall,
                }}
              >
                {team.opp_ppg?.toFixed(1) || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: typography.size.bodySmall,
                  color: team.diff && team.diff >= 0 ? 'success.main' : team.diff && team.diff < 0 ? 'error.main' : 'text.secondary',
                  fontWeight: typography.weight.semibold,
                }}
              >
                {formatDiff(team.diff)}
              </Typography>
            </TableCell>
          </>
        )}
        {!isMobile && (
          <>
            <TableCell align="center" sx={{ py: 2 }}>
              <Chip
                label={team.current_streak_str}
                size="small"
                icon={team.current_streak_str.startsWith('W') ? (
                  <TrendingUp sx={{ fontSize: 14 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 14 }} />
                )}
                sx={{
                  height: 24,
                  fontWeight: typography.weight.semibold,
                  fontSize: typography.size.caption,
                  backgroundColor: team.current_streak_str.startsWith('W')
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(239, 83, 80, 0.1)',
                  color: streakColor,
                }}
              />
            </TableCell>
            <TableCell align="center" sx={{ py: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: typography.size.bodySmall,
                }}
              >
                {team.l10_record}
              </Typography>
            </TableCell>
          </>
        )}
      </TableRow>
    );
  };

  const renderTable = (teams: StandingRecord[], showRank: boolean = true) => {
    const hasPPG = teams.length > 0 && teams[0].ppg !== null && teams[0].ppg !== undefined;

    return (
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.md,
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'background.default',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: borderRadius.xs,
            '&:hover': {
              backgroundColor: 'text.secondary',
            },
          },
        }}
      >
        <Table sx={{ minWidth: isMobile ? 600 : 800 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              {showRank && (
                <TableCell sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                  Rank
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                Team
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                W
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                L
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                PCT
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                GB
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                HOME
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                AWAY
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                DIV
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                CONF
              </TableCell>
              {hasPPG && (
                <>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                    PPG
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                    OPP PPG
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                    DIFF
                  </TableCell>
                </>
              )}
              {!isMobile && (
                <>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                    STRK
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: typography.size.bodySmall, py: 2 }}>
                    L10
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map(team => renderTableRow(team, showRank))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderLeagueView = () => {
    return renderTable(leagueStandings, true);
  };

  const renderConferenceView = () => {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Eastern Conference"
              onClick={() => setSelectedConference('East')}
              sx={{
                px: 2,
                py: 1,
                fontWeight: typography.weight.semibold,
                backgroundColor: selectedConference === 'East' ? 'primary.main' : 'transparent',
                color: selectedConference === 'East' ? 'primary.contrastText' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedConference === 'East' ? 'primary.main' : 'divider',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: selectedConference === 'East' ? 'primary.dark' : 'action.hover',
                },
              }}
            />
            <Chip
              label="Western Conference"
              onClick={() => setSelectedConference('West')}
              sx={{
                px: 2,
                py: 1,
                fontWeight: typography.weight.semibold,
                backgroundColor: selectedConference === 'West' ? 'primary.main' : 'transparent',
                color: selectedConference === 'West' ? 'primary.contrastText' : 'text.secondary',
                border: '1px solid',
                borderColor: selectedConference === 'West' ? 'primary.main' : 'divider',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: selectedConference === 'West' ? 'primary.dark' : 'action.hover',
                },
              }}
            />
          </Box>
        </Box>
        {renderTable(conferenceStandings, true)}
      </Box>
    );
  };

  const renderDivisionView = () => {
    const conferences = ['East', 'West'] as const;
    const eastDivisions = ['Atlantic', 'Central', 'Southeast'];
    const westDivisions = ['Northwest', 'Pacific', 'Southwest'];

    return (
      <Box>
        {conferences.map(conf => {
          const confDivisions = conf === 'East' ? eastDivisions : westDivisions;
          return (
            <Box key={conf} sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: typography.weight.bold,
                  mb: 2,
                  fontSize: typography.size.h6,
                  color: 'text.primary',
                }}
              >
                {conf === 'East' ? 'Eastern Conference' : 'Western Conference'}
              </Typography>
              {confDivisions.map(div => {
                const teams = divisionStandings[conf][div] || [];
                if (teams.length === 0) return null;

                return (
                  <Box key={div} sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: typography.weight.semibold,
                        mb: 1.5,
                        fontSize: typography.size.bodyLarge,
                        color: 'text.secondary',
                      }}
                    >
                      {div}
                    </Typography>
                    {renderTable(teams, false)}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'background.default',
          }}
        >
          <Container maxWidth="xl" sx={{ py: responsiveSpacing.containerVertical, px: responsiveSpacing.container }}>
            {/* Page header */}
            <Box sx={{ mb: responsiveSpacing.section }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: typography.weight.bold,
                  mb: 0.5,
                  fontSize: typography.size.h4,
                  color: 'text.primary',
                }}
              >
                Standings
              </Typography>
            </Box>

            {/* View tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={viewType}
                onChange={(_, newValue) => setViewType(newValue)}
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.body,
                    minHeight: 48,
                  },
                }}
              >
                <Tab label="League" value="league" />
                <Tab label="Conference" value="conference" />
                <Tab label="Division" value="division" />
              </Tabs>
            </Box>

            {/* Loading state */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 6, sm: 8 } }}>
                <CircularProgress />
              </Box>
            )}

            {/* Error state */}
            {error && (
              <Alert severity="error" sx={{ mb: { xs: 3, sm: 4 } }}>
                {error}
              </Alert>
            )}

            {/* Content based on view type */}
            {!loading && !error && standings.length > 0 && (
              <>
                {viewType === 'league' && renderLeagueView()}
                {viewType === 'conference' && renderConferenceView()}
                {viewType === 'division' && renderDivisionView()}
              </>
            )}

            {/* Empty state */}
            {!loading && !error && standings.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: { xs: 8, sm: 12 },
                  px: 3,
                  minHeight: '40vh',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: typography.weight.bold,
                    mb: 1,
                    textAlign: 'center',
                    color: 'text.primary',
                  }}
                >
                  No Standings Data Available
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    textAlign: 'center',
                    maxWidth: 500,
                    lineHeight: 1.6,
                  }}
                >
                  Unable to load standings data for the selected season. Please try again later or select a different season.
                </Typography>
              </Box>
            )}
          </Container>
        </Box>

        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderLeft: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            overflowY: 'auto',
          }}
        >
          <UniversalSidebar season={seasonParam} onSeasonChange={handleSeasonChange} />
        </Box>
      </Box>
    </Box>
  );
};

export default Standings;
