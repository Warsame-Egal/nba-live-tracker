import React, { useState } from 'react';
import { Paper, Box, Typography, Chip, Collapse, IconButton } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { borderRadius, transitions, typography } from '../theme/designTokens';
import { GamePrediction } from '../types/predictions';
import PredictionHeader from './predictions/PredictionHeader';
import PredictionSummary from './predictions/PredictionSummary';
import RiskFactors from './predictions/RiskFactors';
import { getTeamAbbreviation } from '../utils/teamMappings';

interface PredictionCardProps {
  prediction: GamePrediction;
}

/**
 * Prediction card: confidence top-right, narrative at top, large win prob bar,
 * key factor pills inline, tap to expand risk factors.
 */
const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const theme = useTheme();
  const [riskExpanded, setRiskExpanded] = useState(false);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);

  const confidenceColor =
    prediction.confidence_tier &&
    (() => {
      switch (prediction.confidence_tier.toLowerCase()) {
        case 'high':
          return theme.palette.success.main;
        case 'medium':
          return theme.palette.warning.main;
        case 'low':
          return theme.palette.text.secondary;
        default:
          return theme.palette.text.secondary;
      }
    })();

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: borderRadius.md,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '4px solid',
        borderLeftColor: confidenceColor || 'primary.main',
        backgroundColor: 'background.paper',
        p: { xs: 2.5, sm: 3 },
        minHeight: { xs: 380, sm: 420 },
        transition: transitions.smooth,
        '&:hover': {
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(0, 0, 0, 0.4)'
              : '0 4px 12px rgba(0, 0, 0, 0.12)',
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
      }}
    >
      {/* Confidence badge top-right */}
      {prediction.confidence_tier && confidenceColor && (
        <Chip
          label={
            prediction.confidence_tier.toUpperCase()
          }
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            height: 24,
            fontSize: '0.6875rem',
            fontWeight: typography.weight.semibold,
            fontFamily: '"Barlow Condensed", sans-serif',
            backgroundColor: alpha(confidenceColor, 0.15),
            color: confidenceColor,
            border: `1px solid ${alpha(confidenceColor, 0.3)}`,
            borderRadius: borderRadius.sm,
          }}
        />
      )}

      {/* Matchup narrative first */}
      {prediction.matchup_narrative && (
        <Box sx={{ mb: 1.5 }}>
          <Box
            onClick={() => setNarrativeExpanded(e => !e)}
            sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
          >
            <Typography variant="caption" color="text.secondary">
              Matchup narrative
            </Typography>
          </Box>
          <Collapse in={narrativeExpanded}>
            <Typography
              variant="body2"
              sx={{
                mt: 0.75,
                pr: prediction.confidence_tier ? 5 : 0,
                lineHeight: 1.6,
                color: 'text.secondary',
                fontStyle: 'italic',
                fontWeight: typography.weight.regular,
                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
              }}
            >
              {prediction.matchup_narrative}
            </Typography>
          </Collapse>
        </Box>
      )}

      {/* Header: logos and matchup (no confidence — shown top-right) */}
      <PredictionHeader prediction={prediction} hideConfidence />

      {/* Summary: large win probability bar + predicted score */}
      <PredictionSummary prediction={prediction} />

      {/* Key drivers as inline pills */}
      {prediction.key_drivers && prediction.key_drivers.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {prediction.key_drivers.map((d, idx) => (
            <Chip
              key={idx}
              label={d.factor}
              size="small"
              sx={{
                height: 26,
                fontSize: '0.75rem',
                fontWeight: typography.weight.medium,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            />
          ))}
        </Box>
      )}

      {/* Predicted score one-liner */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        Predicted: {getTeamAbbreviation(prediction.away_team_name)}{' '}
        {prediction.predicted_away_score.toFixed(0)} —{' '}
        {getTeamAbbreviation(prediction.home_team_name)}{' '}
        {prediction.predicted_home_score.toFixed(0)}
      </Typography>

      {/* Tap to expand risk factors */}
      {prediction.risk_factors && prediction.risk_factors.length > 0 && (
        <Box sx={{ mt: 'auto', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box
            onClick={() => setRiskExpanded(e => !e)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              minHeight: 44,
              py: 0.5,
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#FFB300' }}>
              ⚠ Risk factors
            </Typography>
            <IconButton size="small" sx={{ p: 0.25 }}>
              <ExpandMore
                sx={{
                  transform: riskExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={riskExpanded}>
            <Box sx={{ pt: 1 }}>
              <RiskFactors risks={prediction.risk_factors} defaultExpanded={false} />
            </Box>
          </Collapse>
        </Box>
      )}
    </Paper>
  );
};

export default PredictionCard;
