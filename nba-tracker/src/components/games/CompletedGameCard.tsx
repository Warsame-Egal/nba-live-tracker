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
          display: 'grid',
          // Dedicated score column so totals never share a shrinking flex row with team names (avoids right-edge clipping)
          gridTemplateColumns: { xs: '40px minmax(0, 1fr) minmax(52px, auto)', sm: '44px minmax(0, 1fr) minmax(56px, auto)' },
          gridTemplateRows: 'auto auto',
          columnGap: { xs: 1.5, sm: 2 },
          rowGap: 1,
          alignItems: 'center',
          p: { xs: 2, sm: 2.5 },
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        {/* FINAL label — spans both team rows */}
        <Typography
          variant="caption"
          sx={{
            gridRow: '1 / 3',
            gridColumn: 1,
            fontWeight: 700,
            color: 'text.secondary',
            letterSpacing: '0.08em',
            textAlign: 'center',
            alignSelf: 'center',
          }}
        >
          FINAL
        </Typography>

        {/* Away: logo + name (middle column) */}
        <Box
          sx={{
            gridRow: 1,
            gridColumn: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Avatar
            src={TEAM_LOGOS[awayTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={awayTeam}
            onClick={e => handleTeamClick(e, awayId)}
            sx={{ width: 28, height: 28, flexShrink: 0, cursor: awayId ? 'pointer' : 'default' }}
          />
          <Typography
            variant="body2"
            fontWeight={awayWon ? 700 : 500}
            color={awayWon ? 'text.primary' : 'text.secondary'}
            sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {awayTeam}
          </Typography>
        </Box>
        <Typography
          sx={{
            gridRow: 1,
            gridColumn: 3,
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: awayWon ? 800 : 500,
            fontSize: { xs: '1.25rem', sm: '1.375rem' },
            color: awayWon ? 'text.primary' : 'text.secondary',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            justifySelf: 'end',
            width: '100%',
          }}
        >
          {awayScore}
        </Typography>

        {/* Home: logo + name */}
        <Box
          sx={{
            gridRow: 2,
            gridColumn: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Avatar
            src={TEAM_LOGOS[homeTeam || 'NBA'] || TEAM_LOGOS['NBA']}
            alt={homeTeam}
            onClick={e => handleTeamClick(e, homeId)}
            sx={{ width: 28, height: 28, flexShrink: 0, cursor: homeId ? 'pointer' : 'default' }}
          />
          <Typography
            variant="body2"
            fontWeight={homeWon ? 700 : 500}
            color={homeWon ? 'text.primary' : 'text.secondary'}
            sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {homeTeam}
          </Typography>
        </Box>
        <Typography
          sx={{
            gridRow: 2,
            gridColumn: 3,
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: homeWon ? 800 : 500,
            fontSize: { xs: '1.25rem', sm: '1.375rem' },
            color: homeWon ? 'text.primary' : 'text.secondary',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
            justifySelf: 'end',
            width: '100%',
          }}
        >
          {homeScore}
        </Typography>
      </Box>

      {topPerformer && topPerformer.name && (
        <Box
          sx={{
            px: 2,
            pb: 1.25,
            pt: 0.25,
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
