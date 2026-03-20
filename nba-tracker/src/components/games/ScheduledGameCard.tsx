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

const ScheduledGameCard: React.FC<ScheduledGameCardProps> = ({ game, onClick, homeWinPercent }) => {
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
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark' ? shadows.dark.sm : shadows.sm,
        transition: transitions.smooth,
        opacity: 0.92,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
          transform: { md: 'translateY(-2px)' },
          opacity: 1,
          backgroundColor: 'action.hover',
        },
      }}
    >
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          p: { xs: 2, sm: 2.5 },
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <Box sx={{ minWidth: 56, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem' }}>
            {gameTime}
          </Typography>
        </Box>

        {/* Teams stacked */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={TEAM_LOGOS[awayTeam || 'NBA'] || TEAM_LOGOS['NBA']}
              alt={awayTeam}
              onClick={e => handleTeamClick(e, awayId)}
              sx={{ width: 28, height: 28, flexShrink: 0, cursor: awayId ? 'pointer' : 'default' }}
            />
            <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
              {awayTeam}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={TEAM_LOGOS[homeTeam || 'NBA'] || TEAM_LOGOS['NBA']}
              alt={homeTeam}
              onClick={e => handleTeamClick(e, homeId)}
              sx={{ width: 28, height: 28, flexShrink: 0, cursor: homeId ? 'pointer' : 'default' }}
            />
            <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
              {homeTeam}
            </Typography>
          </Box>
        </Box>

        {homeWinPercent != null && !isNaN(homeWinPercent) && (
          <Box
            sx={{
              width: 56,
            }}
          >
            <Box sx={{ display: 'flex', width: '100%', height: 3, borderRadius: 999, overflow: 'hidden' }}>
              <Box sx={{ flex: 1 - homeWinPercent, bgcolor: alpha(theme.palette.text.secondary, 0.35) }} />
              <Box sx={{ flex: homeWinPercent, bgcolor: 'primary.main' }} />
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ScheduledGameCard;
