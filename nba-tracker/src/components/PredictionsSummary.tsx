import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Avatar, LinearProgress, alpha, useTheme, Skeleton, IconButton, Paper, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { GamePrediction } from '../types/predictions';
import { getTeamAbbreviation, getTeamLogo } from '../utils/teamMappings';
import { typography, borderRadius, transitions, shadows } from '../theme/designTokens';

interface PredictionsSummaryProps {
  predictions: GamePrediction[];
  loading: boolean;
  error: string | null;
}

/**
 * Material 3 carousel component for predictions.
 * ESPN-style cycling through predictions with fixed dimensions.
 */
const PredictionsSummary: React.FC<PredictionsSummaryProps> = ({ predictions, loading, error }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = useCallback(() => {
    if (predictions.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % predictions.length);
  }, [predictions.length]);

  const handlePrevious = useCallback(() => {
    if (predictions.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + predictions.length) % predictions.length);
  }, [predictions.length]);

  // Reset index when predictions change
  useEffect(() => {
    if (predictions.length > 0) {
      setCurrentIndex(0);
    }
  }, [predictions.length]);

  // Keyboard navigation
  useEffect(() => {
    if (predictions.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [predictions.length, handleNext, handlePrevious]);

  const currentPrediction = predictions.length > 0 ? predictions[currentIndex] : null;

  // Fixed container dimensions - never changes
  const CONTAINER_HEIGHT = 280;

  return (
    <Box
      sx={{
        mb: 0,
        p: { xs: 2, sm: 2.5 },
        backgroundColor: 'background.paper',
        borderRadius: borderRadius.lg, // Material 3: 16px
        boxShadow: theme.palette.mode === 'dark' ? shadows.dark.sm : shadows.sm, // Material 3 elevation
        height: CONTAINER_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: { xs: typography.size.h6.xs, sm: typography.size.h6.sm },
            color: 'text.primary',
            letterSpacing: typography.letterSpacing.tight,
          }}
        >
          Predictions & Insights
        </Typography>
        {predictions.length > 0 && (
          <Chip
            label={`${currentIndex + 1} / ${predictions.length}`}
            size="small"
            sx={{
              height: 24,
              fontSize: typography.size.caption,
              fontWeight: typography.weight.semibold,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          />
        )}
      </Box>

      {/* Carousel Container - Fixed height content area */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Navigation Arrows */}
        {predictions.length > 1 && (
          <>
            <IconButton
              onClick={handlePrevious}
              sx={{
                position: 'absolute',
                left: { xs: 4, sm: 8 },
                zIndex: 2,
                backgroundColor: 'background.paper',
                boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 },
                '&:hover': {
                  backgroundColor: 'action.hover',
                  boxShadow: theme.palette.mode === 'dark' ? shadows.dark.lg : shadows.lg,
                },
                transition: transitions.smooth,
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: { xs: 4, sm: 8 },
                zIndex: 2,
                backgroundColor: 'background.paper',
                boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 },
                '&:hover': {
                  backgroundColor: 'action.hover',
                  boxShadow: theme.palette.mode === 'dark' ? shadows.dark.lg : shadows.lg,
                },
                transition: transitions.smooth,
              }}
            >
              <ChevronRight />
            </IconButton>
          </>
        )}

        {/* Content Area - All states maintain same dimensions */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            px: { xs: 5, sm: 6 }, // Space for arrows
          }}
        >
          {loading ? (
            // Loading State - Same dimensions
            <Paper
              elevation={2}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: 400 },
                height: 200,
                p: 3,
                borderRadius: borderRadius.lg,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Skeleton variant="rectangular" width="60%" height={24} sx={{ borderRadius: borderRadius.sm }} />
              <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: borderRadius.xs }} />
              <Skeleton variant="rectangular" width="80%" height={20} sx={{ borderRadius: borderRadius.sm }} />
              <Skeleton variant="rectangular" width="70%" height={20} sx={{ borderRadius: borderRadius.sm }} />
            </Paper>
          ) : error ? (
            // Error State - Same dimensions
            <Box
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: 400 },
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
              }}
            >
              <Typography variant="body2" color="error" sx={{ fontSize: typography.size.body, textAlign: 'center' }}>
                {error}
              </Typography>
            </Box>
          ) : predictions.length === 0 ? (
            // Empty State - Same dimensions
            <Box
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: 400 },
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: typography.size.body,
                  textAlign: 'center',
                }}
              >
                No predictions available for this date.
              </Typography>
            </Box>
          ) : currentPrediction ? (
            // Prediction Card - Material 3 Design
            <Paper
              elevation={2}
              onClick={() => navigate(`/predictions?date=${currentPrediction.game_date}`)}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', sm: 400 },
                height: 200,
                p: 3,
                borderRadius: borderRadius.lg, // Material 3: 16px
                cursor: 'pointer',
                transition: transitions.smooth,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
                '&:hover': {
                  boxShadow: theme.palette.mode === 'dark' ? shadows.dark.lg : shadows.lg,
                  transform: 'translateY(-2px)',
                },
                '&:active': {
                  transform: 'translateY(0px)',
                  boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
                },
              }}
            >
              {/* Team Matchup Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={getTeamLogo(currentPrediction.away_team_name)}
                    sx={{
                      width: 40,
                      height: 40,
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: typography.size.body,
                      color: 'text.primary',
                    }}
                  >
                    {getTeamAbbreviation(currentPrediction.away_team_name)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.bodySmall,
                    color: 'text.secondary',
                    px: 1.5,
                  }}
                >
                  @
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: typography.size.body,
                      color: 'text.primary',
                    }}
                  >
                    {getTeamAbbreviation(currentPrediction.home_team_name)}
                  </Typography>
                  <Avatar
                    src={getTeamLogo(currentPrediction.home_team_name)}
                    sx={{
                      width: 40,
                      height: 40,
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  />
                </Box>
              </Box>

              {/* Win Probability */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: typography.size.caption,
                      color: 'text.secondary',
                      fontWeight: typography.weight.medium,
                      textTransform: 'uppercase',
                      letterSpacing: typography.letterSpacing.wider,
                    }}
                  >
                    Win Probability
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: typography.weight.bold,
                      fontSize: typography.size.bodySmall,
                      color: 'primary.main',
                    }}
                  >
                    {currentPrediction.home_win_probability > currentPrediction.away_win_probability
                      ? getTeamAbbreviation(currentPrediction.home_team_name)
                      : getTeamAbbreviation(currentPrediction.away_team_name)}{' '}
                    {Math.max(
                      currentPrediction.home_win_probability,
                      currentPrediction.away_win_probability
                    ) * 100}
                    %
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(currentPrediction.home_win_probability, currentPrediction.away_win_probability) * 100}
                  sx={{
                    height: 8,
                    borderRadius: borderRadius.full,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        Math.max(currentPrediction.home_win_probability, currentPrediction.away_win_probability) >= 0.7
                          ? theme.palette.success.main
                          : Math.max(currentPrediction.home_win_probability, currentPrediction.away_win_probability) >= 0.5
                          ? theme.palette.primary.main
                          : theme.palette.warning.main,
                      borderRadius: borderRadius.full,
                    },
                  }}
                />
              </Box>

              {/* Projected Score */}
              <Box sx={{ mt: 'auto' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: typography.size.caption,
                    color: 'text.secondary',
                    fontWeight: typography.weight.medium,
                    textTransform: 'uppercase',
                    letterSpacing: typography.letterSpacing.wider,
                    mb: 0.75,
                    display: 'block',
                  }}
                >
                  Projected Score
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: { xs: typography.size.h6.xs, sm: typography.size.h6.sm },
                    color: 'text.primary',
                    lineHeight: typography.lineHeight.tight,
                  }}
                >
                  {getTeamAbbreviation(currentPrediction.away_team_name)} {currentPrediction.predicted_away_score} -{' '}
                  {currentPrediction.predicted_home_score} {getTeamAbbreviation(currentPrediction.home_team_name)}
                </Typography>
              </Box>
            </Paper>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

export default PredictionsSummary;
