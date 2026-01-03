import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Analytics,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import { typography, borderRadius } from '../theme/designTokens';
import { GamePrediction } from '../types/predictions';
import { getTeamAbbreviation, getTeamLogo } from '../utils/teamMappings';
import ConfidenceMeter from './predictions/ConfidenceMeter';
import KeyDrivers from './predictions/KeyDrivers';
import RiskFactors from './predictions/RiskFactors';
import MatchupNarrative from './predictions/MatchupNarrative';

interface PredictionCardProps {
  prediction: GamePrediction;
}

/**
 * Detailed prediction card showing win probability, projected score, and AI insights.
 * Displays all prediction data in an expandable card format.
 */
const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const theme = useTheme();
  const [insightsExpanded, setInsightsExpanded] = useState(true);
  
  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  const homeLogo = getTeamLogo(prediction.home_team_name);
  const awayLogo = getTeamLogo(prediction.away_team_name);
  
  const homeWinProb = prediction.home_win_probability * 100;
  const awayWinProb = prediction.away_win_probability * 100;
  
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: borderRadius.md,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 24px rgba(0, 0, 0, 0.5)' 
            : '0 4px 12px rgba(0, 0, 0, 0.15)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 3 }}>
        {/* Header: Teams + Confidence Badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={awayLogo}
              alt={awayAbbr}
              sx={{ width: 32, height: 32 }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: '0.875rem',
              }}
            >
              {awayAbbr}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              @
            </Typography>
            <Avatar
              src={homeLogo}
              alt={homeAbbr}
              sx={{ width: 32, height: 32 }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: '0.875rem',
              }}
            >
              {homeAbbr}
            </Typography>
          </Box>
          {prediction.confidence_tier && (
            <Chip
              label={prediction.confidence_tier.toUpperCase()}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.6875rem',
                fontWeight: typography.weight.semibold,
                textTransform: 'uppercase',
                backgroundColor: alpha(
                  prediction.confidence_tier === 'high' 
                    ? theme.palette.success.main 
                    : prediction.confidence_tier === 'medium'
                    ? theme.palette.warning.main
                    : theme.palette.error.main,
                  0.15
                ),
                color: prediction.confidence_tier === 'high' 
                  ? theme.palette.success.main 
                  : prediction.confidence_tier === 'medium'
                  ? theme.palette.warning.main
                  : theme.palette.error.main,
              }}
            />
          )}
        </Box>
        
        {/* Core Metrics (Prominent) */}
        <Box sx={{ mb: 3 }}>
          {/* Win Probability */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 1.5,
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Win Probability
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {awayAbbr}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: typography.weight.semibold,
                      fontSize: '0.875rem',
                    }}
                  >
                    {awayWinProb.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={awayWinProb}
                  sx={{
                    height: 6,
                    borderRadius: borderRadius.xs,
                    backgroundColor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.5),
                      borderRadius: borderRadius.xs,
                    },
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {homeAbbr}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: typography.weight.semibold,
                      fontSize: '0.875rem',
                    }}
                  >
                    {homeWinProb.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={homeWinProb}
                  sx={{
                    height: 6,
                    borderRadius: borderRadius.xs,
                    backgroundColor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: borderRadius.xs,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
          
          {/* Predicted Score */}
          <Box
            sx={{
              p: 2,
              borderRadius: borderRadius.sm,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 1.5,
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Predicted Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: '1.75rem',
                  }}
                >
                  {prediction.predicted_away_score.toFixed(0)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {awayAbbr}
                </Typography>
              </Box>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: '1.25rem' }}
              >
                -
              </Typography>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: typography.weight.bold,
                    fontSize: '1.75rem',
                  }}
                >
                  {prediction.predicted_home_score.toFixed(0)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {homeAbbr}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          {/* Confidence Meter */}
          {prediction.confidence !== undefined && (
            <Box sx={{ mt: 2.5 }}>
              <ConfidenceMeter
                confidence={prediction.confidence}
                tier={prediction.confidence_tier}
                explanation={prediction.confidence_explanation}
              />
            </Box>
          )}
        </Box>
        
        {/* AI Insights Panel (Collapsible) */}
        <Box sx={{ mb: 2 }}>
          <Box
            onClick={() => setInsightsExpanded(!insightsExpanded)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.5,
              cursor: 'pointer',
              p: 1,
              borderRadius: borderRadius.sm,
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
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                AI Insights
              </Typography>
            </Box>
            <IconButton size="small" sx={{ p: 0.5 }}>
              {insightsExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={insightsExpanded}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'text.secondary',
                      mb: 1,
                    }}
                  >
                    Additional Insights
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                                fontSize: '0.8125rem',
                                color: 'text.primary',
                              }}
                            >
                              {insight.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontSize: '0.75rem',
                                lineHeight: 1.4,
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
        
        {/* Last Updated Timestamp */}
        <Box
          sx={{
            mt: 'auto',
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.6875rem',
              fontStyle: 'italic',
            }}
          >
            Last updated: {format(new Date(), 'MMM d, h:mm a')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PredictionCard;

