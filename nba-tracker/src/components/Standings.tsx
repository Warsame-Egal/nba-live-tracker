import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { StandingRecord, StandingsResponse } from '../types/standings';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import Navbar from './Navbar';
import PageHeader from './PageHeader';
import { borderRadius, transitions, typography, responsiveSpacing } from '../theme/designTokens';
import { Skeleton } from '@mui/material';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { getTeamInfo } from '../utils/teamMappings';

import { API_BASE_URL } from '../utils/apiConfig';

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) => `clamp(${min}, ${preferred}, ${max})`;


type ViewType = 'league' | 'conference' | 'division';

/**
 * Standings page showing NBA team records and rankings.
 * Supports league, conference, and division views with conference filtering.
 */
const Standings = () => {
  const { season } = useParams<{ season?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const seasonParam = season || getCurrentSeason();
  const seasonOptions = getSeasonOptions(5);
  const [standings, setStandings] = useState<StandingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewType, setViewType] = useState<ViewType>('league');
  const [selectedConference, setSelectedConference] = useState<'East' | 'West'>('East');

  // Handle season change
  const handleSeasonChange = (newSeason: string) => {
    if (newSeason !== seasonParam) {
      navigate(`/standings/${newSeason}`);
    }
  };

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      setError('');
      // Don't clear standings - keep existing data visible during refetch
      try {
        const data = await fetchJson<StandingsResponse>(
          `${API_BASE_URL}/api/v1/standings/season/${seasonParam}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        if (data && data.standings) {
          setStandings(data.standings);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch standings. Please try again.';
        setError(errorMessage);
        // Don't clear standings on error - keep existing data visible
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


  const renderStandingCard = (team: StandingRecord, showRank: boolean = true) => {
    const fullTeamName = `${team.team_city} ${team.team_name}`;
    const teamInfo = getTeamInfo(fullTeamName);
    const logo = teamInfo.logo;
    const abbreviation = teamInfo.abbreviation;
    const isPlayoffTeam = team.playoff_rank <= 8;
    const isTopSeed = team.playoff_rank <= 3;
    const gamesBack = formatGamesBack(team.games_back);

    return (
      <Paper
        key={team.team_id}
        elevation={0}
        onClick={() => navigate(`/team/${team.team_id}`)}
        sx={{
          p: responsiveSpacing.card,
          mb: responsiveSpacing.element,
          cursor: 'pointer',
          transition: transitions.normal,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.md,
          borderLeft: isTopSeed ? '3px solid' : 'none',
          borderLeftColor: isTopSeed ? 'primary.main' : 'transparent',
          minHeight: 140,
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            {showRank && (
              <Chip
                label={team.playoff_rank}
                size="small"
                sx={{
                  height: 28,
                  minWidth: 28,
                  fontWeight: typography.weight.bold,
                  fontSize: typography.editorial.helper.xs,
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
            )}
            <Avatar
              src={logo}
              alt={fullTeamName}
              sx={{
                width: 44,
                height: 44,
                aspectRatio: '1/1',
                backgroundColor: 'transparent',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: typography.editorial.metric.xs,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'text.primary',
                }}
              >
                {abbreviation || team.team_city}
                {!showRank && (
                  <Typography component="span" sx={{ color: 'text.secondary', ml: 0.5, fontSize: typography.editorial.helper.xs }}>
                    ({team.playoff_rank})
                  </Typography>
                )}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: typography.editorial.helper.xs,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {team.team_city} {team.team_name}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: typography.editorial.metric.xs,
                color: 'text.primary',
              }}
            >
              {team.wins}-{team.losses}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: typography.weight.medium,
                fontSize: typography.editorial.helper.xs,
                color: 'text.secondary',
              }}
            >
              {formatPercentage(team.win_pct)}%
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mt: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs, textTransform: 'lowercase' }}>
              GB
            </Typography>
            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, fontWeight: typography.weight.medium, mt: 0.25 }}>
              {gamesBack}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs, textTransform: 'lowercase' }}>
              Home
            </Typography>
            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, fontWeight: typography.weight.medium, mt: 0.25 }}>
              {team.home_record}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs, textTransform: 'lowercase' }}>
              Away
            </Typography>
            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, fontWeight: typography.weight.medium, mt: 0.25 }}>
              {team.road_record}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderTableRow = (team: StandingRecord, showRank: boolean = true) => {
    const fullTeamName = `${team.team_city} ${team.team_name}`;
    const teamInfo = getTeamInfo(fullTeamName);
    const logo = teamInfo.logo;
    const abbreviation = teamInfo.abbreviation;
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
          backgroundColor: 'background.paper',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          borderLeft: isTopSeed ? '3px solid' : 'none',
          borderLeftColor: isTopSeed ? 'primary.main' : 'transparent',
        }}
      >
        {showRank && (
          <TableCell sx={{ py: 2, backgroundColor: 'background.paper' }}>
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
        <TableCell sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={logo}
              alt={fullTeamName}
              sx={{
                width: 36,
                height: 36,
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
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color: 'text.primary',
                }}
              >
                {abbreviation || team.team_city}
                {!showRank && (
                  <Typography component="span" sx={{ color: 'text.secondary', ml: 0.5, fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm } }}>
                    ({team.playoff_rank})
                  </Typography>
                )}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                }}
              >
                {team.team_city} {team.team_name}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: typography.editorial.metric.xs,
              color: 'text.primary',
            }}
          >
            {team.wins}-{team.losses}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {formatPercentage(team.win_pct)}%
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {gamesBack}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.home_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.road_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.division_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
              color: 'text.secondary',
            }}
          >
            {team.conference_record}
          </Typography>
        </TableCell>
            {hasPPG && (
              <>
                <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                      color: 'text.secondary',
                    }}
                  >
                    {team.ppg?.toFixed(1) || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                      color: 'text.secondary',
                    }}
                  >
                    {team.opp_ppg?.toFixed(1) || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
            <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
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
                  fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                  backgroundColor: team.current_streak_str.startsWith('W')
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(239, 83, 80, 0.1)',
                  color: streakColor,
                }}
              />
            </TableCell>
            <TableCell align="center" sx={{ py: 2.5, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color: 'text.secondary',
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
          backgroundColor: 'background.paper',
          overflowX: 'auto',
          minHeight: { xs: 400, sm: 500 },
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
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              {showRank && (
                <TableCell sx={{ fontWeight: typography.weight.semibold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, color: 'text.secondary' }}>
                  Rank
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: typography.weight.semibold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper', color: 'text.secondary' }}>
                Team
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                Record
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                Win %
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                GB
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                Home
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                Away
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                Div
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                Conf
              </TableCell>
              {hasPPG && (
                <>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                    PPG
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                    Opp PPG
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                    Diff
                  </TableCell>
                </>
              )}
              {!isMobile && (
                <>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
                    Streak
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2.5, backgroundColor: 'background.paper' }}>
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
    return (
      <>
        {/* Mobile Card View */}
        <Box sx={{ display: { xs: 'block', sm: 'none' }, minHeight: { xs: 600, sm: 800 } }}>
          {leagueStandings.map(team => renderStandingCard(team, true))}
        </Box>
        {/* Desktop Table View */}
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          {renderTable(leagueStandings, true)}
        </Box>
      </>
    );
  };

  const renderConferenceView = () => {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, minHeight: { xs: 48, sm: 56 } }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Eastern Conference"
              onClick={() => setSelectedConference('East')}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1 },
                minHeight: { xs: 44, sm: 32 },
                fontWeight: typography.weight.semibold,
                fontSize: clamp('0.75rem', '1.5vw', '0.875rem'),
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
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1 },
                minHeight: { xs: 44, sm: 32 },
                fontWeight: typography.weight.semibold,
                fontSize: clamp('0.75rem', '1.5vw', '0.875rem'),
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
        
        {/* Title spacer to match Division view structure */}
        <Box sx={{ mb: responsiveSpacing.element, minHeight: { xs: '1.5rem', sm: '1.75rem' } }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: typography.editorial.sectionTitle.xs,
              color: 'text.secondary',
              opacity: 0.6,
              minHeight: { xs: '1.5rem', sm: '1.75rem' },
              letterSpacing: typography.letterSpacing.normal,
            }}
          >
            {selectedConference} Conference
          </Typography>
        </Box>
        
        {/* Mobile Card View */}
        <Box sx={{ display: { xs: 'block', sm: 'none' }, minHeight: { xs: 600, sm: 800 } }}>
          {conferenceStandings.map(team => renderStandingCard(team, true))}
        </Box>
        {/* Desktop Table View */}
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          {renderTable(conferenceStandings, true)}
        </Box>
      </Box>
    );
  };

  const renderDivisionView = () => {
    const eastDivisions = ['Atlantic', 'Central', 'Southeast'];
    const westDivisions = ['Northwest', 'Pacific', 'Southwest'];
    const confDivisions = selectedConference === 'East' ? eastDivisions : westDivisions;

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, minHeight: { xs: 48, sm: 56 } }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Eastern Conference"
              onClick={() => setSelectedConference('East')}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1 },
                minHeight: { xs: 44, sm: 32 },
                fontWeight: typography.weight.semibold,
                fontSize: clamp('0.75rem', '1.5vw', '0.875rem'),
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
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1 },
                minHeight: { xs: 44, sm: 32 },
                fontWeight: typography.weight.semibold,
                fontSize: clamp('0.75rem', '1.5vw', '0.875rem'),
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
        {confDivisions.map(div => {
          const teams = divisionStandings[selectedConference][div] || [];
          if (teams.length === 0) return null;

          return (
            <Box key={div} sx={{ mb: 3, minHeight: { xs: 200, sm: 250 } }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: typography.weight.semibold,
                  mb: responsiveSpacing.element,
                  fontSize: typography.editorial.sectionTitle.xs,
                  color: 'text.primary',
                  minHeight: { xs: '1.5rem', sm: '1.75rem' },
                  letterSpacing: typography.letterSpacing.normal,
                }}
              >
                {div}
              </Typography>
              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                {teams.map(team => renderStandingCard(team, false))}
              </Box>
              {/* Desktop Table View */}
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                {renderTable(teams, false)}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: 'background.default', 
      display: 'flex', 
      flexDirection: 'column',
      maxWidth: '100vw',
      overflowX: 'hidden',
      width: '100%',
    }}>
      <Navbar />
      <Box sx={{ 
        maxWidth: '1400px', 
        mx: 'auto', 
        px: responsiveSpacing.container,
        py: responsiveSpacing.containerVertical,
        width: '100%',
      }}>
        {/* Page header - always rendered */}
        <PageHeader
          title="Standings"
          action={
            <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
              <InputLabel sx={{ fontSize: typography.editorial.helper.xs }}>Season</InputLabel>
              <Select
                value={seasonParam}
                label="Season"
                onChange={(e) => handleSeasonChange(e.target.value)}
                sx={{ 
                  borderRadius: borderRadius.sm,
                  fontSize: typography.editorial.helper.xs,
                }}
              >
                {seasonOptions.map(seasonOption => (
                  <MenuItem key={seasonOption} value={seasonOption}>
                    {seasonOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          }
        />

        {/* View tabs - always rendered */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: responsiveSpacing.section, minHeight: { xs: 48, sm: 56 } }}>
          <Tabs
            value={viewType}
            onChange={(_, newValue) => setViewType(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: typography.weight.semibold,
                fontSize: typography.editorial.sectionTitle.xs,
                minHeight: { xs: 48, sm: 56 },
                transition: transitions.normal,
              },
            }}
          >
            <Tab label="League" value="league" />
            <Tab label="Conference" value="conference" />
            <Tab label="Division" value="division" />
          </Tabs>
        </Box>

        {/* Content container - always rendered with minHeight */}
        <Box sx={{ minHeight: { xs: 600, sm: 800 } }}>
          {loading && standings.length === 0 ? (
            // Loading skeleton - only show if no data exists
            <>
              {/* Mobile skeleton */}
              <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                {[...Array(10)].map((_, index) => (
                  <Skeleton 
                    key={index} 
                    variant="rectangular" 
                    height={120} 
                    sx={{ borderRadius: borderRadius.md, mb: 1.5 }} 
                  />
                ))}
              </Box>
              {/* Desktop skeleton */}
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Skeleton variant="rectangular" height={60} sx={{ borderRadius: borderRadius.md, mb: 2 }} />
                {[...Array(10)].map((_, index) => (
                  <Skeleton 
                    key={index} 
                    variant="rectangular" 
                    height={56} 
                    sx={{ borderRadius: borderRadius.sm, mb: 0.5 }} 
                  />
                ))}
              </Box>
            </>
          ) : error && standings.length === 0 ? (
            // Error state - only show if no data exists
            <Alert severity="error" sx={{ mb: { xs: 3, sm: 4 } }}>
              {error}
            </Alert>
          ) : standings.length === 0 ? (
            // Empty state
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
                  fontSize: typography.editorial.sectionTitle.xs,
                }}
              >
                No standings available
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  maxWidth: 500,
                  lineHeight: typography.lineHeight.relaxed,
                  fontSize: typography.editorial.helper.xs,
                }}
              >
                Unable to load standings for this season. Try selecting a different season.
              </Typography>
            </Box>
          ) : (
            // Content - always show if data exists (even during loading/error)
            <>
              {viewType === 'league' && renderLeagueView()}
              {viewType === 'conference' && renderConferenceView()}
              {viewType === 'division' && renderDivisionView()}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Standings;
