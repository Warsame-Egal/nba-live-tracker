import React, { useMemo } from 'react';
import { Box, Typography, Link, Fade } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { typography } from '../theme/designTokens';
import { GameInsightData } from './GameInsight';

interface LiveAIInsightProps {
  insight: GameInsightData | null;
  onWhyClick?: () => void;
}

/**
 * Parse insight text into short, declarative statements for play-by-play style presentation.
 * Splits on periods, semicolons, and natural sentence breaks.
 */
const parseInsightText = (text: string): string[] => {
  if (!text) return [];
  
  // Split on periods, semicolons, and exclamation marks
  const sentences = text
    .split(/[.;!]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // If we have multiple sentences, return them as separate statements
  if (sentences.length > 1) {
    return sentences;
  }
  
  // If single sentence but long, try to split on commas if it's very long
  if (text.length > 120) {
    const parts = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (parts.length > 1 && parts.every(p => p.length < 80)) {
      return parts;
    }
  }
  
  // Return as single statement
  return [text];
};

/**
 * Minimal inline AI insight for live game status bar.
 * Play-by-play style: short, declarative statements with clean rhythm.
 * ESPN/Apple Sports style: calm, informative, contextual commentary.
 */
const LiveAIInsight: React.FC<LiveAIInsightProps> = ({ insight, onWhyClick }) => {
  const theme = useTheme();
  
  const hasInsight = insight && insight.type !== 'none' && insight.text;
  
  // Parse insight text into short statements
  const statements = useMemo(() => {
    if (!hasInsight || !insight.text) return [];
    return parseInsightText(insight.text);
  }, [hasInsight, insight?.text]);
  
  // Muted accent color (low saturation)
  const accentColor = alpha(theme.palette.primary.main, 0.6);
  
  if (!hasInsight) {
    return null;
  }
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1,
        minWidth: 0,
        px: 2,
        py: 1,
      }}
    >
      <Fade in={true} timeout={300}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 0.75, sm: 1 },
            width: '100%',
            position: 'relative',
            pl: { xs: 1.5, sm: 2 },
            // Subtle left border accent
            borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          {statements.map((statement, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              {/* Subtle bullet indicator */}
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: alpha(theme.palette.primary.main, 0.4),
                  mt: { xs: 0.5, sm: 0.625 },
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  color: 'text.primary',
                  fontWeight: typography.weight.regular,
                  lineHeight: 1.4,
                  letterSpacing: typography.letterSpacing.normal,
                }}
              >
                {statement}
                {index === statements.length - 1 && insight.type === 'lead_change' && onWhyClick && (
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
                        ml: 0.5,
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
          ))}
        </Box>
      </Fade>
    </Box>
  );
};

export default LiveAIInsight;

