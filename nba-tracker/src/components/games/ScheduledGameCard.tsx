import React from 'react';
import { Box, Typography, Avatar, Paper, Button, alpha, useTheme } from '@mui/material';
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
          gap: 2,
          p: { xs: 2, sm: 2.5 },
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        {/* Time column */}
        <Box sx={{ minWidth: 52, textAlign: 'center', flexShrink: 0 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8125rem' }}
          >
            {gameTime}
          </Typography>
        </Box>

        {/* Teams stacked — away top, home bottom */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={TEAM_LOGOS[awayTeam || 'NBA'] || TEAM_LOGOS['NBA']}
              alt={awayTeam}
              onClick={e => handleTeamClick(e, awayId)}
              sx={{ width: 32, height: 32, flexShrink: 0, cursor: awayId ? 'pointer' : 'default' }}
            />
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem' }}
            >
              {awayTeam}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={TEAM_LOGOS[homeTeam || 'NBA'] || TEAM_LOGOS['NBA']}
              alt={homeTeam}
              onClick={e => handleTeamClick(e, homeId)}
              sx={{ width: 32, height: 32, flexShrink: 0, cursor: homeId ? 'pointer' : 'default' }}
            />
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem' }}
            >
              {homeTeam}
            </Typography>
          </Box>
        </Box>

        {/* Win probability bar (right side, if available) */}
        {homeWinPercent != null && !isNaN(homeWinPercent) && (
          <Box sx={{ width: 48, flexShrink: 0 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 40,
                borderRadius: 0.5,
                overflow: 'hidden',
                gap: '2px',
              }}
            >
              <Box
                sx={{
                  flex: 1 - homeWinPercent,
                  bgcolor: alpha(theme.palette.text.secondary, 0.25),
                  borderRadius: 0.5,
                }}
              />
              <Box sx={{ flex: homeWinPercent, bgcolor: 'primary.main', borderRadius: 0.5 }} />
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer — same structure as LiveGameCard for consistent height */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          View Game
        </Button>
      </Box>
    </Paper>
  );
};

export default ScheduledGameCard;
