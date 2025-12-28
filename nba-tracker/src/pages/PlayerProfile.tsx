import React, { useEffect, useState } from 'react';
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
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { PlayerSummary } from '../types/player';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Navbar from '../components/Navbar';

// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Page that shows detailed information about a specific player.
 * Displays player stats, recent games, and personal information.
 */
const PlayerProfile: React.FC = () => {
  // Get the player ID from the URL
  const { playerId } = useParams<{ playerId: string }>();
  // The player data
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  // Whether we're loading the player data
  const [loading, setLoading] = useState(true);
  // Error message if something goes wrong
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch player data when the component loads or player ID changes.
   */
  useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/player/${playerId}`);
        if (!response.ok) throw new Error('Failed to fetch player');
        const data: PlayerSummary = await response.json();
        setPlayer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
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

  // Show message if player not found
  if (!player) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navbar />
        <Container sx={{ py: 4 }}>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Player not found.
          </Typography>
        </Container>
      </Box>
    );
  }

  // Calculate player's full name and years of experience
  const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`;
  const experience =
    player.FROM_YEAR && player.TO_YEAR ? `${player.TO_YEAR - player.FROM_YEAR} Years` : 'N/A';

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 5 } }}>
        {/* Header section with player photo and basic info */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: 4,
            mb: 5,
          }}
        >
          {/* Player photo */}
          <Avatar
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.PERSON_ID}.png`}
            alt={fullName}
            sx={{
              width: { xs: 180, sm: 220, md: 260 },
              height: { xs: 180, sm: 220, md: 260 },
              backgroundColor: 'transparent',
              border: '3px solid',
              borderColor: 'divider',
            }}
            onError={e => ((e.target as HTMLImageElement).src = '/fallback-player.png')}
          />

          {/* Player information */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                mb: 1,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                lineHeight: 1.1,
              }}
            >
              {player.PLAYER_FIRST_NAME}
              <br />
              {player.PLAYER_LAST_NAME}
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', mb: 4, fontWeight: 500 }}
            >
              {player.TEAM_NAME ?? 'Free Agent'} • #{player.JERSEY_NUMBER ?? 'N/A'} •{' '}
              {player.POSITION ?? 'N/A'}
            </Typography>

            {/* Player details grid */}
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <InfoItem label="Height" value={player.HEIGHT ?? 'N/A'} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoItem label="Weight" value={player.WEIGHT ? `${player.WEIGHT} lb` : 'N/A'} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoItem label="Country" value={player.COUNTRY ?? 'N/A'} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoItem label="College" value={player.COLLEGE ?? 'N/A'} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <InfoItem label="Experience" value={experience} />
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Key stats cards (points, rebounds, assists per game) */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} sm={4}>
            <StatCard label="Points Per Game" value={player.PTS} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard label="Rebounds Per Game" value={player.REB} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard label="Assists Per Game" value={player.AST} />
          </Grid>
        </Grid>

        {/* Recent games table */}
        {player.recent_games && player.recent_games.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Recent Games
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
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Opponent</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      PTS
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      REB
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      AST
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      STL
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      BLK
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {player.recent_games.map(game => (
                    <TableRow
                      key={game.game_id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        },
                      }}
                    >
                      <TableCell>
                        {format(new Date(game.date), 'MMM dd, yyyy', { locale: enUS })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{game.opponent_team_abbreviation}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {game.points}
                      </TableCell>
                      <TableCell align="center">{game.rebounds}</TableCell>
                      <TableCell align="center">{game.assists}</TableCell>
                      <TableCell align="center">{game.steals}</TableCell>
                      <TableCell align="center">{game.blocks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>
    </Box>
  );
};

/**
 * Component to display a stat card (like points per game).
 */
const StatCard: React.FC<{ label: string; value?: number }> = ({ label, value }) => (
  <Card
    elevation={0}
    sx={{
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      height: '100%',
    }}
  >
    <CardContent>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          display: 'block',
          mb: 1,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          fontSize: { xs: '2rem', sm: '2.5rem' },
          lineHeight: 1,
        }}
      >
        {value ?? 'N/A'}
      </Typography>
    </CardContent>
  </Card>
);

/**
 * Component to display a label and value (like Height: 6'8").
 */
const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 600,
        display: 'block',
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 500 }}>
      {value}
    </Typography>
  </Box>
);

export default PlayerProfile;
