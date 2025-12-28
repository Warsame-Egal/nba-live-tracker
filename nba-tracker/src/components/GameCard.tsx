import React from 'react';
import { Game } from '../types/scoreboard';
import { GameSummary } from '../types/schedule';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Box, Avatar, Chip } from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';

interface GameCardProps {
  game: Game | GameSummary;
  hideScore?: boolean;
  onClick?: () => void;
}

/**
 * Component that displays a single game card.
 * Shows team names, scores, and game status (live, final, upcoming).
 */
const GameCard: React.FC<GameCardProps> = ({ game, hideScore = false, onClick }) => {
  // Check if this is a live game (has homeTeam) or a scheduled game (has home_team)
  const isLiveGame = 'homeTeam' in game;

  // Get team information based on game type
  const homeTeam = isLiveGame ? game.homeTeam?.teamTricode : game.home_team?.team_abbreviation;
  const awayTeam = isLiveGame ? game.awayTeam?.teamTricode : game.away_team?.team_abbreviation;

  // Get scores
  const homeScore = isLiveGame ? (game.homeTeam?.score ?? 0) : (game.home_team?.points ?? 0);
  const awayScore = isLiveGame ? (game.awayTeam?.score ?? 0) : (game.away_team?.points ?? 0);

  // Get team IDs for navigation
  const homeId = isLiveGame ? game.homeTeam?.teamId : game.home_team?.team_id;
  const awayId = isLiveGame ? game.awayTeam?.teamId : game.away_team?.team_id;

  // Get game status information
  const status = isLiveGame ? game.gameStatusText : game.game_status || '';
  const period = isLiveGame ? game.period : null;
  const gameClock = isLiveGame ? game.gameClock : null;

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

  // Determine if game is live or final
  const isLive = status.includes('LIVE') || status.includes('Q');
  const isFinal = status.includes('FINAL');

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
        p: 3,
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: 'background.paper',
        border: isLive ? '2px solid' : '1px solid',
        borderColor: isLive ? 'error.main' : 'divider',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick
          ? {
              borderColor: isLive ? 'error.main' : 'primary.main',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }
          : {},
      }}
    >
      {/* Status badge (LIVE, FINAL, or game time) */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Chip
          label={getStatusLabel()}
          size="small"
          icon={isLive ? <FiberManualRecord sx={{ fontSize: 8 }} /> : undefined}
          sx={{
            backgroundColor: isLive ? 'rgba(239, 83, 80, 0.15)' : 'transparent',
            color: getStatusColor(),
            fontWeight: 700,
            fontSize: '0.75rem',
            height: 24,
            border: isLive ? '1px solid' : 'none',
            borderColor: isLive ? 'error.main' : 'transparent',
            '& .MuiChip-icon': {
              color: 'error.main',
            },
          }}
        />
      </Box>

      {/* Teams and scores */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TeamRow
          teamName={isLiveGame ? game.awayTeam?.teamName : awayTeam}
          tricode={awayTeam}
          score={awayScore}
          isWinner={!hideScore && awayScore > homeScore}
          teamId={awayId}
          hideScore={hideScore}
        />
        <Box
          sx={{
            height: 1,
            backgroundColor: 'divider',
            mx: -3,
          }}
        />
        <TeamRow
          teamName={isLiveGame ? game.homeTeam?.teamName : homeTeam}
          tricode={homeTeam}
          score={homeScore}
          isWinner={!hideScore && homeScore > awayScore}
          teamId={homeId}
          hideScore={hideScore}
        />
      </Box>
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
}

/**
 * Component that displays one team row (logo, name, score).
 */
const TeamRow: React.FC<TeamRowProps> = ({
  teamName,
  tricode,
  score = 0,
  isWinner,
  teamId,
  hideScore = false,
}) => {
  // Get the team logo path
  const logoSrc = teamLogos[tricode || 'NBA'] || teamLogos['NBA'];
  const navigate = useNavigate();

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
        gap: 2,
      }}
    >
      {/* Team logo and name (clickable) */}
      <Box
        onClick={handleTeamClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flex: 1,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
        }}
      >
        <Avatar
          src={logoSrc}
          alt={`${teamName || tricode} logo`}
          sx={{
            width: { xs: 44, sm: 52 },
            height: { xs: 44, sm: 52 },
            backgroundColor: 'transparent',
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.125rem' },
              lineHeight: 1.2,
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
                fontSize: '0.75rem',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {teamName}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Team score (highlighted if they're winning) */}
      {!hideScore && (
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.75rem', sm: '2rem' },
            color: isWinner ? 'primary.main' : 'text.primary',
            minWidth: 60,
            textAlign: 'right',
            letterSpacing: '-0.02em',
          }}
        >
          {score}
        </Typography>
      )}
    </Box>
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

export default GameCard;
