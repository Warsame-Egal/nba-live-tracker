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

const PlayByPlay = ({ gameId }: { gameId: string }) => {
  const [actions, setActions] = useState<PlayByPlayEvent[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const socketRef = useRef<PlayByPlayWebSocketService | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const service = new PlayByPlayWebSocketService();
    socketRef.current = service;

    const handleUpdate = (data: PlayByPlayResponse) => {
      setHasLoadedOnce(true);
      if (data?.plays?.length > 0) {
        const sorted = [...data.plays].sort((a, b) => a.action_number - b.action_number);
        setActions(sorted.reverse());
      } else {
        setActions([]);
      }
    };

    service.connect(gameId);
    service.subscribe(handleUpdate);

    return () => {
      service.unsubscribe(handleUpdate);
      service.disconnect();
    };
  }, [gameId]);

  if (!actions.length && hasLoadedOnce) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="text.secondary">
          No play-by-play data available.
        </Typography>
      </Box>
    );
  }

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

const formatClock = (clock: string | null): string => {
  if (!clock) return '';
  if (clock.startsWith('PT')) {
    const match = clock.match(/PT(\d+)M(\d+(\.\d+)?)S/);
    if (match) return `${match[1]}:${parseFloat(match[2]).toFixed(0).padStart(2, '0')}`;
    const minutesOnly = clock.match(/PT(\d+)M/);
    if (minutesOnly) return `${minutesOnly[1]}:00`;
    const secondsOnly = clock.match(/PT(\d+)S/);
    if (secondsOnly) return `0:${secondsOnly[1].padStart(2, '0')}`;
  }
  return clock;
};

export default PlayByPlay;
