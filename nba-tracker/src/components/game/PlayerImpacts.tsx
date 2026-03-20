import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { PlayerImpact as PlayerImpactType } from '../../types/gameDetail';
import { typography, borderRadius } from '../../theme/designTokens';

function impactLabelColor(label: string): string {
  switch (label) {
    case 'Dominant':
      return '#E8FF47';
    case 'Strong':
      return '#00D4AA';
    case 'Solid':
      return '#888888';
    default:
      return '#888888';
  }
}

interface PlayerImpactsProps {
  player_impacts: PlayerImpactType[];
}

/**
 * Top 3 player impacts per team: game score, stat line, impact label, highlight.
 * Step 4 will add impact label colors (Dominant = gold, Strong = green, Solid = default).
 */
const PlayerImpacts: React.FC<PlayerImpactsProps> = ({ player_impacts }) => {
  if (!player_impacts || player_impacts.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.lg,
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No player impact data yet.
        </Typography>
      </Paper>
    );
  }

  const homePlayers = player_impacts.filter(p => p.team_side === 'home');
  const awayPlayers = player_impacts.filter(p => p.team_side === 'away');
  const homeTeamName = homePlayers[0]?.team ?? 'Home';
  const awayTeamName = awayPlayers[0]?.team ?? 'Away';

  const renderColumn = (teamLabel: string, players: PlayerImpactType[]) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: typography.weight.bold,
          color: 'text.secondary',
          mb: 1,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {teamLabel}
      </Typography>
      {players.map((p, idx) => (
        <Box
          key={`${p.player_id}-${idx}`}
          sx={{
            py: 1.5,
            borderBottom: idx < players.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"DM Sans", sans-serif' }}>
            {p.player_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {p.highlight}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: typography.weight.bold,
                color: 'primary.main',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '0.75rem',
              }}
            >
              Game Score: {p.game_score}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor:
                  p.impact_label === 'Dominant'
                    ? 'rgba(212, 175, 55, 0.2)'
                    : p.impact_label === 'Strong'
                      ? 'rgba(46, 125, 50, 0.15)'
                      : 'action.selected',
                color: impactLabelColor(p.impact_label),
                fontWeight: typography.weight.semibold,
              }}
            >
              {p.impact_label}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.lg,
        backgroundColor: 'background.paper',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: typography.weight.bold,
          mb: 1.5,
          fontSize: '0.9375rem',
        }}
      >
        Top performers
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {renderColumn(awayTeamName, awayPlayers)}
        {renderColumn(homeTeamName, homePlayers)}
      </Box>
    </Paper>
  );
};

export default PlayerImpacts;
