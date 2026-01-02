import React from 'react';
import { Chip, Fade } from '@mui/material';
import { Whatshot, TrendingUp, SwapHoriz, SportsBasketball, FlashOn } from '@mui/icons-material';
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
        return { icon: SwapHoriz, label: 'Tied', color: theme.palette.warning.main };
      case 'lead_change':
        return { icon: TrendingUp, label: 'Lead Change', color: theme.palette.primary.main };
      case 'scoring_run':
        return { icon: Whatshot, label: 'Run', color: theme.palette.error.main };
      case 'clutch_play':
        return { icon: FlashOn, label: 'Clutch', color: theme.palette.secondary.main };
      case 'big_shot':
        return { icon: SportsBasketball, label: 'Big Shot', color: theme.palette.info.main };
      default:
        return { icon: Whatshot, label: 'Key Moment', color: theme.palette.primary.main };
    }
  };
  
  const { icon: Icon, label, color } = getMomentConfig();
  const mutedColor = alpha(color, 0.8);
  
  return (
    <Fade in={true} timeout={300}>
      <Chip
        icon={<Icon sx={{ fontSize: 14, color: mutedColor }} />}
        label={label}
        onClick={onClick}
        size="small"
        sx={{
          height: 24,
          fontSize: typography.size.captionSmall,
          fontWeight: typography.weight.semibold,
          backgroundColor: alpha(color, 0.1),
          color: mutedColor,
          border: `1px solid ${alpha(color, 0.3)}`,
          borderRadius: borderRadius.xs,
          cursor: onClick ? 'pointer' : 'default',
          transition: transitions.normal,
          '&:hover': onClick ? {
            backgroundColor: alpha(color, 0.2),
            borderColor: alpha(color, 0.5),
          } : {},
          '& .MuiChip-icon': {
            marginLeft: 0.5,
          },
        }}
      />
    </Fade>
  );
};

export default KeyMomentBadge;

