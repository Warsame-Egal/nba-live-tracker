import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Insights, TrendingUp, TrendingDown, Close, QuestionMark } from '@mui/icons-material';
import { typography, borderRadius, transitions } from '../theme/designTokens';
import { useTheme, alpha } from '@mui/material/styles';

export interface GameInsightData {
  game_id: string;
  type: 'momentum' | 'lead_change' | 'run' | 'close_game' | 'blowout' | 'none';
  text: string;
}

interface GameInsightProps {
  insight: GameInsightData;
  onLeadChangeClick?: () => void;
  onDismiss?: () => void;
}

/**
 * Inline AI insight component for live game cards.
 * Displays subtle insights with icon and accent border.
 */
const GameInsight: React.FC<GameInsightProps> = ({ insight, onLeadChangeClick, onDismiss }) => {
  const theme = useTheme();
  
  // Don't render if type is "none" or no text
  if (insight.type === 'none' || !insight.text) {
    return null;
  }

  // Get icon based on insight type
  const getIcon = () => {
    switch (insight.type) {
      case 'momentum':
      case 'run':
        return <TrendingUp sx={{ fontSize: 16 }} />;
      case 'lead_change':
        return <TrendingDown sx={{ fontSize: 16 }} />;
      case 'close_game':
        return <Insights sx={{ fontSize: 16 }} />;
      case 'blowout':
        return <TrendingDown sx={{ fontSize: 16 }} />;
      default:
        return <Insights sx={{ fontSize: 16 }} />;
    }
  };

  // Get accent color based on type
  const getAccentColor = () => {
    switch (insight.type) {
      case 'momentum':
      case 'run':
        return theme.palette.success.main;
      case 'lead_change':
        return theme.palette.warning.main;
      case 'close_game':
        return theme.palette.info.main;
      case 'blowout':
        return theme.palette.error.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const accentColor = getAccentColor();
  const isLeadChange = insight.type === 'lead_change';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        px: { xs: 1.5, sm: 2 },
        py: 1,
        mx: { xs: 1.5, sm: 2 },
        mb: 1,
        backgroundColor: 'background.paper',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: borderRadius.sm,
        border: '1px solid',
        borderColor: 'divider',
        transition: transitions.normal,
        '&:hover': {
          borderColor: accentColor,
          backgroundColor: alpha(accentColor, 0.04),
        },
      }}
      role="region"
      aria-label="Game insight"
    >
      {/* Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 20,
          mt: 0.25,
          color: accentColor,
        }}
      >
        {getIcon()}
      </Box>

      {/* Insight Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: typography.size.bodySmall,
            fontWeight: typography.weight.medium,
            color: 'text.primary',
            lineHeight: 1.5,
          }}
        >
          {insight.text}
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
        {isLeadChange && onLeadChangeClick && (
          <Tooltip title="Why did the lead change?" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onLeadChangeClick();
              }}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': {
                  color: accentColor,
                  backgroundColor: alpha(accentColor, 0.08),
                },
              }}
              aria-label="Explain lead change"
            >
              <QuestionMark sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
        {onDismiss && (
          <Tooltip title="Dismiss" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  backgroundColor: 'action.hover',
                },
              }}
              aria-label="Dismiss insight"
            >
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default GameInsight;

