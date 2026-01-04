import React from 'react';
import {
  Paper,
  Box,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { borderRadius, transitions } from '../theme/designTokens';
import { GamePrediction } from '../types/predictions';
import PredictionHeader from './predictions/PredictionHeader';
import PredictionSummary from './predictions/PredictionSummary';
import PredictionInsights from './predictions/PredictionInsights';

interface PredictionCardProps {
  prediction: GamePrediction;
}

/**
 * Premium prediction card with 3-zone structure:
 * 1. Header: Game context (logos, matchup, confidence)
 * 2. Summary: Core prediction (winner, probability, score)
 * 3. Insights: Expandable AI intelligence (collapsed by default)
 */
const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: borderRadius.md,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        p: { xs: 2.5, sm: 3 },
        minHeight: { xs: 400, sm: 450 },
        transition: transitions.smooth,
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
            : '0 4px 12px rgba(0, 0, 0, 0.12)',
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      {/* Zone 1: Header - Game Context */}
      <PredictionHeader prediction={prediction} />
      
      {/* Zone 2: Summary - Core Prediction */}
      <PredictionSummary prediction={prediction} />
      
      {/* Zone 3: Insights - Expandable Intelligence */}
      <Box sx={{ mt: 'auto' }}>
        <PredictionInsights prediction={prediction} />
              </Box>
    </Paper>
  );
};

export default PredictionCard;
