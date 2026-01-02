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
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Search, NavigateBefore, NavigateNext } from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import UniversalSidebar from '../components/UniversalSidebar';
import SeasonLeaders from '../components/SeasonLeaders';
import Navbar from '../components/Navbar';
import { typography, borderRadius } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { SeasonLeadersResponse } from '../types/seasonleaders';
import { PlayerSummary } from '../types/player';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type TabValue = 'roster' | 'leaders';

const ROWS_PER_PAGE = 25;

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
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search Players"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2, borderRadius: borderRadius.sm }}
        />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>All Players</InputLabel>
            <Select
              value={selectedLetter}
              label="All Players"
              onChange={(e) => setSelectedLetter(e.target.value)}
              sx={{ borderRadius: borderRadius.sm }}
            >
              <MenuItem value="All Players">All Players</MenuItem>
              {alphabet.map(letter => (
                <MenuItem key={letter} value={letter}>{letter}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>All Teams</InputLabel>
            <Select
              value={selectedTeam}
              label="All Teams"
              onChange={(e) => setSelectedTeam(e.target.value)}
              sx={{ borderRadius: borderRadius.sm }}
            >
              <MenuItem value="All Teams">All Teams</MenuItem>
              {uniqueTeams.map(team => (
                <MenuItem key={team} value={team}>{team}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>All Positions</InputLabel>
            <Select
              value={selectedPosition}
              label="All Positions"
              onChange={(e) => setSelectedPosition(e.target.value)}
              sx={{ borderRadius: borderRadius.sm }}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {filteredRoster.length} Rows • Page {currentPage} of {totalPages || 1}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <NavigateBefore />
          </IconButton>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              sx={{ borderRadius: borderRadius.sm }}
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
          >
            <NavigateNext />
          </IconButton>
        </Box>
      </Box>

      {/* Table */}
      {rosterLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : roster.length === 0 ? (
        <Alert severity="info">No roster data available. Please try again later.</Alert>
      ) : filteredRoster.length === 0 ? (
        <Alert severity="info">No players found matching the filters.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: borderRadius.md,
            backgroundColor: 'background.paper',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'background.paper' }}>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Player</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Team</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Number</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Position</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Height</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Weight</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Last Attended</TableCell>
                <TableCell sx={{ fontWeight: typography.weight.bold, backgroundColor: 'background.paper' }}>Country</TableCell>
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
                            }}
                          >
                            {player.PLAYER_FIRST_NAME}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: typography.weight.semibold,
                              color: 'primary.main',
                            }}
                          >
                            {player.PLAYER_LAST_NAME}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'primary.main' }}>
                        {player.TEAM_ABBREVIATION || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.JERSEY_NUMBER || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.POSITION || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.HEIGHT || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.WEIGHT ? `${player.WEIGHT} lbs` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.COLLEGE || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {player.COUNTRY || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderSeasonLeaders = () => (
    <Box>
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

      {loading || !seasonLeaders ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <SeasonLeaders data={seasonLeaders} />
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <PageLayout sidebar={<UniversalSidebar />}>
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: typography.weight.bold,
                  fontSize: { xs: typography.size.h5, sm: typography.size.h4 },
                  color: 'text.primary',
                  mb: 0.5,
                  letterSpacing: '-0.02em',
                }}
              >
                Players
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}
              >
                Browse all NBA players and season leaders
              </Typography>
            </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.body,
                minHeight: 48,
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
      </PageLayout>
    </Box>
  );
};

export default Players;
