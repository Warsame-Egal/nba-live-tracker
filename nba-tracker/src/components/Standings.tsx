import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
  Chip,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { StandingRecord } from '../types/standings';
import PageHeader from './PageHeader';
import PageContainer from './PageContainer';
import StandingsStyleTeamList from './StandingsStyleTeamList';
import { borderRadius, transitions, typography, responsiveSpacing } from '../theme/designTokens';
import { Skeleton } from '@mui/material';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';

import { API_BASE_URL } from '../utils/apiConfig';

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) =>
  `clamp(${min}, ${preferred}, ${max})`;

type ViewType = 'league' | 'conference' | 'division';

/**
 * Standings page showing NBA team records and rankings.
 * Supports league, conference, and division views with conference filtering.
 */
const Standings = () => {
  const { season } = useParams<{ season?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

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
        const data = await fetchJson<{ data: StandingRecord[] }>(
          `${API_BASE_URL}/api/v1/standings/season/${seasonParam}?page=1&limit=100`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 },
        );
        if (data?.data) {
          setStandings(data.data);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch standings. Please try again.';
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

  const eastStandings = useMemo(
    () =>
      standings
        .filter(t => t.conference === 'East')
        .sort((a, b) => a.playoff_rank - b.playoff_rank),
    [standings],
  );
  const westStandings = useMemo(
    () =>
      standings
        .filter(t => t.conference === 'West')
        .sort((a, b) => a.playoff_rank - b.playoff_rank),
    [standings],
  );

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


  const renderLeagueView = () => {
    return (
      <Box sx={{ minHeight: { xs: 600, sm: 800 } }}>
        <StandingsStyleTeamList teams={leagueStandings} showRank showPlayoffLines />
      </Box>
    );
  };

  const renderConferenceView = () => {
    if (isMdUp) {
      return (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: typography.editorial.sectionTitle.xs,
                color: 'text.secondary',
                mb: 1.5,
              }}
            >
              Eastern Conference
            </Typography>
            <Box sx={{ minHeight: 400 }}>
              <StandingsStyleTeamList teams={eastStandings} showRank showPlayoffLines />
            </Box>
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: typography.editorial.sectionTitle.xs,
                color: 'text.secondary',
                mb: 1.5,
              }}
            >
              Western Conference
            </Typography>
            <Box sx={{ minHeight: 400 }}>
              <StandingsStyleTeamList teams={westStandings} showRank showPlayoffLines />
            </Box>
          </Box>
        </Box>
      );
    }
    return (
      <Box>
        <Box
          sx={{ display: 'flex', justifyContent: 'center', mb: 3, minHeight: { xs: 48, sm: 56 } }}
        >
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

        <Box sx={{ minHeight: { xs: 600, sm: 800 } }}>
          <StandingsStyleTeamList teams={conferenceStandings} showRank showPlayoffLines />
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
        <Box
          sx={{ display: 'flex', justifyContent: 'center', mb: 3, minHeight: { xs: 48, sm: 56 } }}
        >
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
            <Box key={div} sx={{ mb: { xs: 2, sm: 3 }, minHeight: { xs: 200, sm: 250 } }}>
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
              <StandingsStyleTeamList teams={teams} showRank={false} showPlayoffLines={false} />
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100vw',
        overflowX: 'hidden',
        overflowY: 'visible',
        width: '100%',
      }}
    >
      <PageContainer
        maxWidth={1400}
        sx={{ px: responsiveSpacing.container, py: responsiveSpacing.containerVertical }}
      >
        {/* Page header - always rendered */}
        <PageHeader
          title="Standings"
          action={
            <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
              <InputLabel sx={{ fontSize: typography.editorial.helper.xs }}>Season</InputLabel>
              <Select
                value={seasonParam}
                label="Season"
                onChange={e => handleSeasonChange(e.target.value)}
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
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: responsiveSpacing.section,
            minHeight: { xs: 48, sm: 56 },
          }}
        >
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
                <Skeleton
                  variant="rectangular"
                  height={60}
                  sx={{ borderRadius: borderRadius.md, mb: 2 }}
                />
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
      </PageContainer>
    </Box>
  );
};

export default Standings;
