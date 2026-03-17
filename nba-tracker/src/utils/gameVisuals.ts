/**
 * Live game visual treatment — pulse animation and live indicator dot.
 * Apply LIVE_DOT_STYLE to live game cards, game detail header, and bottom nav Scores badge.
 */

import type { SxProps, Theme } from '@mui/material';

export const LIVE_PULSE: SxProps<Theme> = {
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
};

export const LIVE_DOT_STYLE: SxProps<Theme> = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: 'error.main',
  flexShrink: 0,
  ...LIVE_PULSE,
};
