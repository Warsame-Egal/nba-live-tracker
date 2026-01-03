import { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  TextField, 
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Alert,
  IconButton,
  Skeleton,
} from '@mui/material';
import { Search, NavigateBefore, NavigateNext } from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SeasonLeaders from '../components/SeasonLeaders';
import Navbar from '../components/Navbar';
import { typography, borderRadius, responsiveSpacing, transitions } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { SeasonLeadersResponse } from '../types/seasonleaders';
import { PlayerSummary } from '../types/player';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type TabValue = 'roster' | 'leaders';

const ROWS_PER_PAGE = 25;

/**
 * Players page showing league roster and season leaders.
 * Supports search, pagination, and season filtering.
 */
const Players = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>((searchParams.get('tab') as TabValue) || 'roster');
  const [seasonLeaders, setSeasonLeaders] = useState<SeasonLeadersResponse | null>(null);
  const [roster, setRoster] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);

  const season = searchParams.get('season') || getCurrentSeason();
  const seasonOptions = getSeasonOptions(5);

  // League Roster filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('All Players');
  const [selectedTeam, setSelectedTeam] = useState<string>('All Teams');
  const [selectedPosition, setSelectedPosition] = useState<string>('All Positions');
  const [currentPage, setCurrentPage] = useState(1);

  const handleTabChange = (_: unknown, newValue: TabValue) => {
    setActiveTab(newValue);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', newValue);
      return newParams;
    });
  };

  const handleSeasonChange = (newSeason: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('season', newSeason);
      return newParams;
    });
  };

  // Fetch league roster
  useEffect(() => {
    if (activeTab === 'roster') {
      const fetchRoster = async () => {
        setRosterLoading(true);
        try {
          const data = await fetchJson<PlayerSummary[]>(
            `${API_BASE_URL}/api/v1/players/league-roster`,
            {},
            { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
          );
          console.log('Fetched roster data:', data?.length || 0, 'players');
          setRoster(data || []);
        } catch (err) {
          console.error('Error fetching league roster:', err);
          setRoster([]);
        } finally {
          setRosterLoading(false);
        }
      };
      fetchRoster();
    }
  }, [activeTab]);

  // Fetch season leaders
  useEffect(() => {
    if (activeTab === 'leaders') {
      const fetchSeasonLeaders = async () => {
        setLoading(true);
        try {
          const data = await fetchJson<SeasonLeadersResponse>(
            `${API_BASE_URL}/api/v1/players/season-leaders?season=${encodeURIComponent(season)}`,
            {},
            { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
          );
          setSeasonLeaders(data);
        } catch (err) {
          console.error('Error fetching season leaders:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchSeasonLeaders();
    }
  }, [activeTab, season]);

  // Filter and paginate roster data
  const filteredRoster = useMemo(() => {
    let filtered = [...roster];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(player => {
        const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`.toLowerCase();
        return fullName.includes(query);
      });
    }

    // Letter filter (first character of last name)
    if (selectedLetter !== 'All Players') {
      filtered = filtered.filter(player => {
        const firstChar = player.PLAYER_LAST_NAME?.charAt(0).toUpperCase() || '';
        return firstChar === selectedLetter;
      });
    }

    // Team filter
    if (selectedTeam !== 'All Teams') {
      filtered = filtered.filter(player => {
        const teamName = player.TEAM_NAME || '';
        return teamName === selectedTeam;
      });
    }

    // Position filter
    if (selectedPosition !== 'All Positions') {
      filtered = filtered.filter(player => {
        const position = player.POSITION || '';
        if (selectedPosition === 'Guard') {
          return position.includes('G');
        } else if (selectedPosition === 'Forward') {
          return position.includes('F');
        } else if (selectedPosition === 'Center') {
          return position.includes('C');
        }
        return false;
      });
    }

    return filtered;
  }, [roster, searchQuery, selectedLetter, selectedTeam, selectedPosition]);

  // Get unique values for filters
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    roster.forEach(player => {
      if (player.TEAM_NAME) {
        teams.add(player.TEAM_NAME);
      }
    });
    return Array.from(teams).sort();
  }, [roster]);

  const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  // Pagination
  const totalPages = Math.ceil(filteredRoster.length / ROWS_PER_PAGE);
  const paginatedRoster = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRoster.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredRoster, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLetter, selectedTeam, selectedPosition]);

  const renderLeagueRoster = () => (
    <Box>
      {/* Search and Filters */}
      <Box sx={{ mb: 3, minHeight: { xs: 140, sm: 160 } }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search Players"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </InputAdornment>
            ),
          }}
          sx={{ 
            mb: 2, 
            borderRadius: borderRadius.sm,
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 150 } }}>
            <InputLabel sx={{ fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm } }}>All Players</InputLabel>
            <Select
              value={selectedLetter}
              label="All Players"
              onChange={(e) => setSelectedLetter(e.target.value)}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
              }}
            >
              <MenuItem value="All Players">All Players</MenuItem>
              {alphabet.map(letter => (
                <MenuItem key={letter} value={letter}>{letter}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
            <InputLabel sx={{ fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm } }}>All Teams</InputLabel>
            <Select
              value={selectedTeam}
              label="All Teams"
              onChange={(e) => setSelectedTeam(e.target.value)}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
              }}
            >
              <MenuItem value="All Teams">All Teams</MenuItem>
              {uniqueTeams.map(team => (
                <MenuItem key={team} value={team}>{team}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 150 } }}>
            <InputLabel sx={{ fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm } }}>All Positions</InputLabel>
            <Select
              value={selectedPosition}
              label="All Positions"
              onChange={(e) => setSelectedPosition(e.target.value)}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
              }}
            >
              <MenuItem value="All Positions">All Positions</MenuItem>
              <MenuItem value="Guard">Guard</MenuItem>
              <MenuItem value="Forward">Forward</MenuItem>
              <MenuItem value="Center">Center</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Pagination Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, minHeight: { xs: 40, sm: 48 }, flexWrap: 'wrap', gap: 1 }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}
        >
          {filteredRoster.length} Rows • Page {currentPage} of {totalPages || 1}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            sx={{ 
              minWidth: { xs: 44, sm: 32 },
              minHeight: { xs: 44, sm: 32 },
            }}
          >
            <NavigateBefore />
          </IconButton>
          <FormControl size="small" sx={{ minWidth: { xs: 70, sm: 80 } }}>
            <Select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
              }}
            >
              {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
                <MenuItem key={page} value={page}>{page}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton
            size="small"
            onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
            disabled={currentPage >= (totalPages || 1)}
            sx={{ 
              minWidth: { xs: 44, sm: 32 },
              minHeight: { xs: 44, sm: 32 },
            }}
          >
            <NavigateNext />
          </IconButton>
        </Box>
      </Box>

      {/* Table */}
      {rosterLoading ? (
        <Box sx={{ minHeight: { xs: 400, sm: 500 } }}>
          <Skeleton variant="rectangular" height={60} sx={{ borderRadius: borderRadius.md, mb: 1 }} />
          {[...Array(10)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={56} sx={{ borderRadius: borderRadius.sm, mb: 0.5 }} />
          ))}
        </Box>
      ) : roster.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: borderRadius.sm }}>
          No roster data available. Please try again later.
        </Alert>
      ) : filteredRoster.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: borderRadius.sm }}>
          No players found matching the filters.
        </Alert>
      ) : (
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: borderRadius.md,
              backgroundColor: 'background.paper',
              minHeight: { xs: 400, sm: 500 },
              minWidth: { xs: 600, sm: 'auto' }, // Ensure table doesn't get too narrow on mobile
            }}
          >
            <Table sx={{ minWidth: { xs: 600, sm: 'auto' } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'background.paper' }}>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Player</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Team</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Number</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Position</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Height</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Weight</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Last Attended</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>Country</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRoster.map((player) => {
                const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`;
                const playerId = player.PERSON_ID;
                return (
                  <TableRow
                    key={playerId}
                    onClick={() => navigate(`/player/${playerId}`)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: 'background.paper',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
                          alt={fullName}
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
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: typography.weight.semibold,
                              color: 'primary.main',
                              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                            }}
                          >
                            {player.PLAYER_FIRST_NAME}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: typography.weight.semibold,
                              color: 'primary.main',
                              fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                            }}
                          >
                            {player.PLAYER_LAST_NAME}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'primary.main', fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>
                        {player.TEAM_ABBREVIATION || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>
                        {player.JERSEY_NUMBER || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>
                        {player.POSITION || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>
                        {player.HEIGHT || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>
                        {player.WEIGHT ? `${player.WEIGHT} lbs` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>
                        {player.COLLEGE || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm } }}>
                        {player.COUNTRY || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      )}
    </Box>
  );

  const renderSeasonLeaders = () => (
    <Box sx={{ minHeight: { xs: 400, sm: 500 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', minHeight: { xs: 40, sm: 48 } }}>
        <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
          <InputLabel sx={{ fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm } }}>Season</InputLabel>
          <Select
            value={season}
            label="Season"
            onChange={(e) => handleSeasonChange(e.target.value)}
            sx={{ 
              borderRadius: borderRadius.sm,
              fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
            }}
          >
            {seasonOptions.map(seasonOption => (
              <MenuItem key={seasonOption} value={seasonOption}>
                {seasonOption} Regular Season
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading || !seasonLeaders ? (
        <Box sx={{ minHeight: { xs: 400, sm: 500 } }}>
          <Skeleton variant="rectangular" height={60} sx={{ borderRadius: borderRadius.md, mb: 2 }} />
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={120} sx={{ borderRadius: borderRadius.md, mb: 2 }} />
          ))}
        </Box>
      ) : (
        <SeasonLeaders data={seasonLeaders} />
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: responsiveSpacing.container, py: responsiveSpacing.containerVertical }}>
        <Box sx={{ mb: responsiveSpacing.section, minHeight: { xs: 80, sm: 90 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: typography.weight.bold,
                fontSize: { xs: typography.size.h5.xs, sm: typography.size.h5.sm, md: typography.size.h4.md },
                color: 'text.primary',
                letterSpacing: typography.letterSpacing.tight,
              }}
            >
              Players
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm }, ml: 5.5 }}
          >
            Browse all NBA players and season leaders
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, minHeight: { xs: 48, sm: 56 } }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: typography.weight.semibold,
                fontSize: { xs: typography.size.body.xs, sm: typography.size.body.sm },
                minHeight: { xs: 48, sm: 56 },
                transition: transitions.normal,
              },
            }}
          >
            <Tab label="League Roster" value="roster" />
            <Tab label="Season Leaders" value="leaders" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 'roster' && renderLeagueRoster()}
        {activeTab === 'leaders' && renderSeasonLeaders()}
      </Box>
    </Box>
  );
};

export default Players;
