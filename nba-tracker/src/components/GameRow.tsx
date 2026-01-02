import React, { useState, useEffect } from 'react';
import { Game } from '../types/scoreboard';
import { GameSummary } from '../types/schedule';
import { format, parseISO } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Divider,
  Link as MuiLink,
  Button,
} from '@mui/material';
import { FiberManualRecord, Person, Assessment, Timeline } from '@mui/icons-material';
import { borderRadius, transitions, typography, spacing } from '../theme/designTokens';
import { BoxScoreResponse, PlayerBoxScoreStats } from '../types/scoreboard';
import { PlayByPlayResponse, PlayByPlayEvent } from '../types/playbyplay';
import PlayByPlayWebSocketService from '../services/PlayByPlayWebSocketService';
import { fetchJson } from '../utils/apiClient';
import { GameInsightData } from './GameInsight';
import LiveAIInsight from './LiveAIInsight';
import LeadChangeDialog, { LeadChangeExplanation } from './LeadChangeDialog';

interface GameRowProps {
  game: Game | GameSummary;
  onClick?: () => void;
  isRecentlyUpdated?: boolean;
  isSelected?: boolean;
  onOpenBoxScore?: (gameId: string) => void;
  onOpenPlayByPlay?: (gameId: string) => void;
  insight?: GameInsightData | null;
  onDismissInsight?: () => void;
}

/**
 * Compact horizontal game row component.
 */
const GameRow: React.FC<GameRowProps> = ({ 
  game, 
  onClick, 
  isRecentlyUpdated = false, 
  isSelected = false, 
  onOpenBoxScore, 
  onOpenPlayByPlay,
  insight,
  onDismissInsight: _onDismissInsight,
}) => {
  const [leadChangeDialogOpen, setLeadChangeDialogOpen] = React.useState(false);
  const [leadChangeExplanation, setLeadChangeExplanation] = React.useState<LeadChangeExplanation | null>(null);
  const navigate = useNavigate();
  const isLiveGame = 'homeTeam' in game;
  const gameId = isLiveGame ? game.gameId : game.game_id;
  const [_topPerformers, setTopPerformers] = useState<{ home: PlayerBoxScoreStats | null; away: PlayerBoxScoreStats | null }>({ home: null, away: null });
  const [lastPlay, setLastPlay] = useState<PlayByPlayEvent | null>(null);
  const pbpServiceRef = React.useRef<PlayByPlayWebSocketService | null>(null);
  const homeTeam = isLiveGame ? game.homeTeam?.teamTricode : game.home_team?.team_abbreviation;
  const awayTeam = isLiveGame ? game.awayTeam?.teamTricode : game.away_team?.team_abbreviation;
  const homeTeamName = isLiveGame ? game.homeTeam?.teamName : null;
  const awayTeamName = isLiveGame ? game.awayTeam?.teamName : null;
  const homeScore = isLiveGame ? (game.homeTeam?.score ?? 0) : (game.home_team?.points ?? 0);
  const awayScore = isLiveGame ? (game.awayTeam?.score ?? 0) : (game.away_team?.points ?? 0);
  const homeId = isLiveGame ? game.homeTeam?.teamId : game.home_team?.team_id;
  const awayId = isLiveGame ? game.awayTeam?.teamId : game.away_team?.team_id;
  const homeWins = isLiveGame ? game.homeTeam?.wins : undefined;
  const homeLosses = isLiveGame ? game.homeTeam?.losses : undefined;
  const awayWins = isLiveGame ? game.awayTeam?.wins : undefined;
  const awayLosses = isLiveGame ? game.awayTeam?.losses : undefined;
  const status = isLiveGame ? game.gameStatusText : game.game_status || '';
  const period = isLiveGame ? game.period : null;
  const gameClock = isLiveGame ? game.gameClock : null;
  const statusLower = status.toLowerCase();
  // Check if game is live: gameStatus === 2 (in progress) OR status text indicates live
  const isLive = (isLiveGame && 'gameStatus' in game && (game as Game).gameStatus === 2) || 
                 statusLower.includes('live') || 
                 (status.match(/\b[1-4]q\b/i) && !statusLower.includes('final'));
  const isFinal = statusLower.includes('final');
  const isUpcoming = !isLive && !isFinal && homeScore === 0 && awayScore === 0;
  const gameLeaders = isLiveGame 
    ? ('gameLeaders' in game ? game.gameLeaders : null)
    : ('gameLeaders' in game ? (game as GameSummary).gameLeaders : null);
  const getGameTime = () => {
    if (isLiveGame) {
      if (game.gameEt) {
        try {
          return format(parseISO(game.gameEt), 'h:mm a');
        } catch {
          return 'TBD';
        }
      }
      if (game.gameTimeUTC) {
        try {
          return format(parseISO(game.gameTimeUTC), 'h:mm a');
        } catch {
          return 'TBD';
        }
      }
      return 'TBD';
    }
    if (game.game_time_utc) {
      try {
        return format(parseISO(game.game_time_utc), 'h:mm a');
      } catch {
        return 'TBD';
      }
    }
    if (game.game_date) {
      try {
        const parsed = parseISO(game.game_date);
        if (parsed.getHours() === 0 && parsed.getMinutes() === 0) {
          return 'TBD';
        }
        return format(parsed, 'h:mm a');
      } catch {
        return 'TBD';
      }
    }
    return 'TBD';
  };
  const gameTime = getGameTime();

  const getStatusLabel = () => {
    if (isFinal) return 'FINAL';
    if (isLive && period && gameClock) return `${period}Q ${gameClock}`;
    if (isLive) return 'LIVE';
    return gameTime;
  };

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

  const handleTeamClick = (e: React.MouseEvent, teamId?: number | null) => {
    e.stopPropagation();
    if (teamId) navigate(`/team/${teamId}`);
  };

  useEffect(() => {
    if (!isLive || !isLiveGame) return;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    const fetchBoxScore = async () => {
      try {
        const data = await fetchJson<BoxScoreResponse>(
          `${API_BASE_URL}/api/v1/scoreboard/game/${gameId}/boxscore`,
          {},
          { maxRetries: 2, retryDelay: 1000, timeout: 20000 }
        );
        const homeTopScorer = data.home_team.players
          .filter(p => p.points > 0)
          .sort((a, b) => b.points - a.points)[0] || null;
        
        const awayTopScorer = data.away_team.players
          .filter(p => p.points > 0)
          .sort((a, b) => b.points - a.points)[0] || null;
        
        setTopPerformers({ home: homeTopScorer, away: awayTopScorer });
      } catch {
        // Silently fail for background updates
      }
    };

    fetchBoxScore();
    const interval = setInterval(fetchBoxScore, 30000);
    return () => clearInterval(interval);
  }, [isLive, isLiveGame, gameId]);

  useEffect(() => {
    if (!isLive || !isLiveGame || !gameId) return;

    const service = new PlayByPlayWebSocketService();
    pbpServiceRef.current = service;

    const handleUpdate = (data: PlayByPlayResponse) => {
      if (data?.plays && data.plays.length > 0) {
        const sorted = [...data.plays].sort((a, b) => b.action_number - a.action_number);
        setLastPlay(sorted[0]);
      }
    };

    service.connect(gameId);
    service.subscribe(handleUpdate);

    return () => {
      service.unsubscribe(handleUpdate);
      service.disconnect();
    };
  }, [isLive, isLiveGame, gameId]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Main game row */}
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          p: { xs: 1.5, sm: 2 },
          cursor: onClick ? 'pointer' : (isUpcoming ? 'not-allowed' : 'default'),
          opacity: isUpcoming ? 0.7 : 1,
          backgroundColor: isSelected 
            ? 'rgba(25, 118, 210, 0.08)' 
            : isLive 
              ? 'rgba(239, 83, 80, 0.05)' 
              : 'background.paper',
          border: '1px solid',
          borderColor: isSelected 
            ? 'primary.main' 
            : isLive 
              ? 'error.main' 
              : 'divider',
          borderLeft: (isSelected || isLive) ? '3px solid' : '1px solid',
          borderLeftColor: isSelected 
            ? 'primary.main' 
            : isLive 
              ? 'error.main' 
              : 'divider',
          borderRadius: borderRadius.sm,
          transition: transitions.normal,
          ...(isRecentlyUpdated && {
            animation: 'scoreUpdateFlash 0.6s ease-out',
            '@keyframes scoreUpdateFlash': {
              '0%': { backgroundColor: isLive ? 'rgba(239, 83, 80, 0.05)' : 'background.paper' },
              '50%': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
              '100%': { backgroundColor: isLive ? 'rgba(239, 83, 80, 0.05)' : 'background.paper' },
            },
          }),
          '&:hover': onClick
            ? {
                backgroundColor: isLive ? 'rgba(239, 83, 80, 0.1)' : 'action.hover',
                borderColor: isLive ? 'error.main' : 'primary.main',
              }
            : isUpcoming
              ? {
                  opacity: 0.6,
                }
              : {},
        }}
      >
      {/* Status/Time */}
      <Box
        sx={{
          minWidth: { xs: 60, sm: 70 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {isLive && (
          <FiberManualRecord
            sx={{
              fontSize: 8,
              color: 'error.main',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.5 },
                '50%': { opacity: 1 },
              },
            }}
          />
        )}
        <Typography
          variant="caption"
          sx={{
            fontSize: typography.size.captionSmall,
            fontWeight: isLive ? typography.weight.bold : typography.weight.regular,
            color: isLive ? 'error.main' : 'text.secondary',
            textAlign: 'center',
          }}
        >
          {getStatusLabel()}
        </Typography>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ height: 40 }} />

      {/* Away Team */}
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
          src={teamLogos[awayTeam || 'NBA'] || teamLogos['NBA']}
          alt={`${awayTeam} logo`}
          onClick={e => handleTeamClick(e, awayId)}
          sx={{
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            cursor: awayId ? 'pointer' : 'default',
            transition: transitions.normal,
            '&:hover': awayId ? { transform: 'scale(1.1)' } : {},
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.bodySmall,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {awayTeam}
            </Typography>
            {awayWins !== undefined && awayLosses !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: typography.size.captionSmall,
                  color: 'text.secondary',
                }}
              >
                ({awayWins}-{awayLosses})
              </Typography>
            )}
          </Box>
          {awayTeamName && (
            <Typography
              variant="caption"
              sx={{
                fontSize: typography.size.captionSmall,
                color: 'text.secondary',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {awayTeamName}
            </Typography>
          )}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            color: !isUpcoming && awayScore > homeScore ? 'primary.main' : 'text.primary',
            minWidth: { xs: 40, sm: 50 },
            textAlign: 'right',
          }}
        >
          {isUpcoming ? '—' : awayScore}
        </Typography>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ height: 40 }} />

      {/* Home Team */}
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
          src={teamLogos[homeTeam || 'NBA'] || teamLogos['NBA']}
          alt={`${homeTeam} logo`}
          onClick={e => handleTeamClick(e, homeId)}
          sx={{
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            cursor: homeId ? 'pointer' : 'default',
            transition: transitions.normal,
            '&:hover': homeId ? { transform: 'scale(1.1)' } : {},
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.bodySmall,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {homeTeam}
            </Typography>
            {homeWins !== undefined && homeLosses !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: typography.size.captionSmall,
                  color: 'text.secondary',
                }}
              >
                ({homeWins}-{homeLosses})
              </Typography>
            )}
          </Box>
          {homeTeamName && (
            <Typography
              variant="caption"
              sx={{
                fontSize: typography.size.captionSmall,
                color: 'text.secondary',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {homeTeamName}
            </Typography>
          )}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            color: !isUpcoming && homeScore > awayScore ? 'primary.main' : 'text.primary',
            minWidth: { xs: 40, sm: 50 },
            textAlign: 'right',
          }}
        >
          {isUpcoming ? '—' : homeScore}
        </Typography>
      </Box>

      {/* Box Score Button */}
      {onOpenBoxScore && (
        <Button
          variant="outlined"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBoxScore(gameId);
          }}
          sx={{
            borderRadius: '9999px',
            textTransform: 'none',
            fontSize: typography.size.caption,
            fontWeight: typography.weight.semibold,
            px: spacing.md,
            py: spacing.xs,
            minWidth: 'auto',
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        >
          Box Score
        </Button>
      )}
      </Box>

      {/* Game Leaders / Players to Watch */}
      {gameLeaders && (gameLeaders.homeLeaders || gameLeaders.awayLeaders) && (
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1.5, sm: 2 },
            pl: { xs: 2, sm: 2.5 },
            pr: { xs: 1.5, sm: 2 },
            pb: { xs: 1, sm: 1.5 },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: typography.size.captionSmall,
              fontWeight: typography.weight.semibold,
              color: 'text.secondary',
              minWidth: { xs: 60, sm: 70 },
              pt: 0.5,
            }}
          >
            Players to Watch
          </Typography>
          <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flex: 1, flexWrap: 'wrap' }}>
            {gameLeaders.awayLeaders && gameLeaders.awayLeaders.name && (
              <LeaderPreview leader={gameLeaders.awayLeaders} teamTricode={awayTeam || ''} navigate={navigate} isLive={isLive} />
            )}
            {gameLeaders.homeLeaders && gameLeaders.homeLeaders.name && (
              <LeaderPreview leader={gameLeaders.homeLeaders} teamTricode={homeTeam || ''} navigate={navigate} isLive={isLive} />
            )}
          </Box>
        </Box>
      )}

      {/* Status Bar: Play-by-Play | Actions - Only for live games */}
      {isLive && isLiveGame && (lastPlay || onOpenBoxScore || onOpenPlayByPlay) && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: { xs: 1.5, md: 2 },
            pl: { xs: 2, sm: 2.5 },
            pr: { xs: 1.5, sm: 2 },
            pb: { xs: 1.5, sm: 2 },
            pt: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Left Zone: Play-by-Play Text */}
          {lastPlay && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexShrink: 0,
                minWidth: 0,
                flex: 1,
              }}
            >
              {lastPlay.team_tricode && (
                <Avatar
                  src={teamLogos[lastPlay.team_tricode] || teamLogos['NBA']}
                  alt={`${lastPlay.team_tricode} logo`}
                  sx={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                variant="body2"
                sx={{
                  fontSize: typography.size.bodySmall,
                  color: 'text.primary',
                  fontWeight: typography.weight.medium,
                  lineHeight: 1.4,
                }}
              >
                {lastPlay.team_tricode ? `${lastPlay.team_tricode} - ` : ''}{lastPlay.description}
              </Typography>
            </Box>
          )}

          {/* Right Zone: Action Buttons */}
          {(onOpenBoxScore || onOpenPlayByPlay) && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'row', md: 'row' },
                gap: 1,
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                flexShrink: 0,
                ml: { xs: 0, md: 'auto' },
              }}
            >
              {onOpenBoxScore && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Assessment />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBoxScore(gameId);
                  }}
                  sx={{
                    borderRadius: borderRadius.sm,
                    textTransform: 'none',
                    fontSize: typography.size.caption,
                    px: spacing.md,
                    py: spacing.xs,
                    minWidth: { xs: 'auto', md: 100 },
                  }}
                >
                  Box Score
                </Button>
              )}
              {onOpenPlayByPlay && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Timeline />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPlayByPlay(gameId);
                  }}
                  sx={{
                    borderRadius: borderRadius.sm,
                    textTransform: 'none',
                    fontSize: typography.size.caption,
                    px: spacing.md,
                    py: spacing.xs,
                    minWidth: { xs: 'auto', md: 120 },
                  }}
                >
                  Play-by-Play
                </Button>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* AI Insights Section - Below game row */}
      {isLive && isLiveGame && (
        <Box
          sx={{
            pl: { xs: 2, sm: 2.5 },
            pr: { xs: 1.5, sm: 2 },
            pb: { xs: 1, sm: 1.5 },
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <LiveAIInsight
            insight={insight && insight.type !== 'none' && insight.text ? insight : null}
            onWhyClick={insight?.type === 'lead_change' ? async () => {
              try {
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                const response = await fetchJson<LeadChangeExplanation>(
                  `${API_BASE_URL}/api/v1/scoreboard/game/${gameId}/lead-change`
                );
                if (response) {
                  setLeadChangeExplanation(response);
                  setLeadChangeDialogOpen(true);
                }
              } catch (error) {
                console.error('Failed to fetch lead change explanation:', error);
              }
            } : undefined}
          />
        </Box>
      )}

      {/* Lead Change Dialog */}
      <LeadChangeDialog
        open={leadChangeDialogOpen}
        onClose={() => setLeadChangeDialogOpen(false)}
        explanation={leadChangeExplanation}
        homeTeam={homeTeam || ''}
        awayTeam={awayTeam || ''}
      />
    </Box>
  );
};

/**
 * Compact leader preview component for game row
 * Uses the same structure as GameCard's LeaderPreview
 */
interface LeaderPreviewProps {
  leader: {
    personId: number;
    name: string;
    jerseyNum?: string;
    position?: string;
    teamTricode?: string;
    points: number;
    rebounds: number;
    assists: number;
  } | null;
  teamTricode: string;
  navigate: ReturnType<typeof useNavigate>;
  isLive?: boolean | null;
}

const LeaderPreview: React.FC<LeaderPreviewProps> = ({ leader, teamTricode, navigate, isLive = false }) => {
  if (!leader) return null;

  const isValidPlayerId = leader.personId && leader.personId > 0;
  const avatarUrl = isValidPlayerId
    ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.personId}.png`
    : '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isValidPlayerId) navigate(`/player/${leader.personId}`);
  };

  const nameParts = leader.name ? leader.name.split(' ') : [];
  const lastName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
  const firstName = nameParts.length > 1 ? nameParts[0] : '';
  const displayName = firstName && lastName ? `${firstName[0]}. ${lastName}` : leader.name || 'N/A';

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        cursor: isValidPlayerId ? 'pointer' : 'default',
        transition: transitions.normal,
        '&:hover': isValidPlayerId ? { opacity: 0.8 } : {},
      }}
    >
      {isValidPlayerId ? (
        <MuiLink component={Link} to={`/player/${leader.personId}`} sx={{ textDecoration: 'none' }}>
          <Avatar
            src={avatarUrl}
            alt={leader.name || 'Player'}
            sx={{
              width: { xs: 28, sm: 32 },
              height: { xs: 28, sm: 32 },
              border: '1px solid',
              borderColor: 'divider',
            }}
            onError={e => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = '';
            }}
          />
        </MuiLink>
      ) : (
        <Avatar
          sx={{
            width: { xs: 28, sm: 32 },
            height: { xs: 28, sm: 32 },
            backgroundColor: 'action.disabledBackground',
            opacity: 0.5,
          }}
        >
          <Person sx={{ fontSize: 16 }} />
        </Avatar>
      )}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          {isValidPlayerId ? (
            <MuiLink
              component={Link}
              to={`/player/${leader.personId}`}
              sx={{
                color: 'text.primary',
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.caption,
                textDecoration: 'none',
                '&:hover': { color: 'primary.main', textDecoration: 'underline' },
              }}
            >
              {displayName}
            </MuiLink>
          ) : (
            <Typography
              variant="caption"
              sx={{
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.caption,
                color: 'text.secondary',
              }}
            >
              {displayName}
            </Typography>
          )}
          {leader.jerseyNum && (
            <Typography
              variant="caption"
              sx={{
                fontSize: typography.size.captionSmall,
                color: 'text.secondary',
              }}
            >
              #{leader.jerseyNum}
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{
              fontSize: typography.size.captionSmall,
              color: 'text.secondary',
            }}
          >
            - {teamTricode}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: typography.size.captionSmall,
            color: 'text.secondary',
            display: 'block',
            fontFamily: 'monospace',
          }}
        >
          {isLive 
            ? `${Math.round(leader.points)}PTS ${Math.round(leader.rebounds)}REB ${Math.round(leader.assists)}AST`
            : `${leader.points ? leader.points.toFixed(1) : '0.0'}PPG ${leader.rebounds ? leader.rebounds.toFixed(1) : '0.0'}RPG ${leader.assists ? leader.assists.toFixed(1) : '0.0'}APG`
          }
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Top Performer preview component for live games
 * Shows player with current game stats (points)
 */
export default GameRow;

