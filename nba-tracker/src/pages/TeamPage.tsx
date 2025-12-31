import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
import { TeamRoster } from '../types/team';
import Navbar from '../components/Navbar';
import { fetchJson } from '../utils/apiClient';

// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Interface for team details from the API.
 */
interface TeamDetails {
  team_id: number;
  team_name: string;
  team_city: string;
  abbreviation: string;
  year_founded: number;
  arena: string;
  owner: string;
  general_manager: string;
  head_coach: string;
}

/**
 * Page that shows detailed information about a specific team.
 * Displays team info, roster, and other details.
 */
const TeamPage = () => {
  // Get the team ID from the URL
  const { team_id } = useParams<{ team_id: string }>();
  // The team data
  const [team, setTeam] = useState<TeamDetails | null>(null);
  // The team roster
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  // Whether we're loading the team data
  const [loading, setLoading] = useState(true);
  // Error message if something goes wrong
  const [error, setError] = useState('');

  /**
   * Fetch team data and roster when the component loads or team ID changes.
   */
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        // Get team details with retry
        const data = await fetchJson<TeamDetails>(
          `${API_BASE_URL}/api/v1/teams/${team_id}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setTeam(data);

        // Get team roster for the 2024-25 season (with retry)
        try {
          const rosterData = await fetchJson<TeamRoster>(
            `${API_BASE_URL}/api/v1/scoreboard/team/${team_id}/roster/2024-25`,
            {},
            { maxRetries: 2, retryDelay: 1000, timeout: 30000 }
          );
          setRoster(rosterData);
        } catch {
          // Roster is optional, continue without it
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [team_id]);

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: { xs: 8, sm: 10 } }}>
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
        <Container sx={{ py: { xs: 4, sm: 5 }, px: { xs: 2, sm: 3 } }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  // Show message if team not found
  if (!team) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navbar />
        <Container sx={{ py: { xs: 4, sm: 5 }, px: { xs: 2, sm: 3 } }}>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Team not found.
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5, md: 6 }, px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header section with team logo and info */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: { xs: 3, sm: 4 },
            mb: { xs: 4, sm: 5 },
          }}
        >
          {/* Team logo */}
          <Avatar
            src={`/logos/${team.abbreviation ?? team.team_id}.svg`}
            alt={team.team_name}
            sx={{
              width: { xs: 150, md: 200 },
              height: { xs: 150, md: 200 },
              backgroundColor: 'transparent',
            }}
            onError={e => ((e.target as HTMLImageElement).src = '/fallback-team.png')}
          />

          {/* Team information */}
          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: { xs: 1, sm: 1.5 },
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              {team.team_name}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                textTransform: 'uppercase',
                mb: { xs: 2.5, sm: 3 },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              {team.team_city}
            </Typography>

            {/* Team details grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: { xs: 2, sm: 2.5 },
              }}
            >
              <InfoItem label="Founded" value={team.year_founded?.toString() ?? '—'} />
              <InfoItem label="Arena" value={team.arena ?? '—'} />
              <InfoItem label="Owner" value={team.owner ?? '—'} />
              <InfoItem label="GM" value={team.general_manager ?? '—'} />
              <InfoItem label="Coach" value={team.head_coach ?? '—'} />
            </Box>
          </Box>
        </Box>

        {/* Team roster table */}
        {roster?.players?.length ? (
          <Box sx={{ mt: { xs: 4, sm: 5 } }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: { xs: 2, sm: 2.5 },
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
              }}
            >
              Roster
            </Typography>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Height</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Weight</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Age</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Experience</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>School</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roster.players.map(player => (
                    <TableRow
                      key={player.player_id}
                      sx={{
                        transition: 'background-color 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <TableCell>{player.jersey_number}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell>{player.height}</TableCell>
                      <TableCell>{player.weight}</TableCell>
                      <TableCell>{player.age}</TableCell>
                      <TableCell>{player.experience}</TableCell>
                      <TableCell>{player.school}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}
      </Container>
    </Box>
  );
};

/**
 * Component to display a label and value (like Founded: 1946).
 */
const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block' }}>
      {label}:
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export default TeamPage;
