import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
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

// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Page that shows the full roster (all players) for a team.
 * Displays player information like name, position, height, weight, etc.
 */
const RosterPage = () => {
  // Get the team ID from the URL
  const { team_id } = useParams<{ team_id: string }>();
  // The team roster data
  const [teamRoster, setTeamRoster] = useState<TeamRoster | null>(null);
  // Whether we're loading the roster
  const [loading, setLoading] = useState(true);
  // Error message if something goes wrong
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the team roster when the component loads or team ID changes.
   */
  useEffect(() => {
    async function fetchTeamRoster() {
      try {
        // Get roster for the 2024-25 season
        const response = await fetch(
          `${API_BASE_URL}/api/v1/scoreboard/team/${team_id}/roster/2024-25`,
        );

        if (!response.ok) throw new Error('Failed to fetch roster');

        const data = await response.json();
        setTeamRoster(data);
      } catch (error) {
        logger.error('Error fetching team roster', error);
        setError('Failed to load team roster.');
      } finally {
        setLoading(false);
      }
    }

    fetchTeamRoster();
  }, [team_id]);

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Show error message if something went wrong
  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navbar />
        <Container sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page title */}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
          {teamRoster?.team_name} Roster
        </Typography>

        {/* Players table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
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
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {/* Player photo */}
                      <Avatar
                        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`}
                        alt={player.name}
                        sx={{ width: 40, height: 40 }}
                        onError={e => {
                          // If player photo fails to load, use fallback
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
      </Container>
    </Box>
  );
};

export default RosterPage;
