import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Grid, Button, Avatar, Paper, FormControl, InputLabel, Select, MenuItem, Skeleton } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { fetchJson } from '../utils/apiClient';
import { StandingsResponse, StandingRecord } from '../types/standings';
import { typography, transitions, borderRadius } from '../theme/designTokens';
import { getTeamInfo } from '../utils/teamMappings';

import { API_BASE_URL } from '../utils/apiConfig';

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) => `clamp(${min}, ${preferred}, ${max})`;

/**
 * Teams page showing all NBA teams grouped by division.
 * Supports season filtering and navigation to individual team pages.
 */
const Teams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
        const standingsData = await fetchJson<StandingsResponse>(
          `${API_BASE_URL}/api/v1/standings/season/${season}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        if (standingsData && standingsData.standings) {
          setStandings(standingsData.standings);
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

  const getTeamLogo = (team: StandingRecord) => {
    const fullName = `${team.team_city} ${team.team_name}`;
    return getTeamInfo(fullName).logo;
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
        px: { xs: 1, sm: 2, md: 3, lg: 4 }, 
        py: { xs: 2, sm: 3 },
        width: '100%',
      }}>
        {/* Page header - always rendered */}
        <Box sx={{ 
          mb: { xs: 2, sm: 3 }, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 2, 
          minHeight: { xs: 80, sm: 90 } 
        }}>
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
              onChange={(e) => handleSeasonChange(e.target.value)}
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
                        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: borderRadius.md }} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
            </Box>
          ) : error && standings.length === 0 ? (
            // Error state - only show if no data exists
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Typography variant="body1" color="error" sx={{ fontSize: clamp('0.875rem', '2vw', '1rem') }}>
                {error}
              </Typography>
            </Box>
          ) : standings.length === 0 ? (
            // Empty state
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: clamp('0.875rem', '2vw', '1rem') }}>
                No team data available.
              </Typography>
            </Box>
          ) : (
            // Content - always show if data exists (even during loading/error)
            <>
              {(['East', 'West'] as const).map(conference => (
                <Box key={conference} sx={{ mb: { xs: 3, sm: 4 }, minHeight: { xs: 400, sm: 500 } }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: typography.weight.bold,
                      mb: 2,
                      fontSize: clamp('1rem', '3vw', '1.25rem'),
                      color: 'text.primary',
                      letterSpacing: typography.letterSpacing.tight,
                      minHeight: { xs: '1.5rem', sm: '1.75rem' },
                    }}
                  >
                    {conference === 'East' ? 'Eastern Conference' : 'Western Conference'}
                  </Typography>

                  <Grid container spacing={2} alignItems="flex-start">
                    {divisions[conference].map(division => {
                      const teams = teamsByDivision[conference][division] || [];
                      if (teams.length === 0) return null;

                      return (
                        <Grid item xs={12} sm={6} lg={4} key={division}>
                          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: typography.weight.semibold,
                                mb: 1.5,
                                fontSize: clamp('0.875rem', '2vw', '1rem'),
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                minHeight: { xs: '1.5rem', sm: '1.75rem' },
                                lineHeight: 1.5,
                              }}
                            >
                              {division}
                            </Typography>
                            <Paper
                              elevation={0}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: borderRadius.md,
                                overflow: 'hidden',
                                backgroundColor: 'background.paper',
                                minHeight: { xs: 300, sm: 400 },
                              }}
                            >
                              {teams.map((team, index) => {
                                const logo = getTeamLogo(team);
                                const fullTeamName = `${team.team_city} ${team.team_name}`;

                                return (
                                  <Box
                                    key={team.team_id}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 1.5,
                                      p: 2,
                                      borderBottom: index < teams.length - 1 ? '1px solid' : 'none',
                                      borderColor: 'divider',
                                      transition: transitions.normal,
                                      minHeight: 120,
                                      '&:hover': {
                                        backgroundColor: 'action.hover',
                                      },
                                    }}
                                  >
                                    <Avatar
                                      src={logo}
                                      alt={fullTeamName}
                                      onClick={() => navigate(`/team/${team.team_id}`)}
                                      sx={{
                                        width: 40,
                                        height: 40,
                                        aspectRatio: '1/1',
                                        backgroundColor: 'transparent',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        cursor: 'pointer',
                                        transition: transitions.normal,
                                        flexShrink: 0,
                                        mt: 0.25, // Align with first line of text
                                        '&:hover': {
                                          borderColor: 'primary.main',
                                          transform: 'scale(1.05)',
                                        },
                                      }}
                                      onError={e => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = '/logos/default.svg';
                                      }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0, mr: 1, overflow: 'hidden' }}>
                                      <Typography
                                        variant="body1"
                                        sx={{
                                          fontWeight: typography.weight.bold,
                                          fontSize: clamp('0.875rem', '2vw', '1rem'),
                                          mb: 0.25,
                                          wordBreak: 'break-word',
                                          overflowWrap: 'break-word',
                                          display: 'block',
                                          lineHeight: 1.4,
                                        }}
                                      >
                                        {fullTeamName}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, ml: 'auto', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => navigate(`/team/${team.team_id}`)}
                                        sx={{
                                          textTransform: 'none',
                                          fontSize: clamp('0.7rem', '1.5vw', '0.8125rem'),
                                          minWidth: { xs: 44, sm: 'auto' },
                                          px: { xs: 1, sm: 1 },
                                          py: { xs: 1, sm: 0.5 },
                                          whiteSpace: 'nowrap',
                                          minHeight: { xs: 44, sm: 36 },
                                        }}
                                      >
                                        Profile
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => navigate(`/team/${team.team_id}?tab=stats`)}
                                        sx={{
                                          textTransform: 'none',
                                          fontSize: clamp('0.7rem', '1.5vw', '0.8125rem'),
                                          minWidth: { xs: 44, sm: 'auto' },
                                          px: { xs: 1, sm: 1 },
                                          py: { xs: 1, sm: 0.5 },
                                          whiteSpace: 'nowrap',
                                          minHeight: { xs: 44, sm: 36 },
                                        }}
                                      >
                                        Stats
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => navigate(`/team/${team.team_id}?tab=schedule`)}
                                        sx={{
                                          textTransform: 'none',
                                          fontSize: clamp('0.7rem', '1.5vw', '0.8125rem'),
                                          minWidth: { xs: 44, sm: 'auto' },
                                          px: { xs: 1, sm: 1 },
                                          py: { xs: 1, sm: 0.5 },
                                          whiteSpace: 'nowrap',
                                          minHeight: { xs: 44, sm: 36 },
                                        }}
                                      >
                                        Schedule
                                      </Button>
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Paper>
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
      </Box>
    </Box>
  );
};

export default Teams;
