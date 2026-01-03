import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import { TeamRoster, Player } from '../types/team';
import Navbar from '../components/Navbar';
import { logger } from '../utils/logger';
import { fetchJson } from '../utils/apiClient';

// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Team roster page showing all players with their info
const RosterPage = () => {
  const { team_id } = useParams<{ team_id: string }>();
  const [teamRoster, setTeamRoster] = useState<TeamRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeamRoster() {
      try {
        const data = await fetchJson<TeamRoster>(
          `${API_BASE_URL}/api/v1/scoreboard/team/${team_id}/roster/2024-25`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setTeamRoster(data);
      } catch (error) {
        logger.error('Error fetching team roster', error);
        setError('Failed to load team roster. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchTeamRoster();
  }, [team_id]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: { xs: 8, sm: 10 } }}>
            <CircularProgress />
          </Box>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
        {/* Page title */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: { xs: 3, sm: 4 },
            textAlign: 'center',
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
          }}
        >
          {teamRoster?.team_name} Roster
        </Typography>

        {/* Players table */}
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5, // Material 3: 12dp
              overflow: 'hidden',
              minWidth: { xs: 600, sm: 'auto' },
            }}
          >
            <Table sx={{ minWidth: { xs: 600, sm: 'auto' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Player</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>POS</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Age</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>HT</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>WT</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>College</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Experience</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamRoster?.players.map((player: Player) => (
                <TableRow
                  key={player.player_id}
                  sx={{
                    transition: 'background-color 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
                      <Avatar
                        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`}
                        alt={player.name}
                        sx={{ width: 40, height: 40 }}
                        onError={e => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png';
                        }}
                      />
                      <Typography variant="body2">{player.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{player.position || '--'}</TableCell>
                  <TableCell>{player.age || '--'}</TableCell>
                  <TableCell>{player.height || '--'}</TableCell>
                  <TableCell>{player.weight ? `${player.weight} lbs` : '--'}</TableCell>
                  <TableCell>{player.experience || '--'}</TableCell>
                  <TableCell>{player.school || '--'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      </Box>
    </Box>
  );
};

export default RosterPage;
