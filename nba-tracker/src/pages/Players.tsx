import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import UniversalSidebar from '../components/UniversalSidebar';
import SeasonLeaders from '../components/SeasonLeaders';
import AllTimeLeaders from '../components/AllTimeLeaders';
import Navbar from '../components/Navbar';
import { responsiveSpacing, typography } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { SeasonLeadersResponse } from '../types/seasonleaders';
import { AllTimeLeadersResponse } from '../types/alltimeleaders';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const Players = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [seasonLeaders, setSeasonLeaders] = useState<SeasonLeadersResponse | null>(null);
  const [allTimeLeaders, setAllTimeLeaders] = useState<AllTimeLeadersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [allTimeLoading, setAllTimeLoading] = useState(false);

  const season = searchParams.get('season') || getCurrentSeason();

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams({ season: newSeason });
  };

  useEffect(() => {
    const fetchSeasonLeaders = async () => {
      setLoading(true);
      try {
        const data = await fetchJson<SeasonLeadersResponse>(
          `${API_BASE_URL}/api/v1/players/season-leaders?season=${encodeURIComponent(season)}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setSeasonLeaders(data);
      } catch (err) {
        console.error('Error fetching season leaders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonLeaders();
  }, [season]);

  useEffect(() => {
    const fetchAllTimeLeaders = async () => {
      setAllTimeLoading(true);
      try {
        const data = await fetchJson<AllTimeLeadersResponse>(
          `${API_BASE_URL}/api/v1/players/all-time-leaders?top_n=10`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setAllTimeLeaders(data);
      } catch (err) {
        console.error('Error fetching all-time leaders:', err);
      } finally {
        setAllTimeLoading(false);
      }
    };

    fetchAllTimeLeaders();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}        >
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'background.default',
          }}
        >
          <Container maxWidth={false} sx={{ py: responsiveSpacing.containerVertical, px: { xs: 2, sm: 3, md: 4, lg: 6 } }}>
            <Box sx={{ mb: { xs: 3, sm: 4 } }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: { xs: typography.size.h5, sm: typography.size.h4 },
                  mb: 1,
                }}
              >
                Players
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                Season leaders and all-time records for the {season} season
              </Typography>
            </Box>

            {/* Season Leaders Section */}
            <Box sx={{ mb: { xs: 6, sm: 8 } }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: typography.weight.bold,
                  mb: responsiveSpacing.section,
                  fontSize: { xs: typography.size.h6, sm: typography.size.h5 },
                }}
              >
                Season Leaders
              </Typography>
              {loading || !seasonLeaders ? (
                <Box>Loading...</Box>
              ) : (
                <SeasonLeaders data={seasonLeaders} />
              )}
            </Box>

            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: typography.weight.bold,
                  mb: responsiveSpacing.section,
                  fontSize: { xs: typography.size.h5, sm: typography.size.h4 },
                }}
              >
                All-Time Leaders
              </Typography>
              {allTimeLoading || !allTimeLeaders ? (
                <Box>Loading...</Box>
              ) : (
                <AllTimeLeaders data={allTimeLeaders} />
              )}
            </Box>
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

export default Players;

