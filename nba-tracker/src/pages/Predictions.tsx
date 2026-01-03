import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  CalendarToday,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import Navbar from '../components/Navbar';
import PredictionCard from '../components/PredictionCard';
import { typography } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PredictionsResponse } from '../types/predictions';
import { format, parseISO, addDays, subDays } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Predictions page showing game predictions for a selected date.
 * Displays win probability, projected scores, and AI-generated insights for each game.
 */
const Predictions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dateParam = searchParams.get('date');
  const selectedDate = dateParam || format(new Date(), 'yyyy-MM-dd');
  const season = getCurrentSeason();

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError(null);
      // Don't clear predictions immediately - keep showing old ones while loading
      try {
        const data = await fetchJson<PredictionsResponse>(
          `${API_BASE_URL}/api/v1/predictions/date/${selectedDate}?season=${season}`,
          {},
          { maxRetries: 2, retryDelay: 500, timeout: 120000 } // 120s timeout for AI processing (10 games can take time)
        );
        console.log(`Predictions loaded: ${data.predictions?.length || 0} games for ${selectedDate}`);
        // Only update if we got valid data
        if (data && data.predictions) {
          setPredictions(data);
        }
      } catch (err) {
        console.error('Predictions error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load predictions');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [selectedDate, season]);


  const handleDateChange = (newDate: string) => {
    setSearchParams({ date: newDate });
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const current = parseISO(selectedDate);
    const newDate = direction === 'next' ? addDays(current, 1) : subDays(current, 1);
    handleDateChange(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', md: 1200 },
              borderRadius: 1.5,
              backgroundColor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            {/* Header with title and filters */}
            <Box
              sx={{
                p: { xs: 2, sm: 3 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: typography.weight.bold,
                        fontSize: { xs: typography.size.h6, sm: typography.size.h5 },
                        color: 'text.primary',
                      }}
                    >
                      Game Predictions
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Stat-based predictions with AI insights
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${predictions?.predictions.length || 0} Game${predictions?.predictions.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    backgroundColor: 'background.paper',
                    fontWeight: typography.weight.medium,
                  }}
                />
              </Box>

              {/* Filters row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <IconButton
                  onClick={() => handleDateNavigation('prev')}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    width: 36,
                    height: 36,
                    '&:hover': {
                      backgroundColor: 'background.paper',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <TrendingDown fontSize="small" />
                </IconButton>
                <TextField
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      backgroundColor: 'background.paper',
                    },
                  }}
                />
                <IconButton
                  onClick={() => handleDateNavigation('next')}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    minWidth: { xs: 44, sm: 36 },
                    minHeight: { xs: 44, sm: 36 },
                    '&:hover': {
                      backgroundColor: 'background.paper',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <TrendingUp fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: loading ? 600 : 'auto' }}>
              {loading && (
                <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
                  {[...Array(4)].map((_, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1.5,
                          backgroundColor: 'background.paper',
                        }}
                      >
                        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
                        <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2, borderRadius: 1 }} />
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          <Skeleton variant="text" width="30%" height={24} />
                          <Skeleton variant="text" width="30%" height={24} />
                        </Box>
                        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="60%" height={20} />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}

              {!loading && error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 1,
                    '& .MuiAlert-message': {
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  {error}
                </Alert>
              )}

              {!loading && !error && predictions && (
                <>
                  {predictions.predictions.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          mb: 1,
                          fontWeight: typography.weight.bold,
                          fontSize: { xs: typography.size.body, sm: typography.size.h6 },
                        }}
                      >
                        No Games Scheduled
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: '0.875rem' }}
                      >
                        No games scheduled for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
                      {[...predictions.predictions]
                        .sort((a, b) => {
                          return b.home_win_probability - a.home_win_probability;
                        })
                        .map((prediction) => (
                          <Grid item xs={12} md={6} key={prediction.game_id}>
                            <PredictionCard prediction={prediction} />
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Predictions;
