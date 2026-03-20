import React from 'react';
import { Box, Typography, Avatar, Paper, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Game } from '../../types/scoreboard';
import { GameSummary } from '../../types/schedule';
import { TEAM_LOGOS } from '../../utils/gameUtils';
import { borderRadius, transitions, shadows } from '../../theme/designTokens';

interface CompletedGameCardProps {
  game: Game | GameSummary;
  onClick?: () => void;
  isRecentlyUpdated?: boolean;
}

const CompletedGameCard: React.FC<CompletedGameCardProps> = ({ game, onClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isLiveGame = 'homeTeam' in game;
  const gameId = isLiveGame ? game.gameId : game.game_id;
  const homeTeam = isLiveGame ? game.homeTeam?.teamTricode : game.home_team?.team_abbreviation;
  const awayTeam = isLiveGame ? game.awayTeam?.teamTricode : game.away_team?.team_abbreviation;
  const homeId = isLiveGame ? game.homeTeam?.teamId : game.home_team?.team_id;
  const awayId = isLiveGame ? game.awayTeam?.teamId : game.away_team?.team_id;
  const homeScore = isLiveGame ? (game.homeTeam?.score ?? 0) : (game.home_team?.points ?? 0);
  const awayScore = isLiveGame ? (game.awayTeam?.score ?? 0) : (game.away_team?.points ?? 0);
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  const gameLeaders = isLiveGame
    ? 'gameLeaders' in game
      ? game.gameLeaders
      : null
    : 'gameLeaders' in game
      ? (game as GameSummary).gameLeaders
      : null;
  const topPerformer =
    gameLeaders?.homeLeaders || gameLeaders?.awayLeaders
      ? (gameLeaders.homeLeaders?.points ?? 0) >= (gameLeaders.awayLeaders?.points ?? 0)
        ? gameLeaders.homeLeaders
        : gameLeaders.awayLeaders
      : null;

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
        backgroundColor: '#111111',
        border: '1px solid #222222',
        overflow: 'hidden',
        boxShadow: theme.palette.mode === 'dark' ? shadows.dark.sm : shadows.sm,
        transition: transitions.smooth,
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark' ? shadows.dark.md : shadows.md,
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
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <Box sx={{ minWidth: 56, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.08em' }}>
            FINAL
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Avatar
            src={TEAM_LOGOS[awayTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={awayTeam}
            onClick={e => handleTeamClick(e, awayId)}
            sx={{ width: 32, height: 32, cursor: awayId ? 'pointer' : 'default' }}
          />
          <Typography
            variant="body2"
            fontWeight={awayWon ? 700 : 600}
            color={awayWon ? 'text.primary' : 'text.secondary'}
            noWrap
          >
            {awayTeam}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: awayWon ? 700 : 600,
              fontSize: '1.125rem',
              minWidth: 36,
              textAlign: 'right',
              color: awayWon ? 'text.primary' : 'text.secondary',
              textDecoration: awayWon ? 'none' : 'line-through',
            }}
          >
            {awayScore}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Avatar
            src={TEAM_LOGOS[homeTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={homeTeam}
            onClick={e => handleTeamClick(e, homeId)}
            sx={{ width: 32, height: 32, cursor: homeId ? 'pointer' : 'default' }}
          />
          <Typography
            variant="body2"
            fontWeight={homeWon ? 700 : 600}
            color={homeWon ? 'text.primary' : 'text.secondary'}
            noWrap
          >
            {homeTeam}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: homeWon ? 700 : 600,
              fontSize: '1.125rem',
              minWidth: 36,
              textAlign: 'right',
              color: homeWon ? 'text.primary' : 'text.secondary',
              textDecoration: homeWon ? 'none' : 'line-through',
            }}
          >
            {homeScore}
          </Typography>
        </Box>
      </Box>

      {topPerformer && topPerformer.name && (
        <Box
          sx={{
            px: 1.5,
            pb: 1,
            pt: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Top: {topPerformer.name} — {Math.round(topPerformer.points)} PTS
            {typeof topPerformer.rebounds === 'number' &&
              ` ${Math.round(topPerformer.rebounds)} REB`}
            {typeof topPerformer.assists === 'number' && ` ${Math.round(topPerformer.assists)} AST`}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CompletedGameCard;
