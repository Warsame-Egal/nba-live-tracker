import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import { typography, borderRadius } from '../../theme/designTokens';
import { KeyDriver as KeyDriverType } from '../../types/predictions';

interface KeyDriversProps {
  drivers: KeyDriverType[];
}

/**
 * Displays key factors that influence the prediction.
 * Shows each driver with its impact and magnitude (high/moderate/low).
 */
const KeyDrivers: React.FC<KeyDriversProps> = ({ drivers }) => {
  const theme = useTheme();
  
  if (!drivers || drivers.length === 0) {
    return null;
  }
  
  const getMagnitudeColor = (magnitude: string) => {
    switch (magnitude.toLowerCase()) {
      case 'high':
        return theme.palette.primary.main;
      case 'moderate':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.text.secondary;
      default:
        return theme.palette.primary.main;
    }
  };
  
  const getMagnitudeIcon = (magnitude: string) => {
    switch (magnitude.toLowerCase()) {
      case 'high':
        return <TrendingUp sx={{ fontSize: 16 }} />;
      case 'low':
        return <TrendingDown sx={{ fontSize: 16 }} />;
      default:
        return <Remove sx={{ fontSize: 16 }} />;
    }
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: typography.weight.semibold,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'text.secondary',
          mb: 0.5,
        }}
      >
        Key Drivers
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {drivers.map((driver, idx) => {
          const magnitudeColor = getMagnitudeColor(driver.magnitude);
          const MagnitudeIcon = getMagnitudeIcon(driver.magnitude);
          
          return (
            <Box
              key={idx}
              sx={{
                p: 1.5,
                borderRadius: borderRadius.sm,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: typography.weight.semibold,
                      color: 'text.primary',
                      fontSize: '0.875rem',
                      mb: 0.5,
                    }}
                  >
                    {driver.factor}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {driver.impact}
                  </Typography>
                </Box>
                <Chip
                  icon={MagnitudeIcon}
                  label={driver.magnitude}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.6875rem',
                    fontWeight: typography.weight.medium,
                    backgroundColor: alpha(magnitudeColor, 0.15),
                    color: magnitudeColor,
                    border: `1px solid ${alpha(magnitudeColor, 0.3)}`,
                    borderRadius: borderRadius.xs,
                    flexShrink: 0,
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default KeyDrivers;

