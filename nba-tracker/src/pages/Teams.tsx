import { useState, useEffect } from 'react';
import { Box, Container, CircularProgress, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import UniversalSidebar from '../components/UniversalSidebar';
import Navbar from '../components/Navbar';
import TeamNetRatingChart from '../components/TeamNetRatingChart';
import { getCurrentSeason } from '../utils/season';
import { fetchJson } from '../utils/apiClient';
import { TeamStatsResponse } from '../types/teamstats';
import { responsiveSpacing } from '../theme/designTokens';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const Teams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [teamStats, setTeamStats] = useState<TeamStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const season = searchParams.get('season') || getCurrentSeason();

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams({ season: newSeason });
  };

  useEffect(() => {
    const fetchTeamStats = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchJson<TeamStatsResponse>(
          `${API_BASE_URL}/api/v1/teams/stats?season=${encodeURIComponent(season)}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setTeamStats(data);
      } catch (err) {
        console.error('Error fetching team stats:', err);
        setError('Failed to load team statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, [season]);

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
          <Container 
            maxWidth="lg" 
            sx={{ 
              py: { xs: 3, sm: 4, md: 5 }, 
              px: { xs: 2, sm: 3, md: 4 } 
            }}
          >
            <Box sx={{ mb: { xs: 3, sm: 4 } }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                  mb: 1,
                }}
              >
                Teams
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                Team statistics and performance metrics for the {season} season
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Typography variant="body1" color="error" textAlign="center">
                {error}
              </Typography>
            ) : teamStats ? (
              <TeamNetRatingChart data={teamStats} />
            ) : null}
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
          <UniversalSidebar season={season} onSeasonChange={handleSeasonChange} />
        </Box>
      </Box>
    </Box>
  );
};

export default Teams;

