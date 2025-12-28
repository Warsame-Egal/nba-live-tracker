import { useEffect, useState, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import PlayByPlayWebSocketService from '../services/PlayByPlayWebSocketService';
import { PlayByPlayResponse, PlayByPlayEvent } from '../types/playbyplay';

/**
 * Component that displays play-by-play events for a game.
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
      if (data?.plays?.length > 0) {
        // Sort plays by action number and reverse so newest is at top
        const sorted = [...data.plays].sort((a, b) => a.action_number - b.action_number);
        setActions(sorted.reverse());
      } else {
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
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="text.secondary">
          No play-by-play data available.
        </Typography>
      </Box>
    );
  }

  // Don't show anything until we get some data
  if (!actions.length) {
    return null;
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        maxHeight: '70vh',
        overflow: 'auto',
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Clock</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Team</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {actions.map((play) => (
            <TableRow
              key={play.action_number}
              sx={{
                '&:nth-of-type(even)': {
                  backgroundColor: 'action.hover',
                },
                '&:hover': {
                  backgroundColor: 'action.selected',
                },
              }}
            >
              <TableCell>{formatClock(play.clock)}</TableCell>
              <TableCell>{play.team_tricode || '-'}</TableCell>
              <TableCell sx={{ color: 'primary.light', fontWeight: 500 }}>
                {play.score_home ?? '-'} - {play.score_away ?? '-'}
              </TableCell>
              <TableCell>{play.action_type}</TableCell>
              <TableCell>{play.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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
