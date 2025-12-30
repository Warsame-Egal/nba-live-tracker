import { useEffect, useState, useRef } from 'react';
import { Box, Typography, Chip, Paper, Divider } from '@mui/material';
import { Sports, FiberManualRecord } from '@mui/icons-material';
import PlayByPlayWebSocketService from '../services/PlayByPlayWebSocketService';
import { PlayByPlayResponse, PlayByPlayEvent } from '../types/playbyplay';

/**
 * Modern play-by-play component that displays game events in a timeline format.
 * Shows all the game events (shots, fouls, timeouts, etc.) in real-time.
 * Connects to WebSocket to get live updates.
 */
const PlayByPlay = ({ gameId }: { gameId: string }) => {
  // List of all plays/events
  const [actions, setActions] = useState<PlayByPlayEvent[]>([]);
  // Whether we've received data at least once (to show empty state correctly)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // Reference to the WebSocket service
  const socketRef = useRef<PlayByPlayWebSocketService | null>(null);

  /**
   * Set up WebSocket connection when component loads or game ID changes.
   */
  useEffect(() => {
    if (!gameId) return;

    // Create a new WebSocket service for this game
    const service = new PlayByPlayWebSocketService();
    socketRef.current = service;

    // This function gets called whenever new play-by-play data arrives
    const handleUpdate = (data: PlayByPlayResponse) => {
      setHasLoadedOnce(true);
      if (data?.plays && data.plays.length > 0) {
        // Sort plays by action number and reverse so newest is at top
        const sorted = [...data.plays].sort((a, b) => a.action_number - b.action_number);
        setActions(sorted.reverse());
      } else {
        // Empty plays array - game hasn't started or no data available
        setActions([]);
      }
    };

    // Connect to WebSocket and subscribe to updates
    service.connect(gameId);
    service.subscribe(handleUpdate);

    // Cleanup: disconnect when component unmounts or game ID changes
    return () => {
      service.unsubscribe(handleUpdate);
      service.disconnect();
    };
  }, [gameId]);

  // Show message if no data available (but only after we've tried to load)
  if (!actions.length && hasLoadedOnce) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 6, sm: 8 },
          px: 3,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            mb: 3,
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.4 },
              '50%': { opacity: 0.8 },
            },
          }}
        >
          <Sports
            sx={{
              fontSize: 80,
              color: 'text.disabled',
              opacity: 0.3,
            }}
          />
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 1,
            textAlign: 'center',
            color: 'text.primary',
          }}
        >
          No Play-by-Play Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
          Play-by-play data is not available for this game. Game may not have started yet.
        </Typography>
      </Box>
    );
  }

  // Don't show anything until we get some data
  if (!actions.length) {
    return null;
  }

  // Group plays by period
  const playsByPeriod = actions.reduce((acc, play) => {
    const period = play.period || 0;
    if (!acc[period]) {
      acc[period] = [];
    }
    acc[period].push(play);
    return acc;
  }, {} as Record<number, PlayByPlayEvent[]>);

  const periods = Object.keys(playsByPeriod)
    .map(Number)
    .sort((a, b) => b - a); // Most recent period first

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 4 } }}>
      {periods.map((period, periodIdx) => {
        const periodPlays = playsByPeriod[period];
        const periodLabel = period === 0 ? 'OT' : period > 4 ? `${period}OT` : `Q${period}`;

        return (
          <Box key={period}>
            {/* Period header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                pb: 1.5,
                borderBottom: '2px solid',
                borderColor: 'divider',
              }}
            >
              <Chip
                label={periodLabel}
                size="small"
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {periodPlays.length} plays
              </Typography>
            </Box>

            {/* Timeline of plays */}
            <Box sx={{ position: 'relative', pl: { xs: 2, sm: 3 } }}>
              {/* Timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 6, sm: 10 },
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: 'divider',
                  opacity: 0.5,
                }}
              />

              {periodPlays.map((play) => {
                const isScore = play.action_type?.toLowerCase().includes('shot') || 
                                play.action_type?.toLowerCase().includes('free throw');
                const isImportant = isScore || play.action_type?.toLowerCase().includes('foul') ||
                                    play.action_type?.toLowerCase().includes('timeout');

                return (
                  <Box
                    key={play.action_number}
                    sx={{
                      position: 'relative',
                      mb: { xs: 2, sm: 2.5 },
                      pl: { xs: 3, sm: 4 },
                    }}
                  >
                    {/* Timeline dot */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: { xs: 2, sm: 6 },
                        top: 4,
                        width: { xs: 8, sm: 10 },
                        height: { xs: 8, sm: 10 },
                        borderRadius: '50%',
                        backgroundColor: isImportant ? 'primary.main' : 'divider',
                        border: '2px solid',
                        borderColor: 'background.default',
                        zIndex: 1,
                      }}
                    />

                    {/* Play card */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        backgroundColor: isImportant ? 'rgba(25, 118, 210, 0.05)' : 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: isImportant ? 'rgba(25, 118, 210, 0.1)' : 'action.hover',
                          transform: 'translateX(4px)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Header row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              {play.team_tricode && (
                                <Chip
                                  label={play.team_tricode}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  }}
                                />
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontWeight: 600,
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                }}
                              >
                                {formatClock(play.clock)}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isImportant ? 600 : 400,
                                fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                lineHeight: 1.4,
                              }}
                            >
                              {play.description || play.action_type}
                            </Typography>
                          </Box>
                          {/* Score */}
                          {play.score_home !== null && play.score_away !== null && (
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: 0.5,
                                flexShrink: 0,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'primary.main',
                                  fontWeight: 700,
                                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                }}
                              >
                                {play.score_away} - {play.score_home}
                              </Typography>
                              {isScore && (
                                <FiberManualRecord
                                  sx={{
                                    fontSize: 6,
                                    color: 'success.main',
                                    animation: 'pulse 1s ease-in-out infinite',
                                    '@keyframes pulse': {
                                      '0%, 100%': { opacity: 1 },
                                      '50%': { opacity: 0.5 },
                                    },
                                  }}
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
            </Box>

            {/* Divider between periods */}
            {periodIdx < periods.length - 1 && (
              <Divider sx={{ my: { xs: 3, sm: 4 } }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * Convert clock time from "PT10M30.5S" format to "10:30".
 * Handles different time formats from the NBA API.
 */
const formatClock = (clock: string | null): string => {
  if (!clock) return '';
  if (clock.startsWith('PT')) {
    // Try to match "PT10M30.5S" format
    const match = clock.match(/PT(\d+)M(\d+(\.\d+)?)S/);
    if (match) return `${match[1]}:${parseFloat(match[2]).toFixed(0).padStart(2, '0')}`;
    // Try to match "PT10M" format (minutes only)
    const minutesOnly = clock.match(/PT(\d+)M/);
    if (minutesOnly) return `${minutesOnly[1]}:00`;
    // Try to match "PT30S" format (seconds only)
    const secondsOnly = clock.match(/PT(\d+)S/);
    if (secondsOnly) return `0:${secondsOnly[1].padStart(2, '0')}`;
  }
  return clock;
};

export default PlayByPlay;
