import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { TeamRoster } from '../types/team';
import { TeamGameLogResponse } from '../types/teamgamelog';
import { StandingsResponse, StandingRecord } from '../types/standings';
import { TeamStatsResponse } from '../types/teamstats';
import { TeamPlayerStatsResponse, TeamPlayerStat } from '../types/teamplayerstats';
import { typography, borderRadius, transitions } from '../theme/designTokens';
import TeamPerformanceChart from '../components/TeamPerformanceChart';
import TeamBanner from '../components/TeamBanner';
import { getTeamAbbreviation } from '../utils/teamMappings';

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

type TabValue = 'profile' | 'schedule' | 'stats';

const TeamPage = () => {
  const { team_id } = useParams<{ team_id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  const [gameLog, setGameLog] = useState<TeamGameLogResponse | null>(null);
  const [standings, setStandings] = useState<StandingRecord[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStatsResponse | null>(null);
  const [playerStats, setPlayerStats] = useState<TeamPlayerStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const season = searchParams.get('season') || getCurrentSeason();
  const activeTab = (searchParams.get('tab') || 'profile') as TabValue;
  const seasonOptions = getSeasonOptions(5);

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('season', newSeason);
      return newParams;
    });
  };

  const handleTabChange = (_: unknown, newValue: TabValue) => {
    setSearchParams({ ...Object.fromEntries(searchParams), tab: newValue });
  };

  // Find this team's record in standings
  const teamStanding = useMemo(() => {
    if (!team || !standings.length) return null;
    return standings.find(s => s.team_id === team.team_id);
  }, [team, standings]);


  // Find top performers in each stat category
  const teamLeaders = useMemo(() => {
    if (!playerStats || !playerStats.players.length) return null;

    const players = playerStats.players.filter(p => p.games_played > 0);
    if (players.length === 0) return null;

    return {
      points: players.reduce((max, p) => (p.points > max.points ? p : max), players[0]),
      rebounds: players.reduce((max, p) => (p.rebounds > max.rebounds ? p : max), players[0]),
      assists: players.reduce((max, p) => (p.assists > max.assists ? p : max), players[0]),
      steals: players.reduce((max, p) => (p.steals > max.steals ? p : max), players[0]),
      blocks: players.reduce((max, p) => (p.blocks > max.blocks ? p : max), players[0]),
    };
  }, [playerStats]);

  // Get team stat rankings for banner display
  const teamStatsForBanner = useMemo(() => {
    if (!teamStats || !team) return undefined;

    const getRankAndValue = (categoryName: string) => {
      const category = teamStats.categories.find(cat => cat.category_name === categoryName);
      if (!category) return undefined;

      const sorted = [...category.teams].sort((a, b) => b.value - a.value);
      const teamIndex = sorted.findIndex(t => t.team_id === team.team_id);
      if (teamIndex === -1) return undefined;

      return {
        rank: teamIndex + 1,
        value: sorted[teamIndex].value,
      };
    };

    return {
      ppg: getRankAndValue('Points Per Game'),
      rpg: getRankAndValue('Rebounds Per Game'),
      apg: getRankAndValue('Assists Per Game'),
      oppg: getRankAndValue('Opponent Points Per Game'),
    };
  }, [teamStats, team]);

  useEffect(() => {
    if (!team_id) return;

    const fetchTeamData = async () => {
      setLoading(true);
      setError(null);
      try {
        const teamData = await fetchJson<TeamDetails>(
          `${API_BASE_URL}/api/v1/teams/${team_id}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        setTeam(teamData);

        try {
          const standingsData = await fetchJson<StandingsResponse>(
            `${API_BASE_URL}/api/v1/standings/season/${season}`,
            {},
            { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
          );
          setStandings(standingsData.standings);
        } catch (err) {
          console.error('Error fetching standings:', err);
        }

        try {
          const statsData = await fetchJson<TeamStatsResponse>(
            `${API_BASE_URL}/api/v1/teams/stats?season=${encodeURIComponent(season)}`,
            {},
            { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
          );
          setTeamStats(statsData);
        } catch (err) {
          console.error('Error fetching team stats:', err);
        }

        try {
          const rosterData = await fetchJson<TeamRoster>(
            `${API_BASE_URL}/api/v1/scoreboard/team/${team_id}/roster/${season}`,
            {},
            { maxRetries: 2, retryDelay: 1000, timeout: 30000 }
          );
          setRoster(rosterData);
        } catch (err) {
          console.error('Error fetching roster:', err);
        }

        try {
          const gameLogData = await fetchJson<TeamGameLogResponse>(
            `${API_BASE_URL}/api/v1/teams/${team_id}/game-log?season=${encodeURIComponent(season)}`,
            {},
            { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
          );
          if (gameLogData && gameLogData.games) {
            console.log(`Loaded ${gameLogData.games.length} games for team ${team_id}, season ${season}`);
            setGameLog(gameLogData);
          } else {
            console.warn(`Game log returned empty or invalid data for team ${team_id}, season ${season}`);
            setGameLog(null);
          }
        } catch (err) {
          console.error('Error fetching game log:', err);
          setGameLog(null);
        }

        try {
          const playerStatsData = await fetchJson<TeamPlayerStatsResponse>(
            `${API_BASE_URL}/api/v1/teams/${team_id}/player-stats?season=${encodeURIComponent(season)}`,
            {},
            { maxRetries: 2, retryDelay: 1000, timeout: 30000 }
          );
          setPlayerStats(playerStatsData);
        } catch (err) {
          console.warn('Player stats not available for this season:', err);
          setPlayerStats(null);
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
        <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
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

  if (!team) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Team not found.
          </Typography>
        </Box>
      </Box>
    );
  }

  const renderProfileTab = () => (
      <Box>
        {/* Season Selector */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Season</InputLabel>
            <Select
              value={season}
              label="Season"
              onChange={(e) => handleSeasonChange(e.target.value)}
              sx={{ borderRadius: borderRadius.sm }}
            >
              {seasonOptions.map(seasonOption => (
                <MenuItem key={seasonOption} value={seasonOption}>
                  {seasonOption} Regular Season
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Team Info Grid */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
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
            Team Information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <InfoItem label="Founded" value={team.year_founded?.toString() ?? 'N/A'} />
            <InfoItem label="Arena" value={team.arena ?? 'N/A'} />
            {team.arena_capacity && <InfoItem label="Arena Capacity" value={team.arena_capacity.toLocaleString()} />}
            <InfoItem label="Owner" value={team.owner ?? 'N/A'} />
            <InfoItem label="General Manager" value={team.general_manager ?? 'N/A'} />
            <InfoItem label="Head Coach" value={team.head_coach ?? 'N/A'} />
          </Box>
        </Paper>

      {/* Roster Table */}
      {roster?.players?.length ? (
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
            {season} Team Roster
          </Typography>
          <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <TableContainer sx={{ 
              overflowX: 'auto',
              minWidth: { xs: 600, sm: 'auto' },
            }}>
              <Table size="small" stickyHeader sx={{ minWidth: { xs: 600, sm: 'auto' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: typography.weight.bold }}>Player</TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>#</TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Pos</TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Height</TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Weight</TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Birthdate</TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Age</TableCell>
                  <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Exp</TableCell>
                  <TableCell sx={{ fontWeight: typography.weight.bold }}>School</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roster.players.map(player => (
                  <TableRow
                    key={player.player_id}
                    onClick={() => navigate(`/player/${player.player_id}`)}
                    sx={{
                      transition: transitions.normal,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`}
                          alt={player.name}
                          sx={{ 
                            width: 40, 
                            height: 40,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = '';
                          }}
                        />
                        <Typography sx={{ fontWeight: typography.weight.medium }}>{player.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{player.jersey_number || '—'}</TableCell>
                    <TableCell align="center">{player.position || '—'}</TableCell>
                    <TableCell align="center">{player.height || '—'}</TableCell>
                    <TableCell align="center">{player.weight ? `${player.weight} LBS` : '—'}</TableCell>
                    <TableCell align="center">
                      {player.birth_date ? format(new Date(player.birth_date), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell align="center">{player.age ? `${player.age} years` : '—'}</TableCell>
                    <TableCell align="center">{player.experience || '—'}</TableCell>
                    <TableCell>{player.school || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>
        </Paper>
      ) : null}
    </Box>
  );

  const renderScheduleTab = () => {
    if (!gameLog || !gameLog.games.length) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No schedule data available for this season.
          </Typography>
        </Box>
      );
    }

    // Find team ID from opponent name
    const getOpponentTeamId = (opponentName: string): number | null => {
      const opponent = standings.find(
        s => `${s.team_city} ${s.team_name}` === opponentName || s.team_name === opponentName
      );
      return opponent ? opponent.team_id : null;
    };

    // Calculate running W-L record
    let wins = 0;
    let losses = 0;

    return (
      <Box>
        {/* Header with dropdowns */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: { xs: typography.size.h6, sm: typography.size.h5 },
            }}
          >
            {team?.team_city} {team?.team_name} Schedule {season}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Season</InputLabel>
              <Select
                value={season}
                label="Season"
                onChange={(e) => handleSeasonChange(e.target.value)}
                sx={{ borderRadius: borderRadius.sm }}
              >
                {seasonOptions.map(seasonOption => (
                  <MenuItem key={seasonOption} value={seasonOption}>
                    {seasonOption} Regular Season
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {standings.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>More NBA Teams</InputLabel>
                <Select
                  value={team?.team_id || ''}
                  label="More NBA Teams"
                  onChange={(e) => {
                    const newTeamId = e.target.value;
                    if (newTeamId && newTeamId !== team?.team_id) {
                      window.location.href = `/team/${newTeamId}?tab=schedule&season=${season}`;
                    }
                  }}
                  sx={{ borderRadius: borderRadius.sm }}
                >
                  {standings
                    .sort((a, b) => {
                      const nameA = `${a.team_city} ${a.team_name}`;
                      const nameB = `${b.team_city} ${b.team_name}`;
                      return nameA.localeCompare(nameB);
                    })
                    .map(standing => (
                      <MenuItem key={standing.team_id} value={standing.team_id}>
                        {standing.team_city} {standing.team_name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>

        {/* Performance Trend Chart */}
        {gameLog && gameLog.games.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <TeamPerformanceChart data={gameLog} />
          </Box>
        )}

        {/* Schedule Table */}
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
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: typography.weight.bold }}>Date</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold }}>Opponent</TableCell>
                <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Result</TableCell>
                <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>W-L</TableCell>
                <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Points</TableCell>
                <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Rebounds</TableCell>
                <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>Assists</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...gameLog.games].reverse().map(game => {
                const isHome = !game.matchup.includes('@');
                const opponent = isHome
                  ? game.matchup.split(/vs\.?/)[1]?.trim() || game.matchup
                  : game.matchup.split('@')[1]?.trim() || game.matchup;
                
                // Format date, fallback to TBD if invalid
                let gameDate = 'TBD';
                if (game.game_date && game.game_date.trim() !== '') {
                  try {
                    const date = new Date(game.game_date + 'T00:00:00');
                    if (!isNaN(date.getTime())) {
                      gameDate = format(date, 'EEE, MMM d');
                    }
                  } catch {
                    gameDate = game.game_date || 'TBD';
                  }
                }
                
                const result = game.win_loss || '—';
                
                // Track running W-L record
                if (result === 'W') wins++;
                if (result === 'L') losses++;
                const record = result !== '—' ? `${wins}-${losses}` : '—';

                // Show W/L with points if available
                let resultDisplay = result;
                if (result && result !== '—' && game.points > 0) {
                  resultDisplay = `${result}${game.points}`;
                }

                return (
                  <TableRow
                    key={game.game_id}
                    sx={{
                      transition: transitions.normal,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell>{gameDate}</TableCell>
                    <TableCell>
                      <Box
                        onClick={() => {
                          const opponentTeamId = getOpponentTeamId(opponent);
                          if (opponentTeamId) {
                            navigate(`/team/${opponentTeamId}?tab=schedule`);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          cursor: getOpponentTeamId(opponent) ? 'pointer' : 'default',
                          transition: transitions.normal,
                          '&:hover': {
                            opacity: getOpponentTeamId(opponent) ? 0.7 : 1,
                          },
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontSize: typography.size.caption,
                            color: 'text.secondary',
                            mr: 0.5,
                          }}
                        >
                          {isHome ? 'vs' : '@'}
                        </Typography>
                        <Avatar
                          src={`/logos/${getOpponentAbbreviation(opponent)}.svg`}
                          alt={opponent}
                          sx={{
                            width: 24,
                            height: 24,
                            backgroundColor: 'transparent',
                          }}
                          onError={e => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/logos/default.svg';
                          }}
                        />
                        <Typography variant="body2">{opponent}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: typography.weight.semibold,
                        color:
                          result === 'W' || (result && result[0] === 'W')
                            ? 'success.main'
                            : result === 'L' || (result && result[0] === 'L')
                              ? 'error.main'
                              : 'text.secondary',
                      }}
                    >
                      {resultDisplay}
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'text.secondary' }}>
                      {record}
                    </TableCell>
                    <TableCell align="center">{game.points || '—'}</TableCell>
                    <TableCell align="center">{game.rebounds || '—'}</TableCell>
                    <TableCell align="center">{game.assists || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        </Paper>
      </Box>
    );
  };

  const renderStatsTab = () => {
    return (
      <Box>
        {/* Header with title */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: typography.weight.bold,
              fontSize: { xs: typography.size.h6, sm: typography.size.h5 },
            }}
          >
            {team?.team_city} {team?.team_name} Stats {season}
          </Typography>
        </Box>

        {/* Season selector */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Season</InputLabel>
            <Select
              value={season}
              label="Season"
              onChange={(e) => handleSeasonChange(e.target.value)}
              sx={{ borderRadius: borderRadius.sm }}
            >
              {seasonOptions.map(seasonOption => (
                <MenuItem key={seasonOption} value={seasonOption}>
                  {seasonOption} Regular Season
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {standings.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>More NBA Teams</InputLabel>
              <Select
                value={team?.team_id || ''}
                label="More NBA Teams"
                onChange={(e) => {
                  const newTeamId = e.target.value;
                  if (newTeamId && newTeamId !== team?.team_id) {
                    window.location.href = `/team/${newTeamId}?tab=stats&season=${season}`;
                  }
                }}
                sx={{ borderRadius: borderRadius.sm }}
              >
                {standings
                  .sort((a, b) => {
                    const nameA = `${a.team_city} ${a.team_name}`;
                    const nameB = `${b.team_city} ${b.team_name}`;
                    return nameA.localeCompare(nameB);
                  })
                  .map(standing => (
                    <MenuItem key={standing.team_id} value={standing.team_id}>
                      {standing.team_city} {standing.team_name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Team Leaders Section */}
        {teamLeaders && (
          <Paper
            elevation={0}
            sx={{
              p: 3, // Material 3: 24dp
              mb: 3, // Material 3: 24dp
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
              Team Leaders
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
              <LeaderCard
                category="Points"
                player={teamLeaders.points}
                value={teamLeaders.points.points}
                formatValue={(v) => v.toFixed(1)}
              />
              <LeaderCard
                category="Rebounds"
                player={teamLeaders.rebounds}
                value={teamLeaders.rebounds.rebounds}
                formatValue={(v) => v.toFixed(1)}
              />
              <LeaderCard
                category="Assists"
                player={teamLeaders.assists}
                value={teamLeaders.assists.assists}
                formatValue={(v) => v.toFixed(1)}
              />
              <LeaderCard
                category="Steals"
                player={teamLeaders.steals}
                value={teamLeaders.steals.steals}
                formatValue={(v) => v.toFixed(1)}
              />
              <LeaderCard
                category="Blocks"
                player={teamLeaders.blocks}
                value={teamLeaders.blocks.blocks}
                formatValue={(v) => v.toFixed(1)}
              />
            </Box>
          </Paper>
        )}

        {/* Player Stats Table */}
        {playerStats && playerStats.players.length > 0 && (
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
              Player Stats
            </Typography>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: typography.weight.bold }}>Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>GP</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>GS</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>MIN</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>PTS</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>OR</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>DR</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>REB</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>AST</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>STL</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>BLK</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>TO</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>PF</TableCell>
                    <TableCell align="center" sx={{ fontWeight: typography.weight.bold }}>AST/TO</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {playerStats.players.map((player) => (
                    <TableRow
                      key={player.player_id}
                      sx={{
                        transition: transitions.normal,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <TableCell>
                        <Box
                          onClick={() => navigate(`/player/${player.player_id}`)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'pointer',
                            transition: transitions.normal,
                            '&:hover': {
                              opacity: 0.7,
                            },
                          }}
                        >
                          <Avatar
                            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`}
                            sx={{
                              width: 32,
                              height: 32,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                            onError={e => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.onerror = null;
                              target.src = '/fallback-player.png';
                            }}
                          />
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: typography.weight.semibold,
                                fontSize: typography.size.body,
                              }}
                            >
                              {player.player_name}
                            </Typography>
                            {player.position && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: typography.size.caption,
                                }}
                              >
                                {player.position}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{player.games_played}</TableCell>
                      <TableCell align="center">{player.games_started}</TableCell>
                      <TableCell align="center">{player.minutes.toFixed(1)}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: typography.weight.semibold }}>
                        {player.points.toFixed(1)}
                      </TableCell>
                      <TableCell align="center">{player.offensive_rebounds.toFixed(1)}</TableCell>
                      <TableCell align="center">{player.defensive_rebounds.toFixed(1)}</TableCell>
                      <TableCell align="center">{player.rebounds.toFixed(1)}</TableCell>
                      <TableCell align="center">{player.assists.toFixed(1)}</TableCell>
                      <TableCell align="center">{player.steals.toFixed(1)}</TableCell>
                      <TableCell align="center">{player.blocks.toFixed(1)}</TableCell>
                      <TableCell align="center">{player.turnovers.toFixed(1)}</TableCell>
                      <TableCell align="center">{player.personal_fouls.toFixed(1)}</TableCell>
                      <TableCell align="center">
                        {player.assist_to_turnover !== null && player.assist_to_turnover !== undefined
                          ? player.assist_to_turnover.toFixed(1)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {!playerStats && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.md,
              textAlign: 'center',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Player statistics are not available for the {season} season.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The season may not have started yet or data may not be available in the NBA API.
            </Typography>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
        {team && (
          <TeamBanner
            teamId={team.team_id}
            teamCity={team.team_city}
            teamName={team.team_name}
            abbreviation={team.abbreviation}
            record={teamStanding ? `${teamStanding.wins} - ${teamStanding.losses}` : undefined}
            conferenceRank={teamStanding?.playoff_rank}
            conference={teamStanding?.conference}
            teamStats={teamStatsForBanner}
          />
        )}
        {/* Tabs */}
          <Paper
            elevation={0}
            sx={{
              mb: 3, // Material 3: 24dp
              border: '1px solid',
              borderColor: 'divider', // Material 3: outline
              borderRadius: 1.5, // Material 3: 12dp
              backgroundColor: 'background.paper', // Material 3: surface
            }}
          >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.body,
              },
            }}
          >
            <Tab label="Profile" value="profile" />
            <Tab label="Schedule" value="schedule" />
            <Tab label="Stats" value="stats" />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'schedule' && renderScheduleTab()}
        {activeTab === 'stats' && renderStatsTab()}
      </Box>
    </Box>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: typography.weight.medium }}>
      {value}
    </Typography>
  </Box>
);


const LeaderCard = ({
  category,
  player,
  value,
  formatValue,
}: {
  category: string;
  player: TeamPlayerStat;
  value: number;
  formatValue: (v: number) => string;
}) => {
  const navigate = useNavigate();
  
  return (
    <Box
      onClick={() => navigate(`/player/${player.player_id}`)}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: borderRadius.sm,
        backgroundColor: 'background.default',
        transition: transitions.normal,
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'action.hover',
        },
      }}
    >
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        textTransform: 'uppercase',
        fontSize: typography.size.caption,
        mb: 1,
        display: 'block',
      }}
    >
      {category}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Avatar
        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`}
        sx={{
          width: 40,
          height: 40,
          border: '1px solid',
          borderColor: 'divider',
        }}
        onError={e => {
          const target = e.currentTarget as HTMLImageElement;
          target.onerror = null;
          target.src = '/logos/default.svg';
        }}
      />
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: typography.weight.bold,
            fontSize: typography.size.body,
            mb: 0.25,
          }}
        >
          {player.player_name}
        </Typography>
        {player.position && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: typography.size.caption,
            }}
          >
            {player.position}
          </Typography>
        )}
      </Box>
    </Box>
    <Typography
      variant="h6"
      sx={{
        fontWeight: typography.weight.bold,
        color: 'text.primary', // Neutral color, not blue
        fontSize: typography.size.h6,
      }}
    >
      {formatValue(value)}
    </Typography>
  </Box>
  );
};


const getOpponentAbbreviation = (opponent: string): string => {
  return getTeamAbbreviation(opponent);
};


export default TeamPage;
