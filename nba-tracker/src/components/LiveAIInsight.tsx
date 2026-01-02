import React from 'react';
import { Box, Typography, Link, Fade } from '@mui/material';
import { Psychology } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { typography, transitions } from '../theme/designTokens';
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
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        flex: 1,
        minWidth: 0,
        px: 1.5,
        position: 'relative',
      }}
    >
      {/* Subtle left accent line/dot */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 2,
          height: hasInsight ? 16 : 12,
          backgroundColor: accentColor,
          borderRadius: 1,
          opacity: hasInsight ? 0.4 : 0.2,
        }}
      />
      
      {/* Brain/pulse icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: accentColor,
          flexShrink: 0,
        }}
      >
        <Psychology 
          sx={{ 
            fontSize: 14,
            opacity: hasInsight ? 0.7 : 0.4,
          }} 
        />
      </Box>
      
      {/* Insight text or label */}
      {hasInsight ? (
        <Fade in={true} timeout={300}>
          <Typography
            variant="body2"
            sx={{
              fontSize: typography.size.bodySmall,
              color: 'text.secondary',
              fontWeight: typography.weight.regular,
              lineHeight: 1.4,
              flex: 1,
              minWidth: 0,
              transition: transitions.normal,
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
        </Fade>
      ) : (
        <Typography
          variant="caption"
          sx={{
            fontSize: typography.size.captionSmall,
            color: 'text.disabled',
            fontWeight: typography.weight.medium,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: 0.5,
          }}
        >
          AI Insights
        </Typography>
      )}
    </Box>
  );
};

export default LiveAIInsight;

