import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Button,
  Chip,
  Collapse,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import { ChatBubbleOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Game } from '../../types/scoreboard';
import { GameSummary } from '../../types/schedule';
import { TEAM_LOGOS, getStatusLabel } from '../../utils/gameUtils';
import { LIVE_DOT_STYLE } from '../../utils/gameVisuals';
import { borderRadius, transitions, shadows } from '../../theme/designTokens';
import KeyMomentBadge from '../KeyMomentBadge';
import { KeyMoment, WinProbability } from '../../types/scoreboard';
import { GameInsightData } from '../GameInsight';

interface LiveGameCardProps {
  game: Game | GameSummary;
  onClick?: () => void;
  isRecentlyUpdated?: boolean;
  keyMoment?: KeyMoment | null;
  winProbability?: WinProbability | null;
  insight?: GameInsightData | null;
  onInsightExpand?: () => void;
}

const LiveGameCard: React.FC<LiveGameCardProps> = ({
  game,
  onClick,
  isRecentlyUpdated = false,
  keyMoment,
  winProbability,
  insight,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [insightExpanded, setInsightExpanded] = useState(false);
  const hasInsight = insight && insight.type !== 'none' && insight.text;
  const isLiveGame = 'homeTeam' in game;
  const gameId = isLiveGame ? game.gameId : game.game_id;
  const homeTeam = isLiveGame ? game.homeTeam?.teamTricode : game.home_team?.team_abbreviation;
  const awayTeam = isLiveGame ? game.awayTeam?.teamTricode : game.away_team?.team_abbreviation;
  const homeScore = isLiveGame ? (game.homeTeam?.score ?? 0) : (game.home_team?.points ?? 0);
  const awayScore = isLiveGame ? (game.awayTeam?.score ?? 0) : (game.away_team?.points ?? 0);
  const homeId = isLiveGame ? game.homeTeam?.teamId : game.home_team?.team_id;
  const awayId = isLiveGame ? game.awayTeam?.teamId : game.away_team?.team_id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
    else navigate(`/game/${gameId}`);
  };

  const handleTeamClick = (e: React.MouseEvent, teamId?: number | null) => {
    e.stopPropagation();
    if (teamId) navigate(`/team/${teamId}`);
  };

  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
        transition: transitions.smooth,
        borderLeft: '3px solid',
        borderLeftColor: 'error.main',
        '@keyframes livePulse': {
          '0%, 100%': { borderLeftColor: 'error.main' },
          '50%': { borderLeftColor: 'error.light' },
        },
        animation: 'livePulse 2s ease-in-out infinite',
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark' ? shadows.dark.lg : shadows.lg,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          p: { xs: 1.5, sm: 2 },
          cursor: 'pointer',
          backgroundColor: isRecentlyUpdated
            ? alpha(theme.palette.primary.main, 0.06)
            : 'transparent',
          transition: transitions.normal,
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <Box
          sx={{
            minWidth: 56,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Box sx={LIVE_DOT_STYLE} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'error.main',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {getStatusLabel(game)}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 1.5 },
            flex: 1,
            minWidth: 0,
          }}
        >
          <Avatar
            src={TEAM_LOGOS[awayTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={awayTeam}
            onClick={e => handleTeamClick(e, awayId)}
            sx={{ width: 36, height: 36, cursor: awayId ? 'pointer' : 'default' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {awayTeam}
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.25rem',
              minWidth: 40,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {awayScore}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 1.5 },
            flex: 1,
            minWidth: 0,
          }}
        >
          <Avatar
            src={TEAM_LOGOS[homeTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={homeTeam}
            onClick={e => handleTeamClick(e, homeId)}
            sx={{ width: 36, height: 36, cursor: homeId ? 'pointer' : 'default' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {homeTeam}
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.25rem',
              minWidth: 40,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {homeScore}
          </Typography>
        </Box>
      </Box>

      {(keyMoment || winProbability) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {winProbability && (
            <Fade in timeout={300}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: borderRadius.xs,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  height: 24,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    width: 32,
                    height: 4,
                    borderRadius: borderRadius.xs,
                    overflow: 'hidden',
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  }}
                >
                  <Box
                    sx={{
                      flex: winProbability.away_win_prob,
                      backgroundColor: alpha(theme.palette.primary.main, 0.6),
                    }}
                  />
                  <Box
                    sx={{
                      flex: winProbability.home_win_prob,
                      backgroundColor: theme.palette.primary.main,
                    }}
                  />
                </Box>
                <Typography variant="caption" fontWeight={600} color="primary.main">
                  {winProbability.home_win_prob > winProbability.away_win_prob
                    ? `${(winProbability.home_win_prob * 100).toFixed(0)}%`
                    : `${(winProbability.away_win_prob * 100).toFixed(0)}%`}
                </Typography>
              </Box>
            </Fade>
          )}
          {keyMoment && <KeyMomentBadge moment={keyMoment} />}
        </Box>
      )}

      <Box
        sx={{
          px: 1.5,
          pb: 1.5,
          pt: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 0.5,
        }}
      >
        {hasInsight && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Chip
              size="small"
              icon={<ChatBubbleOutline sx={{ fontSize: 14 }} />}
              label="AI insight"
              onClick={e => {
                e.stopPropagation();
                setInsightExpanded(prev => !prev);
              }}
              sx={{
                height: 24,
                fontSize: '0.75rem',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
            <Collapse in={insightExpanded}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  mt: 0.5,
                  lineHeight: 1.4,
                }}
              >
                {insight!.text}
              </Typography>
            </Collapse>
          </Box>
        )}
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          sx={{
            borderRadius: borderRadius.sm,
            textTransform: 'none',
            fontWeight: 600,
            ml: hasInsight ? 0 : 'auto',
          }}
        >
          View Game
        </Button>
      </Box>
    </Paper>
  );
};

export default LiveGameCard;
