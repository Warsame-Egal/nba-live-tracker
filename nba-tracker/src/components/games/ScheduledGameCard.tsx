import React from 'react';
import { Box, Typography, Avatar, Paper, Button, useTheme, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Game } from '../../types/scoreboard';
import { GameSummary } from '../../types/schedule';
import { TEAM_LOGOS, getGameTime } from '../../utils/gameUtils';
import { borderRadius, transitions, shadows } from '../../theme/designTokens';

interface ScheduledGameCardProps {
  game: Game | GameSummary;
  onClick?: () => void;
  /** Home win probability 0–1 from predictions API */
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

  const homeWinP =
    homeWinPercent != null && !Number.isNaN(homeWinPercent)
      ? Math.min(1, Math.max(0, homeWinPercent))
      : null;

  /** Which side has the higher model win chance (tie 50/50 → home). */
  const favoredSide: 'away' | 'home' | null =
    homeWinP == null ? null : homeWinP < 0.5 ? 'away' : 'home';
  const awayPct = homeWinP != null ? Math.round((1 - homeWinP) * 100) : null;
  const homePct = homeWinP != null ? Math.round(homeWinP * 100) : null;
  const awayStrong = homeWinP != null && favoredSide === 'away';
  const homeStrong = homeWinP != null && favoredSide === 'home';

  /** Same column as game score: tabular digits + lighter %, soft pill so it reads as odds not points. */
  const renderModelWinPct = (pct: number) => (
    <Box
      title="Model win probability"
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        justifyContent: 'flex-end',
        flexShrink: 0,
        minWidth: 52,
        pl: 0.875,
        pr: 0.625,
        py: 0.35,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.2),
        boxSizing: 'border-box',
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: { xs: '1.0625rem', sm: '1.125rem' },
          color: 'primary.main',
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {pct}
      </Box>
      <Box
        component="span"
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: '0.65rem',
          fontWeight: 600,
          color: 'primary.main',
          opacity: 0.5,
          ml: 0.2,
          lineHeight: 1,
          transform: 'translateY(-3px)',
          display: 'inline-block',
        }}
      >
        %
      </Box>
    </Box>
  );

  const pctSpacerWidth = 52;

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

        {/* Teams + score column: % only on favored side (same slot as final score) */}
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
              fontWeight={awayStrong ? 700 : 600}
              color={homeWinP != null ? (awayStrong ? 'text.primary' : 'text.secondary') : 'text.primary'}
              noWrap
              sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem' }}
            >
              {awayTeam}
            </Typography>
            {awayStrong && awayPct != null ? (
              renderModelWinPct(awayPct)
            ) : (
              <Box sx={{ minWidth: pctSpacerWidth, flexShrink: 0 }} aria-hidden />
            )}
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
              fontWeight={homeStrong ? 700 : 600}
              color={homeWinP != null ? (homeStrong ? 'text.primary' : 'text.secondary') : 'text.primary'}
              noWrap
              sx={{ flex: 1, minWidth: 0, fontSize: '0.875rem' }}
            >
              {homeTeam}
            </Typography>
            {homeStrong && homePct != null ? (
              renderModelWinPct(homePct)
            ) : (
              <Box sx={{ minWidth: pctSpacerWidth, flexShrink: 0 }} aria-hidden />
            )}
          </Box>
        </Box>
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
