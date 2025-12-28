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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

const TeamPage = () => {
  const { team_id } = useParams<{ team_id: string }>();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/teams/${team_id}`);
        if (!res.ok) throw new Error('Failed to fetch team details');
        const data = await res.json();
        setTeam(data);

        const rosterRes = await fetch(
          `${API_BASE_URL}/api/v1/scoreboard/team/${team_id}/roster/2024-25`,
        );
        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          setRoster(rosterData);
        }
      } catch (err) {
        setError(`Failed to load team information. ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [team_id]);

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

  if (!team) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navbar />
        <Container sx={{ py: 4 }}>
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: 4,
            mb: 4,
          }}
        >
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

          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              {team.team_name}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 3 }}>
              {team.team_city}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2,
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

        {roster?.players?.length ? (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Roster
            </Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
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

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block' }}>
      {label}:
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export default TeamPage;
