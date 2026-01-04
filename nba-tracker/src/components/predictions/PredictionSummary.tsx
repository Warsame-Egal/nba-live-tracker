import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { GamePrediction } from '../../types/predictions';
import { getTeamAbbreviation } from '../../utils/teamMappings';
import { typography, borderRadius } from '../../theme/designTokens';

interface PredictionSummaryProps {
  prediction: GamePrediction;
}

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) => `clamp(${min}, ${preferred}, ${max})`;

/**
 * Core prediction zone - displays predicted winner, win probability, and projected score.
 * This is the primary insight and should be the visual focal point.
 */
const PredictionSummary: React.FC<PredictionSummaryProps> = ({ prediction }) => {
  const theme = useTheme();
  
  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  
  const homeWinProb = prediction.home_win_probability * 100;
  const awayWinProb = prediction.away_win_probability * 100;
  
  // Determine predicted winner
  const predictedWinner = homeWinProb > awayWinProb ? 'home' : 'away';
  const winnerAbbr = predictedWinner === 'home' ? homeAbbr : awayAbbr;
  const winnerProb = predictedWinner === 'home' ? homeWinProb : awayWinProb;
  
  return (
    <Box sx={{ mb: 3 }}>
      {/* Predicted Winner - Centered Callout */}
      <Box
        sx={{
          mb: 2.5,
          p: { xs: 2, sm: 2.5 },
          borderRadius: borderRadius.md,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mb: 1.5,
            fontSize: clamp('0.625rem', '1.25vw', '0.6875rem'),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: typography.weight.medium,
            opacity: 0.7,
          }}
        >
          Expected Winner
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75,
        }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: clamp('1.5rem', '4vw', '2rem'),
              color: 'primary.main',
              lineHeight: 1.2,
            }}
          >
            {winnerAbbr}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: clamp('0.9375rem', '2.25vw', '1.125rem'),
              color: 'text.secondary',
              opacity: 0.9,
            }}
          >
            {winnerProb.toFixed(1)}% win probability
          </Typography>
        </Box>
      </Box>
      
      {/* Projected Score - Focal Point */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: borderRadius.md,
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mb: 2,
            fontSize: clamp('0.65rem', '1.5vw', '0.6875rem'),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: typography.weight.medium,
          }}
        >
          Score
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: clamp('1.75rem', '4vw', '2.25rem'),
                color: predictedWinner === 'away' ? 'primary.main' : 'text.primary',
                mb: 0.5,
              }}
            >
              {prediction.predicted_away_score.toFixed(0)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: clamp('0.75rem', '1.5vw', '0.8125rem'),
                fontWeight: typography.weight.medium,
              }}
            >
              {awayAbbr}
            </Typography>
          </Box>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontSize: clamp('1.25rem', '2.5vw', '1.5rem'),
              fontWeight: typography.weight.regular,
            }}
          >
            -
          </Typography>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: clamp('1.75rem', '4vw', '2.25rem'),
                color: predictedWinner === 'home' ? 'primary.main' : 'text.primary',
                mb: 0.5,
              }}
            >
              {prediction.predicted_home_score.toFixed(0)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: clamp('0.75rem', '1.5vw', '0.8125rem'),
                fontWeight: typography.weight.medium,
              }}
            >
              {homeAbbr}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Win Probability - Elegant visualization */}
      <Box sx={{ mt: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mb: 1.5,
            fontSize: clamp('0.65rem', '1.5vw', '0.6875rem'),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: typography.weight.medium,
          }}
        >
          Win %
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: clamp('0.75rem', '1.5vw', '0.8125rem') }}
              >
                {awayAbbr}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.semibold,
                  fontSize: clamp('0.8125rem', '1.75vw', '0.875rem'),
                }}
              >
                {awayWinProb.toFixed(1)}%
              </Typography>
            </Box>
            <Box
              sx={{
                height: 4,
                borderRadius: borderRadius.xs,
                backgroundColor: 'action.hover',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${awayWinProb}%`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.4),
                  borderRadius: borderRadius.xs,
                  transition: 'width 0.3s ease-in-out',
                }}
              />
            </Box>
          </Box>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: clamp('0.75rem', '1.5vw', '0.8125rem') }}
              >
                {homeAbbr}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.semibold,
                  fontSize: clamp('0.8125rem', '1.75vw', '0.875rem'),
                }}
              >
                {homeWinProb.toFixed(1)}%
              </Typography>
            </Box>
            <Box
              sx={{
                height: 4,
                borderRadius: borderRadius.xs,
                backgroundColor: 'action.hover',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${homeWinProb}%`,
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: borderRadius.xs,
                  transition: 'width 0.3s ease-in-out',
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PredictionSummary;

