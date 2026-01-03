import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { typography, borderRadius } from '../../theme/designTokens';

interface MatchupNarrativeProps {
  narrative: string;
}

/**
 * Displays AI-generated narrative describing the matchup.
 * Provides context about team strengths, recent form, and key storylines.
 */
const MatchupNarrative: React.FC<MatchupNarrativeProps> = ({ narrative }) => {
  const theme = useTheme();
  
  if (!narrative) {
    return null;
  }
  
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: borderRadius.sm,
        backgroundColor: alpha(theme.palette.primary.main, 0.03),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.875rem',
          lineHeight: 1.6,
          color: 'text.primary',
          fontWeight: typography.weight.regular,
        }}
      >
        {narrative}
      </Typography>
    </Box>
  );
};

export default MatchupNarrative;

