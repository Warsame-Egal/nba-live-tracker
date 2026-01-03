import React from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { typography, borderRadius } from '../../theme/designTokens';
import { CircularProgress } from '@mui/material';

interface ConfidenceMeterProps {
  confidence: number; // 0-1
  tier?: 'high' | 'medium' | 'low';
  explanation?: string;
}

/**
 * Shows model confidence level with circular progress indicator.
 * Displays confidence tier (high/medium/low) with color coding.
 */
const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ confidence, tier, explanation }) => {
  const theme = useTheme();
  
  // Determine tier from confidence if not provided
  const confidenceTier = tier || (confidence >= 0.7 ? 'high' : confidence >= 0.5 ? 'medium' : 'low');
  
  // Color coding
  const getTierColor = () => {
    switch (confidenceTier) {
      case 'high':
        return theme.palette.success.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.error.main;
      default:
        return theme.palette.primary.main;
    }
  };
  
  const getTierLabel = () => {
    switch (confidenceTier) {
      case 'high':
        return 'High Model Confidence';
      case 'medium':
        return 'Medium Model Confidence';
      case 'low':
        return 'Low Model Confidence';
      default:
        return 'Model Confidence';
    }
  };
  
  const tierColor = getTierColor();
  const tierLabel = getTierLabel();
  const confidencePercent = Math.round(confidence * 100);
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Circular Progress Indicator */}
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={confidencePercent}
          size={56}
          thickness={4}
          sx={{
            color: tierColor,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="body2"
            component="div"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: '0.875rem',
              color: 'text.primary',
            }}
          >
            {confidencePercent}%
          </Typography>
        </Box>
      </Box>
      
      {/* Tier Badge and Explanation */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Tooltip title={explanation || `Model confidence in this prediction: ${confidencePercent}%`} arrow>
          <Chip
            label={tierLabel}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: typography.weight.semibold,
              backgroundColor: alpha(tierColor, 0.15),
              color: tierColor,
              border: `1px solid ${alpha(tierColor, 0.3)}`,
              borderRadius: borderRadius.xs,
              cursor: explanation ? 'help' : 'default',
            }}
          />
        </Tooltip>
        {explanation && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.6875rem',
              maxWidth: 200,
              lineHeight: 1.3,
            }}
          >
            {explanation}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ConfidenceMeter;

