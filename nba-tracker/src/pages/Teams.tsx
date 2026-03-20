import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Grid, FormControl, InputLabel, Select, MenuItem, Skeleton } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { fetchJson } from '../utils/apiClient';
import { StandingRecord } from '../types/standings';
import { typography, borderRadius, responsiveSpacing } from '../theme/designTokens';
import { API_BASE_URL } from '../utils/apiConfig';
import PageContainer from '../components/PageContainer';
import StandingsStyleTeamList from '../components/StandingsStyleTeamList';

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) =>
  `clamp(${min}, ${preferred}, ${max})`;

/**
 * Teams page showing all NBA teams grouped by division.
 * Supports season filtering and navigation to individual team pages.
 */
const Teams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [standings, setStandings] = useState<StandingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const season = searchParams.get('season') || getCurrentSeason();
  const seasonOptions = getSeasonOptions(5);

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams({ season: newSeason });
  };

  // Fetch standings to get all teams with divisions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch standings for team list with divisions
        const standingsData = await fetchJson<{ data: StandingRecord[] }>(
          `${API_BASE_URL}/api/v1/standings/season/${season}?page=1&limit=100`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 },
        );
        if (standingsData?.data) {
          setStandings(standingsData.data);
        }
        // Don't clear standings on error - keep existing data visible
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data');
        // Don't clear standings on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [season]);

  // Group teams by division
  const teamsByDivision = useMemo(() => {
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

    // Sort teams within each division by playoff rank
    Object.keys(grouped).forEach(conf => {
      Object.keys(grouped[conf]).forEach(div => {
        grouped[conf][div].sort((a, b) => a.playoff_rank - b.playoff_rank);
      });
    });

    return grouped;
  }, [standings]);

  const divisions = {
    East: ['Atlantic', 'Central', 'Southeast'],
    West: ['Northwest', 'Pacific', 'Southwest'],
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
      <PageContainer maxWidth={1400} sx={{ px: responsiveSpacing.container, py: responsiveSpacing.containerVertical }}>
        {/* Page header - always rendered */}
        <Box
          sx={{
            mb: { xs: 2, sm: 3 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            minHeight: { xs: 80, sm: 90 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: clamp('1.25rem', '4vw', '1.5rem'),
                color: 'text.primary',
                letterSpacing: typography.letterSpacing.tight,
              }}
            >
              All Teams
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
            <InputLabel sx={{ fontSize: clamp('0.875rem', '2vw', '1rem') }}>Season</InputLabel>
            <Select
              value={season}
              label="Season"
              onChange={e => handleSeasonChange(e.target.value)}
              sx={{
                borderRadius: borderRadius.sm,
                fontSize: clamp('0.875rem', '2vw', '1rem'),
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

        {/* Content container - always rendered with minHeight */}
        <Box sx={{ minHeight: { xs: 600, sm: 800 } }}>
          {loading && standings.length === 0 ? (
            // Loading skeleton - only show if no data exists
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[...Array(2)].map((_, index) => (
                <Box key={index}>
                  <Skeleton variant="text" width={250} height={32} sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {[...Array(3)].map((_, divIndex) => (
                      <Grid item xs={12} sm={6} lg={4} key={divIndex}>
                        <Skeleton
                          variant="rectangular"
                          height={400}
                          sx={{ borderRadius: borderRadius.md }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
            </Box>
          ) : error && standings.length === 0 ? (
            // Error state - only show if no data exists
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Typography
                variant="body1"
                color="error"
                sx={{ fontSize: clamp('0.875rem', '2vw', '1rem') }}
              >
                {error}
              </Typography>
            </Box>
          ) : standings.length === 0 ? (
            // Empty state
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: clamp('0.875rem', '2vw', '1rem') }}
              >
                No team data available.
              </Typography>
            </Box>
          ) : (
            // Content - always show if data exists (even during loading/error)
            <>
              {(['East', 'West'] as const).map(conference => (
                <Box key={conference} sx={{ mb: { xs: 3, sm: 4 } }}>
                  <Box
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      mb: responsiveSpacing.element,
                      pb: 1.5,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: typography.weight.semibold,
                        fontSize: typography.editorial.sectionTitle.xs,
                        color: 'text.secondary',
                      }}
                    >
                      {conference === 'East' ? 'Eastern Conference' : 'Western Conference'}
                    </Typography>
                  </Box>

                  <Grid container spacing={2} alignItems="flex-start">
                    {divisions[conference].map(division => {
                      const teams = teamsByDivision[conference][division] || [];
                      if (teams.length === 0) return null;

                      return (
                        <Grid item xs={12} sm={6} md={6} lg={4} key={division}>
                          <Box sx={{ mb: { xs: 2, sm: 3 }, minHeight: { xs: 200, sm: 250 } }}>
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
                              {division}
                            </Typography>
                            <StandingsStyleTeamList
                              teams={teams}
                              showRank={false}
                              showPlayoffLines={false}
                            />
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ))}
            </>
          )}
        </Box>
      </PageContainer>
    </Box>
  );
};

export default Teams;
