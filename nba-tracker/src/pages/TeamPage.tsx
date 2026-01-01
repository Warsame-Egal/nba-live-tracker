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
} from '@mui/material';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import TeamsSidebar from '../components/TeamsSidebar';
import TeamPerformanceChart from '../components/TeamPerformanceChart';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { TeamRoster } from '../types/team';
import { TeamGameLogResponse } from '../types/teamgamelog';
import { typography, borderRadius } from '../theme/designTokens';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface TeamDetails {
  team_id: number;
  team_name: string;
  team_city: string;
  abbreviation: string;
  year_founded: number;
  arena: string;
  arena_capacity?: number;
  owner: string;
  general_manager: string;
  head_coach: string;
}

const TeamPage = () => {
  const { team_id } = useParams<{ team_id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  const [gameLog, setGameLog] = useState<TeamGameLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const season = searchParams.get('season') || getCurrentSeason();

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams({ season: newSeason });
  };

  useEffect(() => {
    if (!team_id) return;

    const fetchTeamData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson<TeamDetails>(
          `${API_BASE_URL}/api/v1/teams/${team_id}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setTeam(data);

        try {
          const rosterData = await fetchJson<TeamRoster>(
            `${API_BASE_URL}/api/v1/scoreboard/team/${team_id}/roster/${season}`,
            {},
            { maxRetries: 2, retryDelay: 1000, timeout: 30000 }
          );
          setRoster(rosterData);
        } catch (err) {
          console.error('Error fetching team details:', err);
        }

        try {
          const gameLogData = await fetchJson<TeamGameLogResponse>(
            `${API_BASE_URL}/api/v1/teams/${team_id}/game-log?season=${encodeURIComponent(season)}`,
            {},
            { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
          );
          setGameLog(gameLogData);
        } catch (err) {
          console.error('Error fetching game log:', err);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [team_id, season]);

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
            <TeamsSidebar season={season} onSeasonChange={handleSeasonChange} />
          </Box>
        </Box>
      </Box>
    );
  }

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
            <TeamsSidebar season={season} onSeasonChange={handleSeasonChange} />
          </Box>
        </Box>
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Container sx={{ flex: 1, py: { xs: 4, sm: 5 }, px: { xs: 2, sm: 3 } }}>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Team not found.
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
            <TeamsSidebar season={season} onSeasonChange={handleSeasonChange} />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
                  src={`/logos/${team.abbreviation}.svg`}
                  alt={team.team_name}
                  sx={{
                    width: { xs: 120, sm: 140, md: 160 },
                    height: { xs: 120, sm: 140, md: 160 },
                    backgroundColor: 'transparent',
                    border: '2px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}
                  onError={e => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/logos/default.svg';
                  }}
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
                    {team.team_name}
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
                    {team.team_city} • {team.abbreviation}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <InfoItem label="Founded" value={team.year_founded?.toString() ?? 'N/A'} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <InfoItem label="Arena" value={team.arena ?? 'N/A'} />
                    </Grid>
                    {team.arena_capacity && (
                      <Grid item xs={6} sm={4}>
                        <InfoItem label="Arena Capacity" value={team.arena_capacity.toLocaleString()} />
                      </Grid>
                    )}
                    <Grid item xs={6} sm={4}>
                      <InfoItem label="Owner" value={team.owner ?? 'N/A'} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <InfoItem label="GM" value={team.general_manager ?? 'N/A'} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <InfoItem label="Coach" value={team.head_coach ?? 'N/A'} />
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Paper>

            {gameLog && gameLog.games.length > 0 && (
              <Box sx={{ mb: { xs: 4, sm: 5 } }}>
                <TeamPerformanceChart data={gameLog} />
              </Box>
            )}

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
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gameLog.games.map(game => {
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

                          const ftMade = game.free_throws_made ?? 0;
                          const ftAttempted = game.free_throws_attempted ?? 0;
                          const ftFormatted = ftAttempted > 0 ? `${ftMade}/${ftAttempted}` : '-';

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
                              <TableCell sx={{ fontWeight: typography.weight.medium }}>{gameDate}</TableCell>
                              <TableCell>{opponent}</TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight: typography.weight.semibold,
                                  color:
                                    result === 'W'
                                      ? 'success.main'
                                      : result === 'L'
                                        ? 'error.main'
                                        : 'text.secondary',
                                }}
                              >
                                {result}
                              </TableCell>
                              <TableCell align="center">{game.points}</TableCell>
                              <TableCell align="center">{game.rebounds}</TableCell>
                              <TableCell align="center">{game.assists}</TableCell>
                              <TableCell align="center">{game.steals}</TableCell>
                              <TableCell align="center">{game.blocks}</TableCell>
                              <TableCell align="center">{game.turnovers}</TableCell>
                              <TableCell align="center">{fgFormatted}</TableCell>
                              <TableCell align="center">{threeFormatted}</TableCell>
                              <TableCell align="center">{ftFormatted}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            )}

            {roster?.players?.length ? (
              <Box>
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
                    Roster
                  </Typography>
                  <TableContainer
                    sx={{
                      overflowX: 'auto',
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>#</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>Position</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>Height</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>Weight</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>Age</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>Experience</TableCell>
                          <TableCell sx={{ fontWeight: typography.weight.bold }}>School</TableCell>
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
                </Paper>
              </Box>
            ) : null}
          </Container>
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
          <TeamsSidebar season={season} onSeasonChange={handleSeasonChange} />
        </Box>
      </Box>
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
