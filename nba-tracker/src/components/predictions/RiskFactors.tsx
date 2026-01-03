import React from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Warning } from '@mui/icons-material';
import { typography, borderRadius } from '../../theme/designTokens';
import { RiskFactor as RiskFactorType } from '../../types/predictions';

interface RiskFactorsProps {
  risks: RiskFactorType[];
  defaultExpanded?: boolean;
}

/**
 * Shows potential risks that could affect the prediction accuracy.
 * Collapsible section with warning styling.
 */
const RiskFactors: React.FC<RiskFactorsProps> = ({ risks, defaultExpanded = false }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  
  if (!risks || risks.length === 0) {
    return null;
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          p: 1,
          borderRadius: borderRadius.sm,
          '&:hover': {
            backgroundColor: alpha(theme.palette.warning.main, 0.05),
          },
        }}
      >
        <Warning
          sx={{
            fontSize: 18,
            color: theme.palette.warning.main,
          }}
        />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: typography.weight.semibold,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: theme.palette.warning.main,
            flex: 1,
          }}
        >
          Risk Factors ({risks.length})
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: '0.6875rem' }}
        >
          {expanded ? 'Hide' : 'Show'}
        </Typography>
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {risks.map((risk, idx) => (
            <Box
              key={idx}
              sx={{
                p: 1.5,
                borderRadius: borderRadius.sm,
                backgroundColor: alpha(theme.palette.warning.main, 0.08),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: typography.weight.semibold,
                  color: theme.palette.warning.main,
                  fontSize: '0.875rem',
                  mb: 0.5,
                }}
              >
                {risk.factor}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: '0.75rem',
                  lineHeight: 1.4,
                }}
              >
                {risk.explanation}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default RiskFactors;

