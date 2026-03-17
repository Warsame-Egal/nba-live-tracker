import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import type { GamePrediction } from '../types/predictions';
import { getTeamAbbreviation } from '../utils/teamMappings';

interface MiniPredictionRowProps {
  prediction: GamePrediction;
}

/**
 * Compact inline prediction row for scoreboard sidebar: away abbr, win prob bar, home abbr.
 */
const MiniPredictionRow: React.FC<MiniPredictionRowProps> = ({ prediction }) => {
  const homeAbbr = getTeamAbbreviation(prediction.home_team_name);
  const awayAbbr = getTeamAbbreviation(prediction.away_team_name);
  const homePct = prediction.home_win_probability * 100;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28 }}>
        {awayAbbr}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={homePct}
          sx={{ flex: 1, height: 6, borderRadius: 3 }}
        />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28, textAlign: 'right' }}>
        {homeAbbr}
      </Typography>
    </Box>
  );
};

export default MiniPredictionRow;
