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
import { responsiveSpacing, borderRadius, transitions, typography } from '../theme/designTokens';
import { Skeleton } from '@mui/material';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { getTeamInfo } from '../utils/teamMappings';

import { API_BASE_URL } from '../utils/apiConfig';


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
        <TableCell sx={{ py: 2, backgroundColor: 'background.paper' }}>
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
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
            }}
          >
            {team.wins}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
            }}
          >
            {team.losses}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
          <Chip
            label={formatPercentage(team.win_pct)}
            size="small"
            sx={{
              height: 24,
              fontWeight: typography.weight.semibold,
              fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              color: 'primary.main',
            }}
          />
        </TableCell>
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
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
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
            }}
          >
            {team.home_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
            }}
          >
            {team.road_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
            }}
          >
            {team.division_record}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
            }}
          >
            {team.conference_record}
          </Typography>
        </TableCell>
        {hasPPG && (
          <>
            <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                }}
              >
                {team.ppg?.toFixed(1) || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                }}
              >
                {team.opp_ppg?.toFixed(1) || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
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
            <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
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
            <TableCell align="center" sx={{ py: 2, backgroundColor: 'background.paper' }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
                <TableCell sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2 }}>
                  Rank
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                Team
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                W
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                L
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                PCT
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                GB
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                HOME
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                AWAY
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                DIV
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                CONF
              </TableCell>
              {hasPPG && (
                <>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                    PPG
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                    OPP PPG
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                    DIFF
                  </TableCell>
                </>
              )}
              {!isMobile && (
                <>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
                    STRK
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold, fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm }, py: 2, backgroundColor: 'background.paper' }}>
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
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1 },
                minHeight: { xs: 44, sm: 32 },
                fontWeight: typography.weight.semibold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
    const eastDivisions = ['Atlantic', 'Central', 'Southeast'];
    const westDivisions = ['Northwest', 'Pacific', 'Southwest'];
    const confDivisions = selectedConference === 'East' ? eastDivisions : westDivisions;

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Eastern Conference"
              onClick={() => setSelectedConference('East')}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.25, sm: 1 },
                minHeight: { xs: 44, sm: 32 },
                fontWeight: typography.weight.semibold,
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
                variant="subtitle1"
                sx={{
                  fontWeight: typography.weight.semibold,
                  mb: 1.5,
                  fontSize: { xs: typography.size.bodyLarge.xs, sm: typography.size.bodyLarge.sm },
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
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
        {/* Page header */}
        <Box sx={{ mb: responsiveSpacing.section, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, minHeight: { xs: 80, sm: 90 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.h5.xs, sm: typography.size.h5.sm, md: typography.size.h4.md },
                color: 'text.primary',
                letterSpacing: typography.letterSpacing.tight,
              }}
            >
              Standings
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
            <InputLabel sx={{ fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm } }}>Season</InputLabel>
            <Select
              value={seasonParam}
              label="Season"
              onChange={(e) => handleSeasonChange(e.target.value)}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
              }}
            >
              {seasonOptions.map(seasonOption => (
                <MenuItem key={seasonOption} value={seasonOption}>
                  {seasonOption} Regular Season
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* View tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, minHeight: { xs: 48, sm: 56 } }}>
          <Tabs
            value={viewType}
            onChange={(_, newValue) => setViewType(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: typography.weight.semibold,
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
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

        {/* Loading state */}
        {loading && (
          <Box sx={{ minHeight: { xs: 400, sm: 500 } }}>
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: borderRadius.md, mb: 2 }} />
            {[...Array(10)].map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={56} sx={{ borderRadius: borderRadius.sm, mb: 0.5 }} />
            ))}
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
                fontSize: { xs: typography.size.h6.xs, sm: typography.size.h6.sm, md: typography.size.h5.md },
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
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
              }}
            >
              Unable to load standings data for the selected season. Please try again later or select a different season.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Standings;
