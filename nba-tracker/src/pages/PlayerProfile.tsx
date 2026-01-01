import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import Navbar from '../components/Navbar';
import PlayersSidebar from '../components/PlayersSidebar';
import PlayerPerformanceChart from '../components/PlayerPerformanceChart';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PlayerGameLogResponse } from '../types/playergamelog';
import { typography, borderRadius } from '../theme/designTokens';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Player profile page displaying detailed player information, statistics, game log,
 * and performance charts. Features a right-side sidebar for player search and navigation.
 */
const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [gameLog, setGameLog] = useState<PlayerGameLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>('PTS');

  const season = searchParams.get('season') || getCurrentSeason();

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams({ season: newSeason });
  };

  /**
   * Fetch player data when the component loads or player ID changes.
   */
  useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson<PlayerSummary>(
          `${API_BASE_URL}/api/v1/player/${playerId}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setPlayer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  /**
   * Fetch game log data for charts when player ID or season changes.
   */
  useEffect(() => {
    if (!playerId) return;

    const fetchGameLog = async () => {
      try {
        const data = await fetchJson<PlayerGameLogResponse>(
          `${API_BASE_URL}/api/v1/player/${playerId}/game-log?season=${encodeURIComponent(season)}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setGameLog(data);
      } catch (err) {
        console.error('Error fetching game log:', err);
        // Don't set error state, just log it
      }
    };

    fetchGameLog();
  }, [playerId, season]);

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
          </Box>
          <Box
            sx={{
              width: 320,
              flexShrink: 0,
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              borderLeft: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              overflowY: 'auto',
            }}
          >
            <PlayersSidebar
              selectedStat={selectedStat}
              onStatChange={setSelectedStat}
              season={season}
              onSeasonChange={handleSeasonChange}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  // Show error message if something went wrong
  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Container sx={{ flex: 1, py: { xs: 4, sm: 5 }, px: { xs: 2, sm: 3 } }}>
            <Alert severity="error">{error}</Alert>
          </Container>
          <Box
            sx={{
              width: 320,
              flexShrink: 0,
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              borderLeft: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              overflowY: 'auto',
            }}
          >
            <PlayersSidebar
              selectedStat={selectedStat}
              onStatChange={setSelectedStat}
              season={season}
              onSeasonChange={handleSeasonChange}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  // Show message if player not found
  if (!player) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Container sx={{ flex: 1, py: { xs: 4, sm: 5 }, px: { xs: 2, sm: 3 } }}>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Player not found.
            </Typography>
          </Container>
          <Box
            sx={{
              width: 320,
              flexShrink: 0,
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              borderLeft: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              overflowY: 'auto',
            }}
          >
            <PlayersSidebar
              selectedStat={selectedStat}
              onStatChange={setSelectedStat}
              season={season}
              onSeasonChange={handleSeasonChange}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`;
  const experience =
    player.FROM_YEAR && player.TO_YEAR ? `${player.TO_YEAR - player.FROM_YEAR} Years` : 'N/A';

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'background.default',
          }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5, md: 6 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: borderRadius.md,
            mb: { xs: 4, sm: 5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'center', md: 'flex-start' },
              gap: { xs: 3, sm: 4 },
            }}
            >
            <Avatar
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.PERSON_ID}.png`}
              alt={fullName}
              sx={{
                width: { xs: 120, sm: 140, md: 160 },
                height: { xs: 120, sm: 140, md: 160 },
                backgroundColor: 'transparent',
                border: '2px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
              onError={e => ((e.target as HTMLImageElement).src = '/fallback-player.png')}
            />

            <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: typography.weight.bold,
                  mb: 1,
                  fontSize: { xs: typography.size.h4.xs, sm: typography.size.h4.sm, md: typography.size.h4.md },
                  lineHeight: typography.lineHeight.tight,
                }}
              >
                {player.PLAYER_FIRST_NAME} {player.PLAYER_LAST_NAME}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  mb: { xs: 2, sm: 3 },
                  fontWeight: typography.weight.medium,
                  fontSize: typography.size.body,
                }}
              >
                {player.TEAM_NAME ?? 'Free Agent'} • #{player.JERSEY_NUMBER ?? 'N/A'} •{' '}
                {player.POSITION ?? 'N/A'}
              </Typography>

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
        </Paper>

        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 4, sm: 5 } }}>
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

        {/* Performance Trend Chart */}
        {gameLog && gameLog.games.length > 0 && (
          <Box sx={{ mb: { xs: 4, sm: 5 } }}>
            <PlayerPerformanceChart data={gameLog} />
          </Box>
        )}

        {/* Game Log */}
        {gameLog && gameLog.games.length > 0 && (
          <Box sx={{ mb: { xs: 4, sm: 5 } }}>
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
              <Typography
                variant="h6"
                sx={{
                  fontWeight: typography.weight.bold,
                  mb: 3,
                  fontSize: typography.size.h6,
                }}
              >
                Game Log
              </Typography>
              <TableContainer
                sx={{
                  overflowX: 'auto',
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: typography.weight.bold }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.bold }}>Opponent</TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        Result
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        MIN
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        PTS
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        REB
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        AST
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        STL
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        BLK
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        TO
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        FG
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        3P
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        FT
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>
                        +/-
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gameLog.games.slice(0, 20).map(game => {
                      // Parse matchup to get opponent (e.g., "LAL @ GSW" -> "GSW" or "LAL vs. GSW" -> "GSW")
                      let opponent = game.matchup;
                      if (game.matchup.includes('@')) {
                        opponent = game.matchup.split('@')[1]?.trim() || game.matchup;
                      } else if (game.matchup.includes('vs')) {
                        opponent = game.matchup.split(/vs\.?/)[1]?.trim() || game.matchup;
                      }
                      
                      const gameDate = format(new Date(game.game_date), 'MMM d');
                      const result = game.win_loss || '-';
                      
                      const fgMade = game.field_goals_made ?? 0;
                      const fgAttempted = game.field_goals_attempted ?? 0;
                      const fgFormatted = fgAttempted > 0 ? `${fgMade}/${fgAttempted}` : '-';
                      const threeMade = game.three_pointers_made ?? 0;
                      const threeAttempted = game.three_pointers_attempted ?? 0;
                      const threeFormatted = threeAttempted > 0 ? `${threeMade}/${threeAttempted}` : '-';
                      
                      // Format FT (free throws made/attempted)
                      const ftMade = game.free_throws_made ?? 0;
                      const ftAttempted = game.free_throws_attempted ?? 0;
                      const ftFormatted = ftAttempted > 0 ? `${ftMade}/${ftAttempted}` : '-';
                      
                      const plusMinus = game.plus_minus !== undefined && game.plus_minus !== null 
                        ? (game.plus_minus > 0 ? `+${game.plus_minus}` : game.plus_minus.toString())
                        : '-';
                      
                      return (
                        <TableRow
                          key={game.game_id}
                          sx={{
                            transition: 'background-color 0.2s ease-in-out',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <TableCell>{gameDate}</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.semibold }}>
                            {opponent}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: typography.weight.semibold, color: result === 'W' ? 'success.main' : result === 'L' ? 'error.main' : 'text.secondary' }}>
                            {result}
                          </TableCell>
                          <TableCell align="center">{game.minutes || '-'}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: typography.weight.semibold }}>
                            {game.points}
                          </TableCell>
                          <TableCell align="center">{game.rebounds}</TableCell>
                          <TableCell align="center">{game.assists}</TableCell>
                          <TableCell align="center">{game.steals}</TableCell>
                          <TableCell align="center">{game.blocks}</TableCell>
                          <TableCell align="center">{game.turnovers}</TableCell>
                          <TableCell align="center">{fgFormatted}</TableCell>
                          <TableCell align="center">{threeFormatted}</TableCell>
                          <TableCell align="center">{ftFormatted}</TableCell>
                          <TableCell align="center" sx={{ color: game.plus_minus && game.plus_minus > 0 ? 'success.main' : game.plus_minus && game.plus_minus < 0 ? 'error.main' : 'text.primary' }}>
                            {plusMinus}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
          </Container>
        </Box>

        {/* Sidebar - Right Side */}
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderLeft: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            overflowY: 'auto',
          }}
        >
          <PlayersSidebar
            selectedStat={selectedStat}
            onStatChange={setSelectedStat}
            season={season}
            onSeasonChange={handleSeasonChange}
          />
        </Box>
      </Box>
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
        letterSpacing: typography.letterSpacing.widest,
        fontWeight: typography.weight.semibold,
        display: 'block',
        mb: 0.5,
        fontSize: typography.size.caption,
      }}
    >
      {label}
    </Typography>
    <Typography 
      variant="body2" 
      sx={{ 
        fontWeight: typography.weight.medium,
        fontSize: typography.size.body,
      }}
    >
      {value}
    </Typography>
  </Box>
);

export default PlayerProfile;
