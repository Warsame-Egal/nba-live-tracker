import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, Alert, Chip, Skeleton, CircularProgress } from '@mui/material';
import PredictionCard from '../components/PredictionCard';
import WeeklyCalendar from '../components/WeeklyCalendar';
import { typography, borderRadius } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PredictionsResponse, GamePrediction } from '../types/predictions';
import { format, parseISO } from 'date-fns';

import { API_BASE_URL } from '../utils/apiConfig';
import PageContainer from '../components/PageContainer';

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) =>
  `clamp(${min}, ${preferred}, ${max})`;

/**
 * Predictions page showing game predictions for a selected date.
 * Displays win probability, projected scores, and AI-generated insights for each game.
 */
const Predictions = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Persistent prediction cache keyed by game_id
  const [predictionCache, setPredictionCache] = useState<Map<string, GamePrediction>>(new Map());
  // Track which dates have already been fetched to avoid refetching when users switch back.
  const fetchedDatesRef = useRef<Set<string>>(new Set());
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
      // If we've already fetched this date once, use the warm cache and skip refetch.
      if (fetchedDatesRef.current.has(selectedDate)) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson<PredictionsResponse>(
          `${API_BASE_URL}/api/v1/predictions/date/${selectedDate}?season=${season}`,
          {},
          { maxRetries: 2, retryDelay: 500, timeout: 120000 },
        );
        // Update cache with new predictions (preserves existing ones)
        if (data && data.predictions) {
          updatePredictionCache(data.predictions, selectedDate);
        }
        fetchedDatesRef.current.add(selectedDate);
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
    p => p.game_date === selectedDate,
  );

  const handleDateChange = (newDate: string) => {
    setSearchParams({ date: newDate });
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
      <PageContainer maxWidth={1400}>
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              mb: 2.5,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                  letterSpacing: '0.02em',
                }}
              >
                Predictions
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                AI-powered game predictions · {format(parseISO(selectedDate), 'MMMM d, yyyy')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {loading && cachedPredictions.length > 0 && (
                <CircularProgress size={14} sx={{ color: 'text.secondary' }} />
              )}
              {cachedPredictions.length > 0 && (
                <Chip
                  label={`${cachedPredictions.length} Game${cachedPredictions.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ height: 24, fontSize: '0.6875rem', fontWeight: 600 }}
                />
              )}
            </Box>
          </Box>
          <WeeklyCalendar selectedDate={selectedDate} setSelectedDate={handleDateChange} />
        </Box>

        {/* Content: loading / error / empty / grid - full width */}
        <Box sx={{ minHeight: { xs: 600, sm: 800 } }}>
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
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={120}
                    sx={{ mb: 2, borderRadius: borderRadius.sm }}
                  />
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
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontSize: clamp('0.8rem', '1.8vw', '0.95rem') }}
              >
                Try a different date or check the schedule.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
                gap: { xs: 2, sm: 2.5 },
                alignItems: 'start',
              }}
            >
              {[...cachedPredictions]
                .sort((a, b) => {
                  const tierOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                  const aTier = tierOrder[(a.confidence_tier || 'low').toLowerCase()] ?? 2;
                  const bTier = tierOrder[(b.confidence_tier || 'low').toLowerCase()] ?? 2;
                  if (aTier !== bTier) return aTier - bTier;
                  return Math.abs(b.home_win_probability - 0.5) - Math.abs(a.home_win_probability - 0.5);
                })
                .map(prediction => (
                  <PredictionCard key={prediction.game_id} prediction={prediction} />
                ))}
            </Box>
          )}
        </Box>
      </PageContainer>
    </Box>
  );
};

export default Predictions;
