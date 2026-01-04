import React from 'react';
import { Box, Typography } from '@mui/material';
import { typography } from '../theme/designTokens';

interface StatLabelProps {
  label: string;
  value: string | number;
  helper?: string;
  variant?: 'primary' | 'secondary';
}

// Helper function for clamp() typography
const clamp = (min: string, preferred: string, max: string) => `clamp(${min}, ${preferred}, ${max})`;

/**
 * Standardized stat label component for consistent typography and styling.
 * Displays label and value with optional helper text.
 */
const StatLabel: React.FC<StatLabelProps> = ({ label, value, helper, variant = 'secondary' }) => {
  const isPrimary = variant === 'primary';
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          fontSize: typography.editorial.helper.xs,
          color: 'text.secondary',
          textTransform: 'lowercase',
          fontWeight: typography.weight.medium,
          letterSpacing: typography.letterSpacing.wide,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant={isPrimary ? 'h6' : 'body1'}
        sx={{
          fontSize: isPrimary 
            ? typography.editorial.metric.xs 
            : clamp('0.875rem', '2vw', '1rem'),
          fontWeight: isPrimary ? typography.weight.bold : typography.weight.semibold,
          color: 'text.primary',
          lineHeight: typography.lineHeight.normal,
        }}
      >
        {value}
      </Typography>
      {helper && (
        <Typography
          variant="caption"
          sx={{
            fontSize: typography.editorial.helper.xs,
            color: 'text.secondary',
            fontWeight: typography.weight.regular,
          }}
        >
          {helper}
        </Typography>
      )}
    </Box>
  );
};

export default StatLabel;

