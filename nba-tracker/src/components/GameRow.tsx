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
  CircularProgress,
  Paper,
} from '@mui/material';
import { FiberManualRecord, Person, Assessment, Timeline } from '@mui/icons-material';
import { borderRadius, transitions, typography, spacing } from '../theme/designTokens';
import { PlayByPlayResponse, PlayByPlayEvent } from '../types/playbyplay';
import PlayByPlayWebSocketService from '../services/PlayByPlayWebSocketService';
import { fetchJson } from '../utils/apiClient';
import { API_BASE_URL } from '../utils/apiConfig';
import { GameInsightData } from './GameInsight';
import LiveAIInsight from './LiveAIInsight';
import LeadChangeDialog, { LeadChangeExplanation } from './LeadChangeDialog';
import KeyMomentBadge from './KeyMomentBadge';
import { KeyMoment, WinProbability } from '../types/scoreboard';
import MomentumChart from './MomentumChart';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { Fade } from '@mui/material';

interface GameRowProps {
  game: Game | GameSummary;
  onClick?: () => void;
  isRecentlyUpdated?: boolean;
  isSelected?: boolean;
  onOpenBoxScore?: (gameId: string) => void;
  onOpenPlayByPlay?: (gameId: string) => void;
  insight?: GameInsightData | null;
  keyMoment?: KeyMoment | null;
  winProbability?: WinProbability | null;
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
  keyMoment,
  winProbability,
}) => {
  const theme = useTheme();
  const [leadChangeDialogOpen, setLeadChangeDialogOpen] = React.useState(false);
  const [leadChangeExplanation, setLeadChangeExplanation] = React.useState<LeadChangeExplanation | null>(null);
  const navigate = useNavigate();
  const isLiveGame = 'homeTeam' in game;
  const gameId = isLiveGame ? game.gameId : game.game_id;
  const [lastPlay, setLastPlay] = useState<PlayByPlayEvent | null>(null);
  // Momentum visualization state
  const [showMomentum, setShowMomentum] = useState(false); // Whether momentum chart is expanded
  const [momentumPlays, setMomentumPlays] = useState<PlayByPlayEvent[]>([]); // All plays for momentum chart
  const [loadingMomentum, setLoadingMomentum] = useState(false); // Loading state for fetching play-by-play
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
      // For live games, try gameEt first (Eastern Time), then gameTimeUTC
      if (game.gameEt) {
        try {
          const parsed = parseISO(game.gameEt);
          if (!isNaN(parsed.getTime())) {
            return format(parsed, 'h:mm a');
          }
        } catch {
          // Continue to next option
        }
      }
      if (game.gameTimeUTC) {
        try {
          const parsed = parseISO(game.gameTimeUTC);
          if (!isNaN(parsed.getTime())) {
            return format(parsed, 'h:mm a');
          }
        } catch {
          // Continue to next option
        }
      }
      return 'TBD';
    }
    // For GameSummary (future/past games), check game_time_utc first
    // The API provides this field for scheduled games
    if (game.game_time_utc && game.game_time_utc.trim() !== '') {
      try {
        // Try parsing as ISO string first
        let parsed = parseISO(game.game_time_utc);
        
        // If that fails or results in invalid date, try other formats
        if (isNaN(parsed.getTime())) {
          // Try parsing as date string with time
          parsed = new Date(game.game_time_utc);
        }
        
        // Verify it's a valid date
        if (!isNaN(parsed.getTime())) {
          // Check if it has time information (not just date)
          // Even if it's midnight, we can still show the time
          return format(parsed, 'h:mm a');
        }
      } catch (error) {
        // Continue to next option
        console.debug('Failed to parse game_time_utc:', game.game_time_utc, error);
      }
    }
    // Also check if there's a gameTimeUTC field (some API responses might use this)
    if ('gameTimeUTC' in game && game.gameTimeUTC && typeof game.gameTimeUTC === 'string') {
      try {
        const parsed = parseISO(game.gameTimeUTC);
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'h:mm a');
        }
      } catch {
        // Continue
      }
    }
    // Fallback to game_date if it has time information
    if (game.game_date) {
      try {
        const parsed = parseISO(game.game_date);
        // Check if it's a valid date
        if (!isNaN(parsed.getTime())) {
          // Check if it has time information (not exactly midnight)
          if (parsed.getHours() !== 0 || parsed.getMinutes() !== 0) {
            return format(parsed, 'h:mm a');
          }
          // Even if midnight, if it's a future game, we might want to show it
          // But for now, only show if it has actual time info
        }
      } catch {
        // Continue
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
    if (!isLive || !isLiveGame || !gameId) return;

    const service = new PlayByPlayWebSocketService();
    pbpServiceRef.current = service;

    const handleUpdate = (data: PlayByPlayResponse) => {
      if (data?.plays && data.plays.length > 0) {
        const sorted = [...data.plays].sort((a, b) => b.action_number - a.action_number);
        setLastPlay(sorted[0]);
        // Store all plays for momentum chart if it's visible
        // This allows the momentum visualization to update in real-time for live games
        if (showMomentum) {
          setMomentumPlays(data.plays);
        }
      }
    };

    service.connect(gameId);
    service.subscribe(handleUpdate);

    return () => {
      service.unsubscribe(handleUpdate);
      service.disconnect();
    };
  }, [isLive, isLiveGame, gameId, showMomentum]);

  // Fetch play-by-play data when momentum chart is expanded
  // For completed games, we fetch via REST API. For live games, WebSocket provides the data.
  // Only fetch if we don't already have the data to avoid unnecessary API calls.
  useEffect(() => {
    if (!showMomentum || !gameId || momentumPlays.length > 0) return;

    const fetchPlayByPlay = async () => {
      setLoadingMomentum(true);
      try {
        const data = await fetchJson<PlayByPlayResponse>(
          `${API_BASE_URL}/api/v1/scoreboard/game/${gameId}/play-by-play`,
          {},
          { maxRetries: 2, retryDelay: 1000, timeout: 30000 }
        );
        if (data?.plays && data.plays.length > 0) {
          setMomentumPlays(data.plays);
        }
      } catch (error) {
        console.error('Failed to fetch play-by-play for momentum:', error);
      } finally {
        setLoadingMomentum(false);
      }
    };

    fetchPlayByPlay();
  }, [showMomentum, gameId, momentumPlays.length]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        backgroundColor: 'background.paper',
        borderRadius: borderRadius.md,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        // Subtle shadow for depth
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        transition: transitions.normal,
        minHeight: { xs: 100, sm: 110 }, // Fixed min height to prevent layout shifts
        '&:hover': onClick ? {
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
        } : {},
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
          minHeight: { xs: 100, sm: 110 }, // Fixed min height to prevent layout shifts
          cursor: onClick ? 'pointer' : (isUpcoming ? 'not-allowed' : 'default'),
          opacity: isUpcoming ? 0.7 : 1,
          backgroundColor: isSelected 
            ? alpha(theme.palette.primary.main, 0.06)
            : 'transparent',
          transition: transitions.normal,
          ...(isRecentlyUpdated && {
            animation: 'scoreUpdateFlash 0.6s ease-out',
            '@keyframes scoreUpdateFlash': {
              '0%': { backgroundColor: 'transparent' },
              '50%': { backgroundColor: alpha(theme.palette.primary.main, 0.1) },
              '100%': { backgroundColor: 'transparent' },
            },
          }),
          '&:hover': onClick
            ? {
                backgroundColor: isSelected 
                  ? alpha(theme.palette.primary.main, 0.08)
                  : 'action.hover',
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
            fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
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
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
                  fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
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
                fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
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
                fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
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
                  fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
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
                fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
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
      </Box>

      {/* Game Leaders / Players to Watch */}
      {gameLeaders && (gameLeaders.homeLeaders || gameLeaders.awayLeaders) && (
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1.5, sm: 2 },
            pl: { xs: 2, sm: 2.5 },
            pr: { xs: 1.5, sm: 2 },
            pb: { xs: 0.75, sm: 1 },
            mb: 0, // Remove bottom margin to reduce gap
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
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
              <LeaderPreview leader={gameLeaders.awayLeaders} teamTricode={awayTeam || ''} navigate={navigate} isLive={isLive} isFinal={isFinal} />
            )}
            {gameLeaders.homeLeaders && gameLeaders.homeLeaders.name && (
              <LeaderPreview leader={gameLeaders.homeLeaders} teamTricode={homeTeam || ''} navigate={navigate} isLive={isLive} isFinal={isFinal} />
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
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                  color: 'text.primary',
                  fontWeight: typography.weight.medium,
                  lineHeight: 1.4,
                }}
              >
                {lastPlay.team_tricode ? `${lastPlay.team_tricode} - ` : ''}{lastPlay.description}
              </Typography>
            </Box>
          )}

          {/* Center Zone: Key Moment Badge and Win Probability */}
          {/* Show badges when key moments are detected or win probability is available */}
          {(keyMoment || winProbability) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                flexShrink: 0,
              }}
            >
              {/* Win Probability Indicator - Compact chip style matching KeyMomentBadge */}
              {winProbability && (
                <Fade in={true} timeout={300}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.25,
                      py: 0.5,
                      borderRadius: borderRadius.xs,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                      height: 24,
                      transition: transitions.normal,
                    }}
                  >
                    {/* Compact progress bar */}
                    <Box
                      sx={{
                        display: 'flex',
                        width: 32,
                        height: 4,
                        borderRadius: borderRadius.xs,
                        overflow: 'hidden',
                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      }}
                    >
                      <Box
                        sx={{
                          flex: winProbability.away_win_prob,
                          backgroundColor: winProbability.away_win_prob > winProbability.home_win_prob
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.4),
                          transition: transitions.smooth,
                        }}
                      />
                      <Box
                        sx={{
                          flex: winProbability.home_win_prob,
                          backgroundColor: winProbability.home_win_prob > winProbability.away_win_prob
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.4),
                          transition: transitions.smooth,
                        }}
                      />
                    </Box>
                    {/* Percentage text */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
                        fontWeight: typography.weight.semibold,
                        color: alpha(theme.palette.primary.main, 0.9),
                        whiteSpace: 'nowrap',
                        minWidth: 28,
                      }}
                    >
                      {winProbability.home_win_prob > winProbability.away_win_prob
                        ? `${(winProbability.home_win_prob * 100).toFixed(0)}%`
                        : `${(winProbability.away_win_prob * 100).toFixed(0)}%`}
                    </Typography>
                  </Box>
                </Fade>
              )}
              
              {/* Key Moment Badge */}
              {keyMoment && <KeyMomentBadge moment={keyMoment} />}
            </Box>
          )}

          {/* Right Zone: Action Buttons */}
          {(onOpenBoxScore || onOpenPlayByPlay || (isLive || isFinal)) && (
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
              {(isLive || isFinal) && (
                <Button
                  variant={showMomentum ? "contained" : "outlined"}
                  size="small"
                  startIcon={showMomentum ? <TrendingDown /> : <TrendingUp />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMomentum(!showMomentum);
                  }}
                  sx={{
                    borderRadius: borderRadius.sm,
                    textTransform: 'none',
                    fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                    px: { xs: 1.5, sm: spacing.md },
                    py: { xs: 1, sm: spacing.xs },
                    minWidth: { xs: 44, sm: 'auto', md: 100 },
                    minHeight: { xs: 44, sm: 32 },
                  }}
                >
                  Momentum
                </Button>
              )}
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
                    fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                    px: { xs: 1.5, sm: spacing.md },
                    py: { xs: 1, sm: spacing.xs },
                    minWidth: { xs: 44, sm: 'auto', md: 100 },
                    minHeight: { xs: 44, sm: 32 },
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
                    fontSize: { xs: typography.size.caption.xs, sm: typography.size.caption.sm },
                    px: { xs: 1.5, sm: spacing.md },
                    py: { xs: 1, sm: spacing.xs },
                    minWidth: { xs: 44, sm: 'auto', md: 120 },
                    minHeight: { xs: 44, sm: 32 },
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
            pt: 1.5,
            pb: { xs: 1.5, sm: 2 },
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <LiveAIInsight
            insight={insight && insight.type !== 'none' && insight.text ? insight : null}
            onWhyClick={insight?.type === 'lead_change' ? async () => {
              try {
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

      {/* Momentum Chart Section - Expandable */}
      {/* Shows a visual timeline of score differential over time, with lead changes and scoring runs marked */}
      {/* Only available for live or completed games (not upcoming games) */}
      {showMomentum && (isLive || isFinal) && (
        <Box
          sx={{
            pl: { xs: 2, sm: 2.5 },
            pr: { xs: 1.5, sm: 2 },
            pt: { xs: 2, sm: 2.5 },
            pb: { xs: 1.5, sm: 2 },
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {loadingMomentum ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : momentumPlays.length > 0 ? (
            <MomentumChart
              plays={momentumPlays}
              homeTeam={homeTeamName || homeTeam || 'Home'}
              awayTeam={awayTeamName || awayTeam || 'Away'}
            />
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: borderRadius.md,
              }}
            >
              <Typography variant="body2" color="text.secondary" textAlign="center">
                No play-by-play data available for momentum chart
              </Typography>
            </Paper>
          )}
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
  isFinal?: boolean;
}

const LeaderPreview: React.FC<LeaderPreviewProps> = ({ leader, teamTricode, navigate, isLive = false, isFinal = false }) => {
  if (!leader) return null;

  const isValidPlayerId = leader.personId && leader.personId > 0;
  const avatarUrl = isValidPlayerId
    ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.personId}.png`
    : '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isValidPlayerId) navigate(`/player/${leader.personId}`);
  };

  const displayName = leader.name || 'N/A';

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
                fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
                color: 'text.secondary',
              }}
            >
              #{leader.jerseyNum}
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{
              fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
              color: 'text.secondary',
            }}
          >
            - {teamTricode}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: { xs: typography.size.captionSmall.xs, sm: typography.size.captionSmall.sm },
            color: 'text.secondary',
            display: 'block',
            fontFamily: 'monospace',
          }}
        >
          {isLive || isFinal
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

