import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import Navbar from '../components/Navbar';
import PredictionCard from '../components/PredictionCard';
import WeeklyCalendar from '../components/WeeklyCalendar';
import { typography, borderRadius } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PredictionsResponse, GamePrediction } from '../types/predictions';
import { format, parseISO } from 'date-fns';

import { API_BASE_URL } from '../utils/apiConfig';

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) => `clamp(${min}, ${preferred}, ${max})`;

/**
 * Predictions page showing game predictions for a selected date.
 * Displays win probability, projected scores, and AI-generated insights for each game.
 */
const Predictions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Persistent prediction cache keyed by game_id
  const [predictionCache, setPredictionCache] = useState<Map<string, GamePrediction>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dateParam = searchParams.get('date');
  const selectedDate = dateParam || format(new Date(), 'yyyy-MM-dd');
  const season = getCurrentSeason();

  /**
   * Update prediction cache with new predictions.
   * Only adds/updates predictions when valid new data arrives.
   * Never clears existing predictions - preserves cache across fetch cycles.
   */
  const updatePredictionCache = useCallback((newPredictions: GamePrediction[], date: string) => {
    setPredictionCache(prev => {
      const updated = new Map(prev);
      // Only update if we have valid new predictions
      if (newPredictions && newPredictions.length > 0) {
        newPredictions.forEach(prediction => {
          // Only update if prediction is for current date
          if (prediction.game_date === date) {
            updated.set(prediction.game_id, prediction);
          }
        });
      }
      // Never clear - keep existing predictions
      return updated;
    });
  }, []);

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson<PredictionsResponse>(
          `${API_BASE_URL}/api/v1/predictions/date/${selectedDate}?season=${season}`,
          {},
          { maxRetries: 2, retryDelay: 500, timeout: 120000 }
        );
        console.log(`Predictions loaded: ${data.predictions?.length || 0} games for ${selectedDate}`);
        // Update cache with new predictions (preserves existing ones)
        if (data && data.predictions) {
          updatePredictionCache(data.predictions, selectedDate);
        }
        // Don't clear cache on error - keep existing predictions visible
      } catch (err) {
        console.error('Predictions error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load predictions');
        // Cache persists across errors
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [selectedDate, season, updatePredictionCache]);

  // Get predictions for current date from cache
  const cachedPredictions = Array.from(predictionCache.values()).filter(
    p => p.game_date === selectedDate
  );


  const handleDateChange = (newDate: string) => {
    setSearchParams({ date: newDate });
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
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', sm: 800, md: 800 },
              borderRadius: borderRadius.lg,
              backgroundColor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            {/* Header with title and filters - always rendered */}
            <Box
              sx={{
                p: { xs: 2, sm: 3 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
                minHeight: { xs: 140, sm: 160 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: typography.weight.bold,
                        fontSize: { xs: 'clamp(1.25rem, 4vw, 1.5rem)', sm: 'clamp(1.25rem, 4vw, 1.5rem)' },
                        color: 'text.primary',
                      }}
                    >
                      Predictions
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: typography.editorial.helper.xs }}
                    >
                      AI-powered game insights
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {loading && cachedPredictions.length > 0 && (
                    <Chip
                      icon={<CircularProgress size={12} />}
                      label="Updating"
                      size="small"
                      sx={{
                        fontSize: clamp('0.7rem', '1.5vw', '0.75rem'),
                        height: 24,
                        backgroundColor: 'background.paper',
                      }}
                    />
                  )}
                  <Chip
                    label={`${cachedPredictions.length} Game${cachedPredictions.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{
                      backgroundColor: 'background.paper',
                      fontWeight: typography.weight.medium,
                      fontSize: clamp('0.7rem', '1.5vw', '0.75rem'),
                    }}
                  />
                </Box>
              </Box>

              {/* Weekly Calendar */}
              <Box sx={{ mt: 2 }}>
                <WeeklyCalendar selectedDate={selectedDate} setSelectedDate={handleDateChange} />
              </Box>
            </Box>

            {/* Content container - always rendered with minHeight */}
            <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: { xs: 600, sm: 800 } }}>
              {loading && cachedPredictions.length === 0 ? (
                // Loading skeleton - only show if no data exists
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 3 } }}>
                  {[...Array(3)].map((_, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: { xs: 2.5, sm: 3 },
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: borderRadius.md,
                        backgroundColor: 'background.paper',
                        minHeight: { xs: 400, sm: 450 },
                      }}
                    >
                      <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
                      <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2, borderRadius: borderRadius.sm }} />
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Skeleton variant="text" width="30%" height={24} />
                        <Skeleton variant="text" width="30%" height={24} />
                      </Box>
                      <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </Paper>
                  ))}
                </Box>
              ) : error && cachedPredictions.length === 0 ? (
                // Error state - only show if no data exists
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: borderRadius.md,
                    '& .MuiAlert-message': {
                      fontSize: clamp('0.875rem', '2vw', '1rem'),
                    },
                  }}
                >
                  {error}
                </Alert>
              ) : cachedPredictions.length === 0 ? (
                // Empty state
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 1,
                      fontWeight: typography.weight.bold,
                      fontSize: clamp('1rem', '3vw', '1.25rem'),
                    }}
                  >
                    No Games Scheduled
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: clamp('0.875rem', '2vw', '1rem') }}
                  >
                    No games scheduled for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                  </Typography>
                </Box>
              ) : (
                // Content - always show if predictions exist (even during loading/error)
                // Single column layout for comfortable reading
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 3 } }}>
                  {[...cachedPredictions]
                    .sort((a, b) => {
                      return b.home_win_probability - a.home_win_probability;
                    })
                    .map((prediction) => (
                      <Box key={prediction.game_id}>
                        <PredictionCard prediction={prediction} />
                      </Box>
                    ))}
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Predictions;
