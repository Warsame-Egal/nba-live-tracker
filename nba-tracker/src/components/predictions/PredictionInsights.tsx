import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  Analytics,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { GamePrediction } from '../../types/predictions';
import { typography, borderRadius } from '../../theme/designTokens';
import ConfidenceMeter from './ConfidenceMeter';
import KeyDrivers from './KeyDrivers';
import RiskFactors from './RiskFactors';
import MatchupNarrative from './MatchupNarrative';

interface PredictionInsightsProps {
  prediction: GamePrediction;
}

/**
 * Expandable insights zone - displays AI-generated insights.
 * Collapsed by default, expands smoothly within fixed container.
 */
const PredictionInsights: React.FC<PredictionInsightsProps> = ({ prediction }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  // Check if there are any insights to show
  const hasInsights =
    prediction.matchup_narrative ||
    (prediction.key_drivers && prediction.key_drivers.length > 0) ||
    (prediction.risk_factors && prediction.risk_factors.length > 0) ||
    (prediction.insights && prediction.insights.length > 0);
  
  if (!hasInsights) {
    return null;
  }
  
  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        pt: 2,
        minHeight: expanded ? 'auto' : 48, // Fixed height when collapsed
      }}
    >
      {/* Toggle Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          p: 1,
          borderRadius: borderRadius.sm,
          transition: 'background-color 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Analytics sx={{ fontSize: 18, color: theme.palette.primary.main }} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: typography.weight.semibold,
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
            }}
          >
            Insights
          </Typography>
        </Box>
        <IconButton
          size="small"
          sx={{
            p: 0.5,
            minWidth: { xs: 44, sm: 32 },
            minHeight: { xs: 44, sm: 32 },
            color: 'text.secondary',
            transition: 'transform 0.2s ease-in-out',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ExpandMore />
        </IconButton>
      </Box>
      
      {/* Collapsible Content */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
          {/* Confidence Meter */}
          {prediction.confidence !== undefined && (
            <Box>
              <ConfidenceMeter
                confidence={prediction.confidence}
                tier={prediction.confidence_tier}
                explanation={prediction.confidence_explanation}
              />
            </Box>
          )}
          
          {/* Matchup Narrative */}
          {prediction.matchup_narrative && (
            <MatchupNarrative narrative={prediction.matchup_narrative} />
          )}
          
          {/* Key Drivers */}
          {prediction.key_drivers && prediction.key_drivers.length > 0 && (
            <KeyDrivers drivers={prediction.key_drivers} />
          )}
          
          {/* Risk Factors */}
          {prediction.risk_factors && prediction.risk_factors.length > 0 && (
            <RiskFactors risks={prediction.risk_factors} defaultExpanded={false} />
          )}
          
          {/* Basic Insights */}
          {prediction.insights && prediction.insights.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: typography.weight.semibold,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                  mb: 1.5,
                }}
              >
                Additional Insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {prediction.insights.slice(0, 3).map((insight, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: borderRadius.sm,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box
                        sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: theme.palette.primary.main,
                          mt: 0.75,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: typography.weight.semibold,
                            mb: 0.5,
                            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                            color: 'text.primary',
                          }}
                        >
                          {insight.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                            lineHeight: 1.5,
                          }}
                        >
                          {insight.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default PredictionInsights;

