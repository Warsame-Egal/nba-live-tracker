import React from 'react';
import { Box, Typography, Avatar, Paper, alpha, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Game } from '../../types/scoreboard';
import { GameSummary } from '../../types/schedule';
import { TEAM_LOGOS, getGameTime } from '../../utils/gameUtils';
import { borderRadius, transitions, shadows } from '../../theme/designTokens';

interface ScheduledGameCardProps {
  game: Game | GameSummary;
  onClick?: () => void;
  /** Optional prediction win % for home team (0–1) to show e.g. "65% home" */
  homeWinPercent?: number | null;
}

const ScheduledGameCard: React.FC<ScheduledGameCardProps> = ({
  game,
  onClick,
  homeWinPercent,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isLiveGame = 'homeTeam' in game;
  const gameId = isLiveGame ? game.gameId : game.game_id;
  const homeTeam = isLiveGame ? game.homeTeam?.teamTricode : game.home_team?.team_abbreviation;
  const awayTeam = isLiveGame ? game.awayTeam?.teamTricode : game.away_team?.team_abbreviation;
  const homeId = isLiveGame ? game.homeTeam?.teamId : game.home_team?.team_id;
  const awayId = isLiveGame ? game.awayTeam?.teamId : game.away_team?.team_id;
  const gameTime = getGameTime(game);

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
      elevation={1}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark' ? shadows.dark.sm : shadows.sm,
        transition: transitions.smooth,
        opacity: 0.9,
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
          transform: 'translateY(-2px)',
          opacity: 1,
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
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <Box sx={{ minWidth: 56, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {gameTime}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Avatar
            src={TEAM_LOGOS[awayTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={awayTeam}
            onClick={e => handleTeamClick(e, awayId)}
            sx={{ width: 32, height: 32, cursor: awayId ? 'pointer' : 'default' }}
          />
          <Typography variant="body2" fontWeight={600} noWrap>
            {awayTeam}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          @
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Avatar
            src={TEAM_LOGOS[homeTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={homeTeam}
            onClick={e => handleTeamClick(e, homeId)}
            sx={{ width: 32, height: 32, cursor: homeId ? 'pointer' : 'default' }}
          />
          <Typography variant="body2" fontWeight={600} noWrap>
            {homeTeam}
          </Typography>
        </Box>

        {homeWinPercent != null && !isNaN(homeWinPercent) && (
          <Box
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: borderRadius.xs,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <Typography variant="caption" fontWeight={700} color="primary.main">
              {(homeWinPercent * 100).toFixed(0)}%
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ScheduledGameCard;
