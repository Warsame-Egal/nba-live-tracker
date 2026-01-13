import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
  Skeleton,
  Alert,
} from '@mui/material';
import { PlayerSummary } from '../types/player';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import PlayerPerformanceChart from '../components/PlayerPerformanceChart';
import PlayerBanner from '../components/PlayerBanner';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PlayerGameLogResponse } from '../types/playergamelog';
import { typography } from '../theme/designTokens';

import { API_BASE_URL } from '../utils/apiConfig';

// Player profile page with stats, game log, and performance charts
const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [gameLog, setGameLog] = useState<PlayerGameLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const season = searchParams.get('season') || getCurrentSeason();

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

  // Always render page structure to prevent layout shifts

  const experience =
    player?.FROM_YEAR && player?.TO_YEAR ? `${player.TO_YEAR - player.FROM_YEAR} Years` : 'N/A';

  return (
    <Box sx={{ 
      minHeight: '100dvh', 
      backgroundColor: 'background.default', 
      display: 'flex', 
      flexDirection: 'column',
      maxWidth: '100vw',
      overflowX: 'hidden',
      overflowY: 'visible',
      width: '100%',
    }}>
      <Navbar />
      <Box sx={{ 
        maxWidth: '1400px', 
        mx: 'auto', 
        px: { xs: 1, sm: 2, md: 3, lg: 4 }, 
        py: { xs: 2, sm: 3 },
        width: '100%',
        overflowX: 'hidden',
      }}>
        {loading ? (
          <Box sx={{ minHeight: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ minHeight: 100 }}>{error}</Alert>
        ) : !player ? (
          <Box sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Player not found.
            </Typography>
          </Box>
        ) : (
          <>
            <PlayerBanner
          playerId={player.PERSON_ID}
          firstName={player.PLAYER_FIRST_NAME}
          lastName={player.PLAYER_LAST_NAME}
          teamCity={player.TEAM_CITY}
          teamName={player.TEAM_NAME}
          jerseyNumber={player.JERSEY_NUMBER}
          position={player.POSITION}
          stats={{
            ppg: player.PTS,
            rpg: player.REB,
            apg: player.AST,
          }}
          height={player.HEIGHT}
          weight={player.WEIGHT}
          country={player.COUNTRY}
          school={player.COLLEGE}
          age={player.FROM_YEAR && player.TO_YEAR ? new Date().getFullYear() - player.FROM_YEAR : undefined}
          birthdate={undefined}
          draft={player.FROM_YEAR ? `${player.FROM_YEAR} R1 Pick 23` : undefined}
          experience={experience}
        />
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
                p: 3, // Material 3: 24dp padding
                backgroundColor: 'background.paper', // Material 3: surface
                border: '1px solid',
                borderColor: 'divider', // Material 3: outline
                borderRadius: 1.5, // Material 3: 12dp
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
              <Box sx={{ 
                overflowX: 'auto', 
                WebkitOverflowScrolling: 'touch',
                width: '100%',
                maxWidth: '100%',
              }}>
                <TableContainer
                  sx={{
                    overflowX: 'auto',
                    width: '100%',
                    maxWidth: '100%',
                  }}
                >
                  <Table size="small" sx={{ 
                    width: '100%',
                    tableLayout: { xs: 'fixed', sm: 'auto' },
                  }}>
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
              </Box>
            </Paper>
          </Box>
        )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default PlayerProfile;
