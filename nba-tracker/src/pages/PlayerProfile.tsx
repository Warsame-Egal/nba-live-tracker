import React, { useEffect, useState, useMemo } from 'react';
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
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { PlayerSummary } from '../types/player';
import { format } from 'date-fns';
import PlayerPerformanceChart from '../components/PlayerPerformanceChart';
import PlayerBanner from '../components/PlayerBanner';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';
import { PlayerGameLogResponse } from '../types/playergamelog';
import { typography, borderRadius } from '../theme/designTokens';

import { API_BASE_URL } from '../utils/apiConfig';
import PageContainer from '../components/PageContainer';

// Player profile page with stats, game log, and performance charts
const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [gameLog, setGameLog] = useState<PlayerGameLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile sections (File 4.6)
  const [zonesData, setZonesData] = useState<{
    zones: Array<{
      zone: string;
      fg_pct: number;
      league_avg: number | null;
      diff_pct: number | null;
      freq_pct: number;
    }>;
  } | null>(null);
  const [clutchData, setClutchData] = useState<{
    regular: { ppg: number | null; fg_pct: number | null; gp: number };
    clutch: { ppg: number | null; fg_pct: number | null; gp: number };
    clutch_w_l: string | null;
    clutch_plus_minus: number | null;
    ppg_diff: number | null;
    fg_pct_diff: number | null;
  } | null>(null);
  const [splitsData, setSplitsData] = useState<Record<
    string,
    Array<Record<string, unknown>>
  > | null>(null);
  const [defenseData, setDefenseData] = useState<{
    defense: Array<Record<string, unknown>>;
  } | null>(null);
  const [passingData, setPassingData] = useState<{ passes: Array<Record<string, unknown>> } | null>(
    null,
  );
  const [yoyData, setYoyData] = useState<{ seasons: Array<Record<string, unknown>> } | null>(null);

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
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 },
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
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 },
        );
        setGameLog(data);
      } catch (err) {
        console.error('Error fetching game log:', err);
        // Don't set error state, just log it
      }
    };

    fetchGameLog();
  }, [playerId, season]);

  // Fetch profile sections when player and season are ready
  useEffect(() => {
    if (!playerId || !season) return;
    setZonesData(null);
    setClutchData(null);
    setSplitsData(null);
    setDefenseData(null);
    setPassingData(null);
    const base = `${API_BASE_URL}/api/v1/player/${playerId}`;
    const q = `?season=${encodeURIComponent(season)}`;

    const fetchZones = async () => {
      try {
        const res = await fetchJson<{
          zones: Array<{
            zone: string;
            fg_pct: number;
            league_avg: number | null;
            diff_pct: number | null;
            freq_pct: number;
          }>;
        }>(`${base}/shooting-zones${q}`, {}, { maxRetries: 1, timeout: 15000 });
        setZonesData(res);
      } catch {
        setZonesData(null);
      }
    };
    const fetchClutch = async () => {
      try {
        const res = await fetchJson<typeof clutchData>(
          `${base}/clutch${q}`,
          {},
          { maxRetries: 1, timeout: 15000 },
        );
        setClutchData(res);
      } catch {
        setClutchData(null);
      }
    };
    const fetchSplits = async () => {
      try {
        const res = await fetchJson<Record<string, Array<Record<string, unknown>>>>(
          `${base}/splits${q}`,
          {},
          { maxRetries: 1, timeout: 15000 },
        );
        setSplitsData(res);
      } catch {
        setSplitsData(null);
      }
    };
    const fetchDefense = async () => {
      try {
        const res = await fetchJson<{ defense: Array<Record<string, unknown>> }>(
          `${base}/defense${q}`,
          {},
          { maxRetries: 1, timeout: 15000 },
        );
        setDefenseData(res);
      } catch {
        setDefenseData(null);
      }
    };
    const fetchPassing = async () => {
      try {
        const res = await fetchJson<{ passes: Array<Record<string, unknown>> }>(
          `${base}/passing${q}`,
          {},
          { maxRetries: 1, timeout: 15000 },
        );
        setPassingData(res);
      } catch {
        setPassingData(null);
      }
    };
    fetchZones();
    fetchClutch();
    fetchSplits();
    fetchDefense();
    fetchPassing();
  }, [playerId, season]);

  useEffect(() => {
    if (!playerId) return;
    setYoyData(null);
    const fetchYoy = async () => {
      try {
        const res = await fetchJson<{ seasons: Array<Record<string, unknown>> }>(
          `${API_BASE_URL}/api/v1/player/${playerId}/year-over-year`,
          {},
          { maxRetries: 1, timeout: 15000 },
        );
        setYoyData(res);
      } catch {
        setYoyData(null);
      }
    };
    fetchYoy();
  }, [playerId]);

  const experience =
    player?.FROM_YEAR && player?.TO_YEAR ? `${player.TO_YEAR - player.FROM_YEAR} Years` : 'N/A';

  const last10ForSparkline = useMemo(() => {
    if (!gameLog?.games?.length) return [];
    return gameLog.games
      .slice(0, 10)
      .map(g => ({ pts: g.points }))
      .reverse();
  }, [gameLog]);

  const seasonShootingFromLog = useMemo(() => {
    if (!gameLog?.games?.length) return null;
    const games = gameLog.games;
    let fgm = 0,
      fga = 0,
      tpm = 0,
      tpa = 0,
      ftm = 0,
      fta = 0;
    games.forEach(g => {
      fgm += g.field_goals_made ?? 0;
      fga += g.field_goals_attempted ?? 0;
      tpm += g.three_pointers_made ?? 0;
      tpa += g.three_pointers_attempted ?? 0;
      ftm += g.free_throws_made ?? 0;
      fta += g.free_throws_attempted ?? 0;
    });
    return {
      fgPct: fga > 0 ? (fgm / fga) * 100 : null,
      threePct: tpa > 0 ? (tpm / tpa) * 100 : null,
      ftPct: fta > 0 ? (ftm / fta) * 100 : null,
    };
  }, [gameLog]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100vw',
        overflowX: 'hidden',
        overflowY: 'visible',
        width: '100%',
      }}
    >
      <PageContainer maxWidth={1400} sx={{ overflowX: 'hidden' }}>
        {loading ? (
          <Box sx={{ minHeight: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ minHeight: 100 }}>
            {error}
          </Alert>
        ) : !player ? (
          <Box
            sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
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
              age={
                player.FROM_YEAR && player.TO_YEAR
                  ? new Date().getFullYear() - player.FROM_YEAR
                  : undefined
              }
              birthdate={undefined}
              draft={player.FROM_YEAR ? `${player.FROM_YEAR} R1 Pick 23` : undefined}
              experience={experience}
            />

            {/* Last 10 games sparkline — above the fold on mobile */}
            {gameLog && gameLog.games && gameLog.games.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
                >
                  Last 10 games
                </Typography>
                <Box sx={{ width: '100%', height: 40, maxWidth: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={last10ForSparkline}
                      margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                    >
                      <Line
                        type="monotone"
                        dataKey="pts"
                        stroke="var(--mui-palette-primary-main)"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 300px' },
                gap: 3,
                alignItems: 'start',
              }}
            >
              <Box>
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
                        p: { xs: 2, sm: 3 }, // Material 3: 24dp padding
                        backgroundColor: 'background.paper', // Material 3: surface
                        border: '1px solid',
                        borderColor: 'divider', // Material 3: outline
                        borderRadius: borderRadius.md,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: typography.weight.bold,
                          mb: { xs: 2, sm: 3 },
                          fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.h6 },
                        }}
                      >
                        Game Log
                      </Typography>
                      <Box
                        sx={{
                          overflowX: 'auto',
                          WebkitOverflowScrolling: 'touch',
                          width: '100%',
                          maxWidth: '100%',
                        }}
                      >
                        <TableContainer
                          sx={{
                            overflowX: 'auto',
                            width: '100%',
                            maxWidth: '100%',
                            minWidth: { xs: 700, sm: 'auto' },
                            // Hide scrollbar on mobile (touch devices)
                            '@media (hover: hover)': {
                              '&::-webkit-scrollbar': {
                                height: 8,
                              },
                              '&::-webkit-scrollbar-track': {
                                backgroundColor: 'background.default',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'divider',
                                borderRadius: borderRadius.xs,
                                '&:hover': {
                                  backgroundColor: 'text.secondary',
                                },
                              },
                            },
                          }}
                        >
                          <Table
                            size="small"
                            sx={{
                              width: '100%',
                              tableLayout: 'auto',
                            }}
                          >
                            <TableHead>
                              <TableRow>
                                <TableCell
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  Date
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  Opponent
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  Result
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  MIN
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  PTS
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  REB
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  AST
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  STL
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  BLK
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  TO
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  FG
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  3P
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
                                  FT
                                </TableCell>
                                <TableCell
                                  align="center"
                                  sx={{
                                    fontWeight: typography.weight.semibold,
                                    py: { xs: 1.5, sm: 2.5 },
                                    px: { xs: 0.75, sm: 1.5 },
                                    fontSize: {
                                      xs: typography.size.caption.xs,
                                      sm: typography.editorial.helper.xs,
                                    },
                                    color: 'text.secondary',
                                  }}
                                >
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
                                const fgFormatted =
                                  fgAttempted > 0 ? `${fgMade}/${fgAttempted}` : '-';
                                const threeMade = game.three_pointers_made ?? 0;
                                const threeAttempted = game.three_pointers_attempted ?? 0;
                                const threeFormatted =
                                  threeAttempted > 0 ? `${threeMade}/${threeAttempted}` : '-';

                                const ftMade = game.free_throws_made ?? 0;
                                const ftAttempted = game.free_throws_attempted ?? 0;
                                const ftFormatted =
                                  ftAttempted > 0 ? `${ftMade}/${ftAttempted}` : '-';

                                const plusMinus =
                                  game.plus_minus !== undefined && game.plus_minus !== null
                                    ? game.plus_minus > 0
                                      ? `+${game.plus_minus}`
                                      : game.plus_minus.toString()
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
                                    <TableCell
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {gameDate}
                                    </TableCell>
                                    <TableCell
                                      sx={{
                                        fontWeight: typography.weight.semibold,
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {opponent}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        fontWeight: typography.weight.semibold,
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
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
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {game.minutes || '-'}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        fontWeight: typography.weight.semibold,
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {game.points}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {game.rebounds}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {game.assists}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {game.steals}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {game.blocks}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {game.turnovers}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {fgFormatted}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {threeFormatted}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                      }}
                                    >
                                      {ftFormatted}
                                    </TableCell>
                                    <TableCell
                                      align="center"
                                      sx={{
                                        py: { xs: 1.5, sm: 2 },
                                        px: { xs: 0.75, sm: 1.5 },
                                        fontSize: {
                                          xs: typography.size.bodySmall.xs,
                                          sm: typography.size.bodySmall.sm,
                                        },
                                        color:
                                          game.plus_minus && game.plus_minus > 0
                                            ? 'success.main'
                                            : game.plus_minus && game.plus_minus < 0
                                              ? 'error.main'
                                              : 'text.primary',
                                      }}
                                    >
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

                {/* Profile sections (File 4.6): Shooting Zones, Clutch, Splits, Defense, Passing, Year-Over-Year */}
                {zonesData?.zones && zonesData.zones.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Shooting by zone
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {zonesData.zones.map(z => (
                        <Box
                          key={z.zone}
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            minWidth: 140,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block' }}
                          >
                            {z.zone}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {z.fg_pct}%
                          </Typography>
                          {z.league_avg != null && (
                            <Typography variant="caption">League {z.league_avg}%</Typography>
                          )}
                          {z.diff_pct != null && (
                            <Typography
                              variant="caption"
                              color={z.diff_pct >= 0 ? 'success.main' : 'error.main'}
                            >
                              {z.diff_pct >= 0 ? '+' : ''}
                              {z.diff_pct}%
                            </Typography>
                          )}
                          <Typography variant="caption" display="block">
                            {(z.freq_pct ?? 0).toFixed(1)}% of FGA
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )}

                {clutchData && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Clutch (last 5 min, within 5 pts)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Regular
                        </Typography>
                        <Typography variant="body2">
                          {clutchData.regular.ppg ?? '—'} PPG, {clutchData.regular.fg_pct ?? '—'}%
                          FG
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Clutch
                        </Typography>
                        <Typography variant="body2">
                          {clutchData.clutch.ppg ?? '—'} PPG, {clutchData.clutch.fg_pct ?? '—'}% FG
                        </Typography>
                      </Box>
                      {clutchData.clutch_w_l != null && (
                        <Typography variant="body2">W–L {clutchData.clutch_w_l}</Typography>
                      )}
                      {clutchData.clutch_plus_minus != null && (
                        <Typography variant="body2">+/- {clutchData.clutch_plus_minus}</Typography>
                      )}
                      {clutchData.ppg_diff != null && (
                        <Typography
                          variant="body2"
                          color={clutchData.ppg_diff >= 0 ? 'success.main' : 'error.main'}
                        >
                          PPG diff {clutchData.ppg_diff >= 0 ? '+' : ''}
                          {clutchData.ppg_diff}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                )}

                {splitsData && Object.keys(splitsData).length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Context splits
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {Object.entries(splitsData).map(([key, rows]) => (
                        <Box key={key}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ textTransform: 'capitalize' }}
                          >
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </Typography>
                          {Array.isArray(rows) && rows.length > 0 && (
                            <Table size="small" sx={{ mt: 0.5 }}>
                              <TableHead>
                                <TableRow>
                                  {Object.keys(rows[0] as object)
                                    .slice(0, 6)
                                    .map(h => (
                                      <TableCell key={h} sx={{ fontWeight: 600, py: 0.5 }}>
                                        {String(h).replace(/_/g, ' ')}
                                      </TableCell>
                                    ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(rows as Array<Record<string, unknown>>)
                                  .slice(0, 5)
                                  .map((row, i) => (
                                    <TableRow key={i}>
                                      {Object.values(row)
                                        .slice(0, 6)
                                        .map((v, j) => (
                                          <TableCell key={j} sx={{ py: 0.5 }}>
                                            {String(v ?? '—')}
                                          </TableCell>
                                        ))}
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )}

                {defenseData?.defense && defenseData.defense.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Defensive impact
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {Object.keys(defenseData.defense[0])
                            .slice(0, 5)
                            .map(h => (
                              <TableCell key={h} sx={{ fontWeight: 600 }}>
                                {String(h).replace(/_/g, ' ')}
                              </TableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {defenseData.defense.slice(0, 8).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row)
                              .slice(0, 5)
                              .map((v, j) => (
                                <TableCell key={j}>{String(v ?? '—')}</TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}

                {passingData?.passes && passingData.passes.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Passing network
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {Object.keys(passingData.passes[0])
                            .slice(0, 6)
                            .map(h => (
                              <TableCell key={h} sx={{ fontWeight: 600 }}>
                                {String(h).replace(/_/g, ' ')}
                              </TableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {passingData.passes.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row)
                              .slice(0, 6)
                              .map((v, j) => (
                                <TableCell key={j}>{String(v ?? '—')}</TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}

                {yoyData?.seasons && yoyData.seasons.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Year-over-year
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {Object.keys(yoyData.seasons[0])
                            .slice(0, 8)
                            .map(h => (
                              <TableCell key={h} sx={{ fontWeight: 600 }}>
                                {String(h).replace(/_/g, ' ')}
                              </TableCell>
                            ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {yoyData.seasons.slice(0, 12).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row)
                              .slice(0, 8)
                              .map((v, j) => (
                                <TableCell key={j}>{String(v ?? '—')}</TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </Box>

              {/* Sidebar (md+): season stats + bio */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'column',
                  gap: 2,
                  position: 'sticky',
                  top: 16,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}
                  >
                    Season stats
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        PPG {player?.PTS != null ? player.PTS.toFixed(1) : '—'}
                      </Typography>
                      {last10ForSparkline.length > 0 && (
                        <Box sx={{ width: 80, height: 30 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={last10ForSparkline}
                              margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                            >
                              <Line
                                type="monotone"
                                dataKey="pts"
                                stroke="var(--mui-palette-primary-main)"
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2">
                      RPG {player?.REB != null ? player.REB.toFixed(1) : '—'}
                    </Typography>
                    <Typography variant="body2">
                      APG {player?.AST != null ? player.AST.toFixed(1) : '—'}
                    </Typography>
                    <Typography variant="body2">
                      FG%{' '}
                      {seasonShootingFromLog?.fgPct != null
                        ? seasonShootingFromLog.fgPct.toFixed(1) + '%'
                        : '—'}
                    </Typography>
                    <Typography variant="body2">
                      3P%{' '}
                      {seasonShootingFromLog?.threePct != null
                        ? seasonShootingFromLog.threePct.toFixed(1) + '%'
                        : '—'}
                    </Typography>
                    <Typography variant="body2">
                      FT%{' '}
                      {seasonShootingFromLog?.ftPct != null
                        ? seasonShootingFromLog.ftPct.toFixed(1) + '%'
                        : '—'}
                    </Typography>
                  </Box>
                </Paper>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}
                  >
                    Bio
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Typography variant="body2">Height {player?.HEIGHT ?? '—'}</Typography>
                    <Typography variant="body2">
                      Weight {player?.WEIGHT ? `${player.WEIGHT} lbs` : '—'}
                    </Typography>
                    <Typography variant="body2">School {player?.COLLEGE ?? '—'}</Typography>
                    <Typography variant="body2">
                      Draft {player?.FROM_YEAR ? `${player.FROM_YEAR} R1 Pick 23` : '—'}
                    </Typography>
                    <Typography variant="body2">Experience {experience}</Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>
          </>
        )}
      </PageContainer>
    </Box>
  );
};

export default PlayerProfile;
