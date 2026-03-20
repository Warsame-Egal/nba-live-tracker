import React from 'react';
import { Box, Typography, Avatar, Button, Paper, useTheme } from '@mui/material';
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
        borderRadius: borderRadius.md,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
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
          gap: 2,
          p: { xs: 2, sm: 2.5 },
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        {/* FINAL label */}
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            letterSpacing: '0.08em',
            width: 40,
            flexShrink: 0,
            textAlign: 'center',
          }}
        >
          FINAL
        </Typography>

        {/* Teams stacked — away top, home bottom */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {/* Away row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={TEAM_LOGOS[awayTeam || 'NBA'] || TEAM_LOGOS['NBA']}
              alt={awayTeam}
              onClick={e => handleTeamClick(e, awayId)}
              sx={{ width: 32, height: 32, flexShrink: 0, cursor: awayId ? 'pointer' : 'default' }}
            />
            <Typography
              variant="body2"
              fontWeight={awayWon ? 700 : 500}
              color={awayWon ? 'text.primary' : 'text.secondary'}
              noWrap
              sx={{ flex: 1, minWidth: 0 }}
            >
              {awayTeam}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: awayWon ? 800 : 500,
                fontSize: { xs: '1.25rem', sm: '1.375rem' },
                color: awayWon ? 'text.primary' : 'text.secondary',
                minWidth: 44,
                textAlign: 'right',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {awayScore}
            </Typography>
          </Box>

          {/* Home row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              src={TEAM_LOGOS[homeTeam || 'NBA'] || TEAM_LOGOS['NBA']}
              alt={homeTeam}
              onClick={e => handleTeamClick(e, homeId)}
              sx={{ width: 32, height: 32, flexShrink: 0, cursor: homeId ? 'pointer' : 'default' }}
            />
            <Typography
              variant="body2"
              fontWeight={homeWon ? 700 : 500}
              color={homeWon ? 'text.primary' : 'text.secondary'}
              noWrap
              sx={{ flex: 1, minWidth: 0 }}
            >
              {homeTeam}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: homeWon ? 800 : 500,
                fontSize: { xs: '1.25rem', sm: '1.375rem' },
                color: homeWon ? 'text.primary' : 'text.secondary',
                minWidth: 44,
                textAlign: 'right',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {homeScore}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer — matches LiveGameCard and ScheduledGameCard */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: topPerformer && topPerformer.name ? 1 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: topPerformer && topPerformer.name ? 'space-between' : 'flex-end',
          borderTop: topPerformer && topPerformer.name ? '0' : '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {topPerformer && topPerformer.name && (
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            Top: {topPerformer.name} — {Math.round(topPerformer.points)} PTS
            {typeof topPerformer.rebounds === 'number' && ` ${Math.round(topPerformer.rebounds)} REB`}
            {typeof topPerformer.assists === 'number' && ` ${Math.round(topPerformer.assists)} AST`}
          </Typography>
        )}
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            ml: 'auto',
          }}
        >
          View Game
        </Button>
      </Box>
    </Paper>
  );
};

export default CompletedGameCard;
