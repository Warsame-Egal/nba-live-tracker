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
import PageHeader from '../components/PageHeader';
import { typography, borderRadius, transitions, responsiveSpacing } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { SeasonLeadersResponse } from '../types/seasonleaders';
import { PlayerSummary } from '../types/player';

import { API_BASE_URL } from '../utils/apiConfig';

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
          if (data) {
            setRoster(data);
          }
          // Don't clear roster on error - keep existing data visible
        } catch (err) {
          console.error('Error fetching league roster:', err);
          // Don't clear roster on error
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

  const renderPlayerCard = (player: PlayerSummary) => {
    const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`;
    const playerId = player.PERSON_ID;

    return (
      <Paper
        key={playerId}
        elevation={0}
        onClick={() => navigate(`/player/${playerId}`)}
        sx={{
          p: responsiveSpacing.card,
          mb: responsiveSpacing.element,
          cursor: 'pointer',
          transition: transitions.normal,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: borderRadius.md,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
          <Avatar
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
            alt={fullName}
            sx={{ 
              width: 80,
              height: 106.67, // 3/4 aspect ratio
              aspectRatio: '3/4',
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.onerror = null;
              target.src = '';
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: typography.weight.bold,
                color: 'text.primary',
                fontSize: typography.editorial.metric.xs,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fullName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: typography.editorial.helper.xs,
                mb: 1.5,
              }}
            >
              {player.TEAM_ABBREVIATION || 'No Team'} • #{player.JERSEY_NUMBER || '—'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs, textTransform: 'lowercase' }}>
                  Position
                </Typography>
                <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, fontWeight: typography.weight.medium, mt: 0.25 }}>
                  {player.POSITION || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs, textTransform: 'lowercase' }}>
                  Height
                </Typography>
                <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, fontWeight: typography.weight.medium, mt: 0.25 }}>
                  {player.HEIGHT || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs, textTransform: 'lowercase' }}>
                  Weight
                </Typography>
                <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, fontWeight: typography.weight.medium, mt: 0.25 }}>
                  {player.WEIGHT ? `${player.WEIGHT} lbs` : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs, textTransform: 'lowercase' }}>
                  Country
                </Typography>
                <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, fontWeight: typography.weight.medium, mt: 0.25 }}>
                  {player.COUNTRY || '—'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderLeagueRoster = () => (
    <Box>
      {/* Search and Filters */}
      <Box sx={{ mb: { xs: 1, sm: 1.5 }, minHeight: { xs: 140, sm: 160 } }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search players"
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
            mb: responsiveSpacing.element, 
            borderRadius: borderRadius.sm,
            '& .MuiOutlinedInput-root': {
              fontSize: typography.editorial.helper.xs,
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: responsiveSpacing.element, flexWrap: 'wrap', mb: { xs: 1, sm: 1.5 } }}>
          <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 150 } }}>
            <InputLabel sx={{ fontSize: typography.editorial.helper.xs }}>All Players</InputLabel>
            <Select
              value={selectedLetter}
              label="All Players"
              onChange={(e) => setSelectedLetter(e.target.value)}
              MenuProps={{
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                PaperProps: {
                  sx: {
                    maxHeight: { xs: '60vh', sm: '50vh' },
                    mt: 0.5,
                  },
                },
                MenuListProps: {
                  sx: {
                    py: 0.5,
                  },
                },
              }}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: typography.editorial.helper.xs,
              }}
            >
              <MenuItem value="All Players">All Players</MenuItem>
              {alphabet.map(letter => (
                <MenuItem key={letter} value={letter}>{letter}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
            <InputLabel sx={{ fontSize: typography.editorial.helper.xs }}>All Teams</InputLabel>
            <Select
              value={selectedTeam}
              label="All Teams"
              onChange={(e) => setSelectedTeam(e.target.value)}
              MenuProps={{
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                PaperProps: {
                  sx: {
                    maxHeight: { xs: '60vh', sm: '50vh' },
                    mt: 0.5,
                  },
                },
                MenuListProps: {
                  sx: {
                    py: 0.5,
                  },
                },
              }}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: typography.editorial.helper.xs,
              }}
            >
              <MenuItem value="All Teams">All Teams</MenuItem>
              {uniqueTeams.map(team => (
                <MenuItem key={team} value={team}>{team}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 150 } }}>
            <InputLabel sx={{ fontSize: typography.editorial.helper.xs }}>All Positions</InputLabel>
            <Select
              value={selectedPosition}
              label="All Positions"
              onChange={(e) => setSelectedPosition(e.target.value)}
              MenuProps={{
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                PaperProps: {
                  sx: {
                    maxHeight: { xs: '60vh', sm: '50vh' },
                    mt: 0.5,
                  },
                },
                MenuListProps: {
                  sx: {
                    py: 0.5,
                  },
                },
              }}
              sx={{ 
                borderRadius: borderRadius.sm,
                fontSize: typography.editorial.helper.xs,
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
          sx={{ fontSize: typography.editorial.helper.xs }}
        >
          {filteredRoster.length} players • Page {currentPage} of {totalPages || 1}
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

      {/* Content Container - always rendered with minHeight */}
      <Box sx={{ minHeight: { xs: 600, sm: 800 } }}>
        {rosterLoading && roster.length === 0 ? (
          // Loading skeleton - only show if no data exists
          <>
            {/* Mobile skeleton */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              {[...Array(10)].map((_, index) => (
                <Skeleton 
                  key={index} 
                  variant="rectangular" 
                  height={200} 
                  sx={{ borderRadius: borderRadius.md, mb: 1.5 }} 
                />
              ))}
            </Box>
            {/* Desktop skeleton */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: borderRadius.md, mb: 1 }} />
              {[...Array(10)].map((_, index) => (
                <Skeleton 
                  key={index} 
                  variant="rectangular" 
                  height={56} 
                  sx={{ borderRadius: borderRadius.sm, mb: 0.5 }} 
                />
              ))}
            </Box>
          </>
        ) : roster.length === 0 ? (
          // Empty state
          <Alert severity="info" sx={{ borderRadius: borderRadius.md }}>
            No roster data available.
          </Alert>
        ) : filteredRoster.length === 0 ? (
          // No matches
          <Alert severity="info" sx={{ borderRadius: borderRadius.md }}>
            No players found matching your filters.
          </Alert>
        ) : (
          // Content - always show if data exists
          <>
            {/* Mobile Card View */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              {paginatedRoster.map(player => renderPlayerCard(player))}
            </Box>
            {/* Desktop Table View */}
            <Box sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: borderRadius.md,
                  backgroundColor: 'background.paper',
                  minHeight: { xs: 400, sm: 500 },
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'background.paper' }}>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>Player</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>Position</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>Height</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>Weight</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>School</TableCell>
                      <TableCell sx={{ fontWeight: typography.weight.semibold, backgroundColor: 'background.paper', fontSize: typography.editorial.helper.xs, py: 2.5, color: 'text.secondary' }}>Country</TableCell>
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
                          <TableCell sx={{ py: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
                                alt={fullName}
                                sx={{ 
                                  width: 40, 
                                  height: 40,
                                  aspectRatio: '1/1',
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
                                    fontWeight: typography.weight.bold,
                                    color: 'text.primary',
                                    fontSize: typography.editorial.helper.xs,
                                  }}
                                >
                                  {fullName}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: typography.editorial.helper.xs }}>
                              {player.TEAM_ABBREVIATION || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, color: 'text.secondary' }}>
                              {player.JERSEY_NUMBER || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, color: 'text.secondary' }}>
                              {player.POSITION || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, color: 'text.secondary' }}>
                              {player.HEIGHT || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, color: 'text.secondary' }}>
                              {player.WEIGHT ? `${player.WEIGHT} lbs` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, color: 'text.secondary' }}>
                              {player.COLLEGE || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            <Typography variant="body2" sx={{ fontSize: typography.editorial.helper.xs, color: 'text.secondary' }}>
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
          </>
        )}
      </Box>
    </Box>
  );

  const renderSeasonLeaders = () => (
    <Box sx={{ minHeight: { xs: 400, sm: 500 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', minHeight: { xs: 40, sm: 48 } }}>
        <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 180 } }}>
          <InputLabel sx={{ fontSize: typography.editorial.helper.xs }}>Season</InputLabel>
          <Select
            value={season}
            label="Season"
            onChange={(e) => handleSeasonChange(e.target.value)}
            sx={{ 
              borderRadius: borderRadius.sm,
              fontSize: typography.editorial.helper.xs,
            }}
          >
            {seasonOptions.map(seasonOption => (
              <MenuItem key={seasonOption} value={seasonOption}>
                {seasonOption}
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
        px: responsiveSpacing.container,
        py: responsiveSpacing.containerVertical,
        width: '100%',
      }}>
        {/* Page header - always rendered */}
        <PageHeader title="Players" />

        {/* Tabs - always rendered */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: responsiveSpacing.section, minHeight: { xs: 48, sm: 56 } }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: typography.weight.semibold,
                fontSize: typography.editorial.sectionTitle.xs,
                minHeight: { xs: 48, sm: 56 },
                transition: transitions.normal,
              },
            }}
          >
            <Tab label="Roster" value="roster" />
            <Tab label="Leaders" value="leaders" />
          </Tabs>
        </Box>

        {/* Tab Content - always rendered */}
        {activeTab === 'roster' && renderLeagueRoster()}
        {activeTab === 'leaders' && renderSeasonLeaders()}
      </Box>
    </Box>
  );
};

export default Players;
