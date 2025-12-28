import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tabs,
  Tab,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { BoxScoreResponse, TeamBoxScoreStats, PlayerBoxScoreStats } from '../types/scoreboard';
import PlayByPlay from './PlayByPlay';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface GameDetailsModalProps {
  gameId: string | null;
  open: boolean;
  onClose: () => void;
}

const GameDetailsModal = ({ gameId, open, onClose }: GameDetailsModalProps) => {
  const [tab, setTab] = useState<'box' | 'play'>('box');
  const [boxScore, setBoxScore] = useState<BoxScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/scoreboard/game/${gameId}/boxscore`);
        const boxRes = await res.json();
        setBoxScore(boxRes);
      } catch (err) {
        console.error('Failed to fetch game details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [gameId]);

  const renderTeamStats = (team: TeamBoxScoreStats) => (
    <Box sx={{ mb: 3 }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 1.5,
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {team.team_name}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {team.score}
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>PLAYER</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  MIN
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  PTS
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  REB
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  AST
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  STL
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  BLK
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  TO
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {team.players.map((p: PlayerBoxScoreStats, idx) => (
                <TableRow key={idx} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell align="center">
                    {p.minutes?.replace('PT', '').replace('M', ':00') || '0:00'}
                  </TableCell>
                  <TableCell align="center">{p.points}</TableCell>
                  <TableCell align="center">{p.rebounds}</TableCell>
                  <TableCell align="center">{p.assists}</TableCell>
                  <TableCell align="center">{p.steals}</TableCell>
                  <TableCell align="center">{p.blocks}</TableCell>
                  <TableCell align="center">{p.turnovers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Game Details
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
            <Tab
              label="Box Score"
              value="box"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 48,
              }}
            />
            <Tab
              label="Play by Play"
              value="play"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 48,
              }}
            />
          </Tabs>
        </Box>
        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : tab === 'box' && boxScore ? (
            <>
              {renderTeamStats(boxScore.home_team)}
              {renderTeamStats(boxScore.away_team)}
            </>
          ) : tab === 'play' ? (
            <PlayByPlay gameId={gameId!} />
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">
                No data available.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GameDetailsModal;
