import React from 'react';
import { Box, Typography, Link, Fade } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { AutoAwesome } from '@mui/icons-material';
import { typography, transitions, borderRadius } from '../theme/designTokens';
import { GameInsightData } from './GameInsight';

interface LiveAIInsightProps {
  insight: GameInsightData | null;
  onWhyClick?: () => void;
}

/**
 * Minimal inline AI insight for live game status bar.
 * Displays in the center zone between play-by-play and action buttons.
 * ESPN/Apple Sports style: calm, informative, invisible when not needed.
 */
const LiveAIInsight: React.FC<LiveAIInsightProps> = ({ insight, onWhyClick }) => {
  const theme = useTheme();
  
  const hasInsight = insight && insight.type !== 'none' && insight.text;
  
  // Muted accent color (low saturation)
  const accentColor = alpha(theme.palette.primary.main, 0.6);
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0.75,
        flex: 1,
        minWidth: 0,
        px: 2,
        py: 1,
      }}
    >
      {/* AI Insights label - always visible */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          minWidth: { xs: 60, sm: 70 },
          pt: 0.5,
        }}
      >
        <AutoAwesome 
          sx={{ 
            fontSize: { xs: 14, sm: 16 }, 
            color: 'primary.main',
            opacity: 0.9,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.9 },
              '50%': { opacity: 0.6 },
            },
          }} 
        />
        <Typography
          variant="caption"
          sx={{
            fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
            fontWeight: typography.weight.semibold,
            color: 'text.secondary',
          }}
        >
          AI Insights
        </Typography>
      </Box>
      
      {/* Insight text - shown when available */}
      {hasInsight && (
        <Fade in={true} timeout={300}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              px: 1.5,
              py: 0.75,
              borderRadius: borderRadius.xs,
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
              transition: transitions.normal,
              width: '100%',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.9375rem',
                color: 'text.primary',
                fontWeight: typography.weight.semibold,
                lineHeight: 1.5,
              }}
            >
              {insight.text}
              {insight.type === 'lead_change' && onWhyClick && (
                <>
                  {' '}
                  <Link
                    component="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhyClick();
                    }}
                    sx={{
                      color: accentColor,
                      textDecoration: 'none',
                      fontSize: 'inherit',
                      fontWeight: typography.weight.medium,
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                        opacity: 0.8,
                      },
                    }}
                  >
                    Why?
                  </Link>
                </>
              )}
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default LiveAIInsight;

