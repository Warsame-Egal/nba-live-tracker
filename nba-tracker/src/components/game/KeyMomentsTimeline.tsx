import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { KeyMomentDict } from '../../types/gameDetail';
import { borderRadius } from '../../theme/designTokens';
import { getTeamColorsByTricode } from '../../utils/teamColors';

const MOMENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  game_tying_shot: { label: 'Game Tied', color: '#FFD700', icon: '🏀' },
  lead_change: { label: 'Lead Change', color: '#00BCD4', icon: '🔄' },
  scoring_run: { label: 'Scoring Run', color: '#FF5722', icon: '🔥' },
  clutch_play: { label: 'Clutch Play', color: '#9C27B0', icon: '⚡' },
  big_shot: { label: 'Big Shot', color: '#4CAF50', icon: '💥' },
};

interface KeyMomentsTimelineProps {
  moments: KeyMomentDict[];
  gameId: string;
}

function formatQuarterTime(period?: number, clock?: string): string {
  if (period == null) return '';
  const q = period <= 4 ? `Q${period}` : 'OT';
  if (!clock) return q;
  return `${q} ${clock}`;
}

/**
 * Vertical timeline feed of key moments. Each card shows quarter+time, icon+type in accent color,
 * player/action, and AI context with a subtle left border in the moment type color.
 */
const KeyMomentsTimeline: React.FC<KeyMomentsTimelineProps> = ({ moments }) => {
  if (!moments || moments.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.lg,
          textAlign: 'center',
        }}
      >
        <Typography color="text.secondary">
          Key moments are detected during live games (lead changes, big shots, clutch plays). For
          past games, moments are only shown if the game was followed live.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {moments.map((m, i) => {
        const typeKey = (m.type ?? '') as keyof typeof MOMENT_CONFIG;
        const config = MOMENT_CONFIG[typeKey] ?? {
          label: (m.type ?? 'Key moment').replace(/_/g, ' '),
          color: '#757575',
          icon: '🏀',
        };
        const play = (m.play ?? {}) as {
          period?: number;
          clock?: string;
          description?: string;
          player_name?: string;
          action_type?: string;
          score_home?: string;
          score_away?: string;
          team_tricode?: string;
        };
        const quarterTime = formatQuarterTime(play.period, play.clock);
        const description = play.description ?? 'Key moment';
        const scoreStr =
          play.score_away != null && play.score_home != null
            ? `${play.score_away}–${play.score_home}`
            : null;
        const teamColor = play.team_tricode
          ? getTeamColorsByTricode(String(play.team_tricode)).primary
          : config.color;

        return (
          <Paper
            key={i}
            elevation={0}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: borderRadius.lg,
              border: '1px solid',
              borderColor: 'divider',
              borderLeft: '4px solid',
              borderLeftColor: teamColor,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 2 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', flexShrink: 0, minWidth: 56 }}
              >
                {quarterTime}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <Typography component="span" sx={{ fontSize: '1rem' }}>
                    {config.icon}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: config.color }}>
                    {config.label}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {description}
                </Typography>
                {scoreStr && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.25 }}
                  >
                    Score: {scoreStr}
                  </Typography>
                )}
                {m.context && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 1,
                      fontStyle: 'italic',
                      color: 'text.secondary',
                      lineHeight: 1.4,
                    }}
                  >
                    {m.context}
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
};

export default KeyMomentsTimeline;
