import React from 'react';
import { Chip, Slide, Fade } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { typography, transitions, borderRadius } from '../theme/designTokens';
import { KeyMoment } from '../types/scoreboard';

interface KeyMomentBadgeProps {
  moment: KeyMoment;
  onClick?: () => void;
}

/**
 * Badge component for displaying key moments on game rows.
 *
 * This shows a small, colorful badge that appears when a key moment is detected in a game.
 * Each moment type gets its own icon and color - like a fire icon for scoring runs, or
 * a trending arrow for lead changes. The badge fades in smoothly when it appears.
 *
 * The badge is small and unobtrusive - it's meant to catch your eye without being distracting.
 * Users can click it if they want more details (though that's optional).
 */
const KeyMomentBadge: React.FC<KeyMomentBadgeProps> = ({ moment, onClick }) => {
  const theme = useTheme();

  // Each moment type gets its own visual style - different icon, label, and color
  // This makes it easy to quickly see what kind of moment happened
  const getMomentConfig = () => {
    switch (moment.type) {
      case 'game_tying_shot':
        return { label: '🏀 Tied', color: '#E8FF47', textColor: '#0A0A0A' };
      case 'lead_change':
        return { label: '🔄 Lead Change', color: '#00BCD4', textColor: '#0A0A0A' };
      case 'scoring_run':
        return { label: '🔥 Run', color: '#FF8A00', textColor: '#0A0A0A' };
      case 'clutch_play':
        return { label: '⚡ Clutch', color: '#9C27B0', textColor: '#F5F5F5' };
      case 'big_shot':
        return { label: '💥 Big Shot', color: '#4CAF50', textColor: '#0A0A0A' };
      default:
        return { label: '🏀 Moment', color: theme.palette.primary.main, textColor: '#0A0A0A' };
    }
  };

  const { label, color, textColor } = getMomentConfig();

  return (
    <Slide in direction="up" timeout={220}>
      <Fade in timeout={220}>
        <Chip
          label={label}
          onClick={onClick}
          size="small"
          sx={{
            height: 22,
            px: 0.25,
            fontSize: '0.7rem',
            fontWeight: typography.weight.semibold,
            backgroundColor: color,
            color: textColor,
            border: `1px solid ${alpha(color, 0.55)}`,
            borderRadius: borderRadius.xs,
            cursor: onClick ? 'pointer' : 'default',
            transition: transitions.normal,
          }}
        />
      </Fade>
    </Slide>
  );
};

export default KeyMomentBadge;
