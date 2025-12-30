import React, { useMemo } from 'react';
import { Game } from '../types/scoreboard';
import { GameSummary } from '../types/schedule';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Box,
  Avatar,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { FiberManualRecord, TrendingUp, TrendingDown } from '@mui/icons-material';
import { responsiveSpacing, borderRadius, transitions, shadows, typography } from '../theme/designTokens';

interface GameCardProps {
  game: Game | GameSummary;
  hideScore?: boolean;
  onClick?: () => void;
  isRecentlyUpdated?: boolean;
}

/**
 * Component that displays a single game card with enhanced visuals.
 * Shows team names, scores, game status, leaders, and additional game information.
 */
const GameCard: React.FC<GameCardProps> = ({ game, hideScore = false, onClick, isRecentlyUpdated = false }) => {
  // Check if this is a live game (has homeTeam) or a scheduled game (has home_team)
  const isLiveGame = 'homeTeam' in game;

  // Get team information based on game type
  const homeTeam = isLiveGame ? game.homeTeam?.teamTricode : game.home_team?.team_abbreviation;
  const awayTeam = isLiveGame ? game.awayTeam?.teamTricode : game.away_team?.team_abbreviation;
  const homeTeamName = isLiveGame ? game.homeTeam?.teamName : null;
  const awayTeamName = isLiveGame ? game.awayTeam?.teamName : null;

  // Get scores
  const homeScore = isLiveGame ? (game.homeTeam?.score ?? 0) : (game.home_team?.points ?? 0);
  const awayScore = isLiveGame ? (game.awayTeam?.score ?? 0) : (game.away_team?.points ?? 0);

  // Get team IDs for navigation
  const homeId = isLiveGame ? game.homeTeam?.teamId : game.home_team?.team_id;
  const awayId = isLiveGame ? game.awayTeam?.teamId : game.away_team?.team_id;

  // Get team records for win probability calculation
  const homeWins = isLiveGame ? game.homeTeam?.wins ?? 0 : 0;
  const homeLosses = isLiveGame ? game.homeTeam?.losses ?? 0 : 0;
  const awayWins = isLiveGame ? game.awayTeam?.wins ?? 0 : 0;
  const awayLosses = isLiveGame ? game.awayTeam?.losses ?? 0 : 0;

  // Get game status information
  const status = isLiveGame ? game.gameStatusText : game.game_status || '';
  const period = isLiveGame ? game.period : null;
  const gameClock = isLiveGame ? game.gameClock : null;

  // Get game leaders if available
  const gameLeaders = isLiveGame && 'gameLeaders' in game ? game.gameLeaders : null;

  // Format the game time
  const gameTime = isLiveGame
    ? game.gameEt
      ? format(parseISO(game.gameEt), 'h:mm a')
      : game.gameTimeUTC
        ? format(parseISO(game.gameTimeUTC), "h:mm a 'UTC'")
        : 'TBD'
    : game.game_date
      ? format(parseISO(game.game_date), 'h:mm a')
      : 'TBD';

  // Determine if game is live, final, or upcoming
  const isLive = status.includes('LIVE') || status.includes('Q');
  const isFinal = status.includes('FINAL');
  const isUpcoming = !isLive && !isFinal;

  // Calculate win probability for upcoming games
  const winProbability = useMemo(() => {
    if (!isUpcoming || homeWins + homeLosses === 0 || awayWins + awayLosses === 0) {
      return null;
    }
    const homeWinPct = homeWins / (homeWins + homeLosses);
    const awayWinPct = awayWins / (awayWins + awayLosses);
    const totalWinPct = homeWinPct + awayWinPct;
    if (totalWinPct === 0) return null;
    // Add home court advantage (5%)
    const homeProb = (homeWinPct / totalWinPct) * 0.95 + 0.05;
    return Math.round(homeProb * 100);
  }, [isUpcoming, homeWins, homeLosses, awayWins, awayLosses]);

  // Calculate game momentum (score differential)
  const scoreDifferential = useMemo(() => {
    if (hideScore || !isLive) return null;
    const diff = Math.abs(homeScore - awayScore);
    if (diff === 0) return 'Tied';
    if (diff <= 5) return 'Close';
    if (diff <= 10) return 'Comfortable';
    return 'Blowout';
  }, [hideScore, isLive, homeScore, awayScore]);

  // Get team colors for accent borders
  const homeTeamColor = teamColors[homeTeam || ''] || null;
  const awayTeamColor = teamColors[awayTeam || ''] || null;

  /**
   * Get the status label to display (LIVE, FINAL, or game time).
   */
  const getStatusLabel = () => {
    if (isFinal) return 'FINAL';
    if (isLive && period && gameClock) return `${period}Q ${gameClock}`;
    if (isLive) return 'LIVE';
    return gameTime;
  };

  /**
   * Get the color for the status badge.
   */
  const getStatusColor = () => {
    if (isLive) return 'error.main';
    if (isFinal) return 'text.secondary';
    return 'text.secondary';
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        p: responsiveSpacing.card,
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: 'background.paper',
        backgroundImage: isLive
          ? 'linear-gradient(135deg, rgba(239, 83, 80, 0.05) 0%, rgba(239, 83, 80, 0.02) 100%)'
          : 'none',
        border: isLive ? '2px solid' : '1px solid',
        borderColor: isLive ? 'error.main' : 'divider',
        borderLeft: homeTeamColor && awayTeamColor ? `4px solid ${homeTeamColor}` : undefined,
        borderRight: homeTeamColor && awayTeamColor ? `4px solid ${awayTeamColor}` : undefined,
        transition: transitions.smooth,
        boxShadow: isLive ? shadows.error.md : shadows.sm,
        position: 'relative',
        overflow: 'hidden',
        // Animation for recently updated games
        ...(isRecentlyUpdated && {
          animation: 'scoreUpdateFlash 0.6s ease-out',
          boxShadow: isLive
            ? `${shadows.error.md}, 0 0 0 2px rgba(25, 118, 210, 0.2)`
            : `${shadows.sm}, 0 0 0 2px rgba(25, 118, 210, 0.2)`,
        }),
        '&::before': isLive
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, transparent, error.main, transparent)',
              animation: 'pulse 2s ease-in-out infinite',
            }
          : {},
        '&:hover': onClick
          ? {
              borderColor: isLive ? 'error.main' : 'primary.main',
              transform: 'translateY(-4px)',
              boxShadow: isLive ? shadows.error.lg : shadows.lg,
            }
          : {},
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
        '@keyframes scoreUpdateFlash': {
          '0%': {
            backgroundColor: 'background.paper',
            transform: 'scale(1)',
          },
          '50%': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            transform: 'scale(1.02)',
          },
          '100%': {
            backgroundColor: 'background.paper',
            transform: 'scale(1)',
          },
        },
      }}
    >
      {/* Status badge and win probability */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: responsiveSpacing.element }}>
        <Chip
          label={getStatusLabel()}
          size="small"
          icon={isLive ? <FiberManualRecord sx={{ fontSize: 8 }} /> : undefined}
          sx={{
            backgroundColor: isLive ? 'rgba(239, 83, 80, 0.15)' : 'transparent',
            color: getStatusColor(),
            fontWeight: typography.weight.bold,
            fontSize: typography.size.caption.sm,
            height: 24,
            border: isLive ? '1px solid' : 'none',
            borderColor: isLive ? 'error.main' : 'transparent',
            '& .MuiChip-icon': {
              color: 'error.main',
            },
          }}
        />
        {/* Win probability for upcoming games */}
        {winProbability !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: typography.weight.semibold }}>
              {winProbability}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={winProbability}
              sx={{
                width: 40,
                height: 4,
                borderRadius: borderRadius.sm,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'primary.main',
                },
              }}
            />
          </Box>
        )}
        {/* Momentum indicator for live games */}
        {scoreDifferential && isLive && (
          <Chip
            label={scoreDifferential}
            size="small"
            icon={
              scoreDifferential === 'Close' ? (
                <TrendingUp sx={{ fontSize: 12 }} />
              ) : scoreDifferential === 'Tied' ? (
                <FiberManualRecord sx={{ fontSize: 8 }} />
              ) : (
                <TrendingDown sx={{ fontSize: 12 }} />
              )
            }
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'text.secondary',
              fontSize: '0.7rem',
              height: 20,
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {/* Teams and scores */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: responsiveSpacing.element }}>
        <TeamRow
          teamName={awayTeamName || awayTeam}
          tricode={awayTeam}
          score={awayScore}
          isWinner={!hideScore && awayScore > homeScore}
          teamId={awayId}
          hideScore={hideScore}
          isLive={isLive}
          leader={gameLeaders?.awayLeaders}
          isScoreUpdated={isRecentlyUpdated}
        />
        <Box
          sx={{
            height: 1,
            backgroundColor: 'divider',
            mx: -3,
            opacity: 0.5,
          }}
        />
        <TeamRow
          teamName={homeTeamName || homeTeam}
          tricode={homeTeam}
          score={homeScore}
          isWinner={!hideScore && homeScore > awayScore}
          teamId={homeId}
          hideScore={hideScore}
          isLive={isLive}
          leader={gameLeaders?.homeLeaders}
          isScoreUpdated={isRecentlyUpdated}
        />
      </Box>

      {/* Game leaders preview */}
      {gameLeaders && (gameLeaders.homeLeaders || gameLeaders.awayLeaders) && (
        <Box
          sx={{
            mt: responsiveSpacing.element,
            pt: responsiveSpacing.elementCompact,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: responsiveSpacing.elementCompact,
            justifyContent: 'space-around',
          }}
        >
          {gameLeaders.awayLeaders && (
            <LeaderPreview leader={gameLeaders.awayLeaders} />
          )}
          {gameLeaders.homeLeaders && (
            <LeaderPreview leader={gameLeaders.homeLeaders} />
          )}
        </Box>
      )}

      {/* Last play preview for live games - placeholder */}
      {isLive && (
        <Box
          sx={{
            mt: responsiveSpacing.elementCompact,
            pt: responsiveSpacing.elementCompact,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <FiberManualRecord sx={{ fontSize: 6, color: 'error.main' }} />
            Live updates enabled
          </Typography>
        </Box>
      )}
    </Card>
  );
};

interface TeamRowProps {
  teamName?: string | null;
  tricode?: string | null;
  score?: number;
  isWinner?: boolean;
  teamId?: number | null;
  hideScore?: boolean;
  isLive?: boolean;
  leader?: { personId: number; name: string; points: number; rebounds: number; assists: number } | null;
  isScoreUpdated?: boolean;
}

/**
 * Component that displays one team row (logo, name, score) with enhanced visuals.
 */
const TeamRow: React.FC<TeamRowProps> = ({
  teamName,
  tricode,
  score = 0,
  isWinner,
  teamId,
  hideScore = false,
  isLive = false,
  leader,
  isScoreUpdated = false,
}) => {
  // Get the team logo path
  const logoSrc = teamLogos[tricode || 'NBA'] || teamLogos['NBA'];
  const navigate = useNavigate();
  const teamColor = teamColors[tricode || ''] || null;

  /**
   * Handle click on team logo/name to navigate to team page.
   */
  const handleTeamClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger the game card click
    if (teamId) navigate(`/team/${teamId}`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: responsiveSpacing.elementCompact,
        position: 'relative',
      }}
    >
      {/* Team logo and name (clickable) */}
      <Box
        onClick={handleTeamClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: responsiveSpacing.elementCompact,
          flex: 1,
          cursor: 'pointer',
          transition: transitions.normal,
          '&:hover': {
            opacity: 0.8,
          },
        }}
      >
        <Avatar
          src={logoSrc}
          alt={`${teamName || tricode} logo`}
          sx={{
            width: { xs: 56, sm: 64 },
            height: { xs: 56, sm: 64 },
            backgroundColor: 'transparent',
            border: teamColor ? `2px solid ${teamColor}` : '2px solid',
            borderColor: teamColor || 'divider',
            boxShadow: teamColor ? shadows.sm.replace('rgba(0, 0, 0, 0.1)', `${teamColor}40`) : 'none',
            transition: transitions.normal,
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              lineHeight: typography.lineHeight.normal,
              color: isWinner && !hideScore ? 'primary.main' : 'text.primary',
            }}
            noWrap
          >
            {tricode || teamName || 'N/A'}
          </Typography>
          {teamName && tricode && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.8rem',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {teamName}
            </Typography>
          )}
          {/* Leader preview */}
          {leader && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                display: 'block',
                mt: { xs: 0.25, sm: 0.5 },
              }}
            >
              {leader.name}: {leader.points} PTS
            </Typography>
          )}
        </Box>
      </Box>

      {/* Team score (highlighted if they're winning) */}
      {!hideScore && (
        <Typography
          variant="h4"
          key={score}
            sx={{
              fontWeight: typography.weight.extrabold,
              fontSize: { xs: '2rem', sm: '2.5rem' },
              color: isWinner ? 'primary.main' : 'text.primary',
              minWidth: { xs: 60, sm: 70 },
              textAlign: 'right',
              letterSpacing: typography.letterSpacing.tight,
              textShadow: isWinner && isLive ? '0 0 8px rgba(25, 118, 210, 0.3)' : 'none',
              transition: transitions.normal,
            ...(isScoreUpdated && {
              animation: 'scorePulse 0.5s ease-out',
            }),
            '@keyframes scorePulse': {
              '0%': {
                transform: 'scale(1)',
                color: isWinner ? 'primary.main' : 'text.primary',
              },
              '50%': {
                transform: 'scale(1.15)',
                color: 'primary.main',
                textShadow: '0 0 12px rgba(25, 118, 210, 0.5)',
              },
              '100%': {
                transform: 'scale(1)',
                color: isWinner ? 'primary.main' : 'text.primary',
              },
            },
          }}
        >
          {score}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Component that displays a game leader preview with avatar.
 */
interface LeaderPreviewProps {
  leader: {
    personId: number;
    name: string;
    points: number;
    rebounds: number;
    assists: number;
  };
}

const LeaderPreview: React.FC<LeaderPreviewProps> = ({ leader }) => {
  const avatarUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.personId}.png`;
  const navigate = useNavigate();

  return (
    <Tooltip
      title={`${leader.name}: ${leader.points} PTS, ${leader.rebounds} REB, ${leader.assists} AST`}
      arrow
    >
      <Box
        onClick={e => {
          e.stopPropagation();
          navigate(`/players/${leader.personId}`);
        }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
        }}
      >
        <Avatar
          src={avatarUrl}
          alt={leader.name}
          sx={{
            width: 32,
            height: 32,
            border: '1px solid',
            borderColor: 'divider',
          }}
          onError={e => {
            const target = e.currentTarget as HTMLImageElement;
            target.onerror = null;
            target.src = '';
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
            textAlign: 'center',
            maxWidth: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {leader.name.split(' ').pop()}
        </Typography>
        <Typography
          variant="caption"
            sx={{
              fontSize: typography.size.caption.sm,
              fontWeight: typography.weight.bold,
              color: 'primary.main',
            }}
        >
          {leader.points}
        </Typography>
      </Box>
    </Tooltip>
  );
};

/**
 * Map of team abbreviations to logo file paths.
 */
const teamLogos: Record<string, string> = {
  ATL: '/logos/ATL.svg',
  BOS: '/logos/BOS.svg',
  BKN: '/logos/BKN.svg',
  CHA: '/logos/CHA.svg',
  CHI: '/logos/CHI.svg',
  CLE: '/logos/CLE.svg',
  DAL: '/logos/DAL.svg',
  DEN: '/logos/DEN.svg',
  DET: '/logos/DET.svg',
  GSW: '/logos/GSW.svg',
  HOU: '/logos/HOU.svg',
  IND: '/logos/IND.svg',
  LAC: '/logos/LAC.svg',
  LAL: '/logos/LAL.svg',
  MEM: '/logos/MEM.svg',
  MIA: '/logos/MIA.svg',
  MIL: '/logos/MIL.svg',
  MIN: '/logos/MIN.svg',
  NOP: '/logos/NOP.svg',
  NYK: '/logos/NYK.svg',
  OKC: '/logos/OKC.svg',
  ORL: '/logos/ORL.svg',
  PHI: '/logos/PHI.svg',
  PHX: '/logos/PHX.svg',
  POR: '/logos/POR.svg',
  SAC: '/logos/SAC.svg',
  SAS: '/logos/SAS.svg',
  TOR: '/logos/TOR.svg',
  UTA: '/logos/UTA.svg',
  WAS: '/logos/WAS.svg',
  NBA: '/logos/NBA.svg',
};

/**
 * Map of team abbreviations to primary team colors (for accent borders).
 */
const teamColors: Record<string, string> = {
  ATL: '#E03A3E', // Red
  BOS: '#007A33', // Green
  BKN: '#000000', // Black
  CHA: '#1D1160', // Purple
  CHI: '#CE1141', // Red
  CLE: '#860038', // Wine
  DAL: '#00538C', // Blue
  DEN: '#0E2240', // Navy
  DET: '#C8102E', // Red
  GSW: '#1D428A', // Blue
  HOU: '#CE1141', // Red
  IND: '#002D62', // Blue
  LAC: '#C8102E', // Red
  LAL: '#552583', // Purple
  MEM: '#5D76A9', // Blue
  MIA: '#98002E', // Red
  MIL: '#00471B', // Green
  MIN: '#0C2340', // Navy
  NOP: '#0C2340', // Navy
  NYK: '#F58426', // Orange
  OKC: '#007AC1', // Blue
  ORL: '#0077C0', // Blue
  PHI: '#006BB6', // Blue
  PHX: '#1D1160', // Purple
  POR: '#E03A3E', // Red
  SAC: '#5A2D81', // Purple
  SAS: '#C4CED4', // Silver
  TOR: '#CE1141', // Red
  UTA: '#002B5C', // Navy
  WAS: '#002B5C', // Navy
};

export default GameCard;
