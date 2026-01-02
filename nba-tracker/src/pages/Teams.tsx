import { useState, useEffect, useMemo } from 'react';
import { Box, Container, CircularProgress, Typography, Grid, Button, Avatar, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import UniversalSidebar from '../components/UniversalSidebar';
import Navbar from '../components/Navbar';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { fetchJson } from '../utils/apiClient';
import { StandingsResponse, StandingRecord } from '../types/standings';
import { typography, borderRadius, transitions } from '../theme/designTokens';
import { getTeamInfo } from '../utils/teamMappings';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
        setStandings(standingsData.standings);
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data');
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


  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Typography variant="body1" color="error">{error}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'background.default',
          }}
        >
          <Container 
            maxWidth="xl" 
            sx={{ 
              py: { xs: 3, sm: 4, md: 5 }, 
              px: { xs: 2, sm: 3, md: 4 } 
            }}
          >
            <Box sx={{ mb: { xs: 3, sm: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: { xs: typography.size.h5, sm: typography.size.h4 },
                }}
              >
                All Teams
              </Typography>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Season</InputLabel>
                <Select
                  value={season}
                  label="Season"
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  sx={{ borderRadius: borderRadius.sm }}
                >
                  {seasonOptions.map(seasonOption => (
                    <MenuItem key={seasonOption} value={seasonOption}>
                      {seasonOption} Regular Season
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Teams grouped by division */}
            {(['East', 'West'] as const).map(conference => (
              <Box key={conference} sx={{ mb: { xs: 4, sm: 5 } }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: typography.weight.bold,
                    mb: 2,
                    fontSize: { xs: typography.size.h6, sm: typography.size.h5 },
                    color: 'text.primary',
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
                        <Box sx={{ mb: 3 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: typography.weight.semibold,
                              mb: 1.5,
                              fontSize: typography.size.bodyLarge,
                              color: 'text.secondary',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
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
                                    alignItems: 'center',
                                    gap: 2,
                                    p: 2,
                                    borderBottom: index < teams.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                    transition: transitions.normal,
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
                                      backgroundColor: 'transparent',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      cursor: 'pointer',
                                      transition: transitions.normal,
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
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      variant="body1"
                                      sx={{
                                        fontWeight: typography.weight.bold,
                                        fontSize: typography.size.body,
                                        mb: 0.25,
                                      }}
                                    >
                                      {fullTeamName}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => navigate(`/team/${team.team_id}`)}
                                      sx={{
                                        textTransform: 'none',
                                        fontSize: typography.size.caption,
                                        minWidth: 'auto',
                                        px: 1.5,
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
                                        fontSize: typography.size.caption,
                                        minWidth: 'auto',
                                        px: 1.5,
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
                                        fontSize: typography.size.caption,
                                        minWidth: 'auto',
                                        px: 1.5,
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
          </Container>
        </Box>

        <Box
          sx={{
            width: { xs: '100%', md: 320 },
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: { xs: 'none', md: '1px solid' },
            borderTop: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            overflowY: 'auto',
            order: { xs: 2, md: 0 },
          }}
        >
          <UniversalSidebar />
        </Box>
      </Box>
    </Box>
  );
};

export default Teams;
