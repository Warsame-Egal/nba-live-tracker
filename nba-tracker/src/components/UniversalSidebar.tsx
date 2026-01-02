import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { responsiveSpacing, typography, borderRadius } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { PlayerSummary } from '../types/player';
import { StandingsResponse } from '../types/standings';
import { getCurrentSeason, getSeasonOptions } from '../utils/season';
import { getTeamAbbreviation } from '../utils/teamMappings';
import { Game, WinProbability } from '../types/scoreboard';
import WinProbabilityTracker from './WinProbabilityTracker';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface UniversalSidebarProps {
  games?: Game[]; // Games for win probability tracker
  winProbabilities?: Map<string, WinProbability>; // Win probability data for live games
}

type TabValue = 'teams' | 'players' | 'win-probability';

/**
 * Universal sidebar component with Teams and Players tabs.
 * Provides search and filtering for teams and players across the app.
 */
const UniversalSidebar: React.FC<UniversalSidebarProps> = ({ games = [], winProbabilities = new Map() }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab based on current route
  const getInitialTab = (pathname: string): TabValue => {
    if (pathname.startsWith('/players')) return 'players';
    if (pathname.startsWith('/teams')) return 'teams';
    return 'teams';
  };
  
  const [activeTab, setActiveTab] = useState<TabValue>(() => getInitialTab(location.pathname));
  // Sidebar manages its own season state - isolated from main pages
  const [currentSeason, setCurrentSeason] = useState(() => getCurrentSeason());
  
  // Players tab state
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [playersSearchQuery, setPlayersSearchQuery] = useState('');
  const [playersLoading, setPlayersLoading] = useState(false);
  const [selectedStat, setSelectedStat] = useState('PTS');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Teams tab state
  const [allTeams, setAllTeams] = useState<Array<{ id: number; name: string; abbreviation: string }>>([]);
  const [displayedTeams, setDisplayedTeams] = useState<Array<{ id: number; name: string; abbreviation: string }>>([]);
  const [teamsSearchQuery, setTeamsSearchQuery] = useState('');
  const [teamsLoading, setTeamsLoading] = useState(false);
  
  // Prevent duplicate API calls
  const playersFetchingRef = useRef(false);
  const teamsFetchingRef = useRef(false);

  const seasonOptions = getSeasonOptions();

  // Update tab when route changes, but preserve tab if we're on a page that uses the sidebar (like standings)
  useEffect(() => {
    const pathname = location.pathname;
    // Only update tab if navigating to a different page type (players or teams pages)
    // Don't reset tab when just changing season on standings page
    if (pathname.startsWith('/players')) {
      setActiveTab('players');
    } else if (pathname.startsWith('/teams')) {
      setActiveTab('teams');
    }
    // If on standings or other pages, keep the current tab selection
  }, [location.pathname]);

  // Handle season change in sidebar (only affects sidebar data, not main pages)
  const handleSidebarSeasonChange = useCallback((newSeason: string) => {
    setCurrentSeason(newSeason);
    // Refresh sidebar data with new season
    if (activeTab === 'players') {
      // fetchTopPlayersByStat will be called via useEffect when currentSeason changes
    } else if (activeTab === 'teams') {
      // Teams data doesn't depend on season, so no refresh needed
    }
  }, [activeTab]);


  // Fetch top players by stat
  const fetchTopPlayersByStat = useCallback(async () => {
    if (playersFetchingRef.current) return;
    playersFetchingRef.current = true;
    setPlayersLoading(true);
    try {
      const data = await fetchJson<PlayerSummary[]>(
        `${API_BASE_URL}/api/v1/players/top-by-stat?season=${encodeURIComponent(currentSeason)}&stat=${encodeURIComponent(selectedStat)}&top_n=10`,
        {},
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching top players:', err);
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
      playersFetchingRef.current = false;
    }
  }, [currentSeason, selectedStat]);

  // Fetch players by search
  const fetchPlayers = useCallback(async (query: string) => {
    if (playersFetchingRef.current) return;
    playersFetchingRef.current = true;
    setPlayersLoading(true);
    try {
      const data = await fetchJson<PlayerSummary[]>(
        `${API_BASE_URL}/api/v1/players/search/${encodeURIComponent(query)}`,
        {},
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
      playersFetchingRef.current = false;
    }
  }, []);

  const getTeamAbbrev = useCallback((teamCity: string, teamName: string): string => {
    const fullName = `${teamCity} ${teamName}`;
    return getTeamAbbreviation(fullName);
  }, []);

  // Fetch all teams
  const fetchAllTeams = useCallback(async () => {
    if (teamsFetchingRef.current) return;
    teamsFetchingRef.current = true;
    setTeamsLoading(true);
    try {
      const data = await fetchJson<StandingsResponse>(
        `${API_BASE_URL}/api/v1/standings/season/${encodeURIComponent(currentSeason)}`,
        {},
        { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
      );

      const teamsList = data.standings.map(standing => ({
        id: standing.team_id,
        name: `${standing.team_city} ${standing.team_name}`,
        abbreviation: getTeamAbbrev(standing.team_city, standing.team_name),
      }));

      setAllTeams(teamsList);
      setDisplayedTeams(teamsList);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setAllTeams([]);
      setDisplayedTeams([]);
    } finally {
      setTeamsLoading(false);
      teamsFetchingRef.current = false;
    }
  }, [currentSeason, getTeamAbbrev]);

  // Reset refs when switching tabs to allow fresh fetches
  useEffect(() => {
    playersFetchingRef.current = false;
    teamsFetchingRef.current = false;
  }, [activeTab]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'players') {
      // Only fetch top players if search query is empty or short
      if (!playersSearchQuery || playersSearchQuery.trim().length < 2) {
        fetchTopPlayersByStat();
      }
    } else if (activeTab === 'teams') {
      fetchAllTeams();
    }
  }, [activeTab, fetchTopPlayersByStat, fetchAllTeams]);

  // Debounce helper to prevent duplicate timers
  const clearDebounceTimer = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  // Players search with debounce
  useEffect(() => {
    if (activeTab !== 'players') return;
    
    clearDebounceTimer();
    const timer = setTimeout(() => {
      if (playersSearchQuery.trim().length >= 2) {
        fetchPlayers(playersSearchQuery);
      } else {
        fetchTopPlayersByStat();
      }
    }, 300);

    debounceTimerRef.current = timer;
    return clearDebounceTimer;
  }, [playersSearchQuery, activeTab, fetchPlayers, fetchTopPlayersByStat]);

  // Teams search filter with debounce
  useEffect(() => {
    if (activeTab !== 'teams') return;
    
    clearDebounceTimer();
    const timer = setTimeout(() => {
      if (teamsSearchQuery.trim().length >= 2) {
        const query = teamsSearchQuery.toLowerCase();
        setDisplayedTeams(allTeams.filter(
          team => team.name.toLowerCase().includes(query) || team.abbreviation.toLowerCase().includes(query)
        ));
      } else {
        setDisplayedTeams(allTeams);
      }
    }, 300);

    debounceTimerRef.current = timer;
    return clearDebounceTimer;
  }, [teamsSearchQuery, allTeams, activeTab]);


  const handleTabChange = (_: unknown, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  const handleTitleClick = (tab: TabValue) => {
    if (tab === 'players') {
      navigate('/players');
    } else if (tab === 'teams') {
      navigate('/teams');
    }
  };

  const getStatValue = (player: PlayerSummary, stat: string): number | undefined => {
    switch (stat) {
      case 'PTS': return player.PTS;
      case 'REB': return player.REB;
      case 'AST': return player.AST;
      case 'STL': return player.STL;
      case 'BLK': return player.BLK;
      default: return player.PTS;
    }
  };

  // Format stat value for display
  const formatStatValue = (player: PlayerSummary, stat: string): string => {
    const value = getStatValue(player, stat);
    return value !== undefined && value !== null ? value.toFixed(1) : 'N/A';
  };

  const statOptions = [
    { value: 'PTS', label: 'Points' },
    { value: 'REB', label: 'Rebounds' },
    { value: 'AST', label: 'Assists' },
    { value: 'STL', label: 'Steals' },
    { value: 'BLK', label: 'Blocks' },
  ];



  const renderPlayersTab = () => (
    <>
      <Box sx={{ p: responsiveSpacing.container, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography
          variant="h6"
          onClick={() => handleTitleClick('players')}
          sx={{
            fontWeight: typography.weight.bold,
            mb: 2,
            fontSize: typography.size.h6,
            cursor: 'pointer',
            color: 'text.primary',
            '&:hover': {
              color: 'text.primary', // Neutral color, not blue
            },
          }}
        >
          Players
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Season</InputLabel>
          <Select
            value={currentSeason}
            label="Season"
            onChange={e => {
              handleSidebarSeasonChange(e.target.value);
            }}
            sx={{
              borderRadius: borderRadius.sm,
            }}
          >
            {seasonOptions.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          placeholder="Search players..."
          value={playersSearchQuery}
          onChange={e => setPlayersSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadius.sm,
            },
          }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>Sort by</InputLabel>
          <Select
            value={selectedStat}
            label="Sort by"
            onChange={e => setSelectedStat(e.target.value)}
            sx={{
              borderRadius: borderRadius.sm,
            }}
          >
            {statOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        position: 'relative',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        '@media (prefers-color-scheme: dark)': {
          scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            },
          },
        },
        WebkitOverflowScrolling: 'touch',
      }}>
        {playersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : players.length === 0 ? (
          <Box sx={{ px: responsiveSpacing.container, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {playersSearchQuery.trim().length >= 2 ? 'No players found' : 'Loading top players...'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {players.map(player => {
              const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`;
              const positionTeam = [player.POSITION, player.TEAM_ABBREVIATION].filter(Boolean).join(' • ');
              const statValue = formatStatValue(player, selectedStat);

              return (
                <ListItem key={player.PERSON_ID} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(`/player/${player.PERSON_ID}`)}
                    sx={{
                      py: 1.5,
                      px: responsiveSpacing.container,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.PERSON_ID}.png`}
                        sx={{
                          width: 40,
                          height: 40,
                          border: '2px solid',
                          borderColor: 'divider',
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={fullName}
                      secondary={positionTeam || 'N/A'}
                      primaryTypographyProps={{
                        fontSize: typography.size.body,
                        fontWeight: typography.weight.semibold,
                      }}
                      secondaryTypographyProps={{
                        fontSize: typography.size.caption,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: typography.weight.bold,
                        color: 'text.primary', // Neutral color for data, not blue
                        ml: 1,
                      }}
                    >
                      {statValue}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </>
  );

  const renderTeamsTab = () => (
    <>
      <Box sx={{ p: responsiveSpacing.container, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography
          variant="h6"
          onClick={() => handleTitleClick('teams')}
          sx={{
            fontWeight: typography.weight.bold,
            mb: 2,
            fontSize: typography.size.h6,
            cursor: 'pointer',
            color: 'text.primary',
            '&:hover': {
              color: 'text.primary', // Neutral color, not blue
            },
          }}
        >
          Teams
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Season</InputLabel>
          <Select
            value={currentSeason}
            label="Season"
            onChange={e => {
              handleSidebarSeasonChange(e.target.value);
            }}
            sx={{
              borderRadius: borderRadius.sm,
            }}
          >
            {seasonOptions.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          placeholder="Search teams..."
          value={teamsSearchQuery}
          onChange={e => setTeamsSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadius.sm,
            },
          }}
        />
      </Box>

      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        position: 'relative',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        '@media (prefers-color-scheme: dark)': {
          scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            },
          },
        },
        WebkitOverflowScrolling: 'touch',
      }}>
        {teamsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : displayedTeams.length === 0 ? (
          <Box sx={{ px: responsiveSpacing.container, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {teamsSearchQuery.trim().length >= 2 ? 'No teams found' : 'No teams available'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {displayedTeams.map(team => (
              <ListItem key={team.id} disablePadding>
                <ListItemButton
                  onClick={() => navigate(`/team/${team.id}`)}
                  sx={{
                    py: 1.5,
                    px: responsiveSpacing.container,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={`/logos/${team.abbreviation}.svg`}
                      sx={{
                        width: 40,
                        height: 40,
                        border: '2px solid',
                        borderColor: 'divider',
                        backgroundColor: 'transparent',
                      }}
                      onError={e => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/logos/default.svg';
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={team.name}
                    secondary={team.abbreviation}
                    primaryTypographyProps={{
                      fontSize: typography.size.body,
                      fontWeight: typography.weight.semibold,
                    }}
                    secondaryTypographyProps={{
                      fontSize: typography.size.caption,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.bodySmall,
              minHeight: 48,
            },
          }}
        >
          <Tab label="Teams" value="teams" />
          <Tab label="Players" value="players" />
          {/* Show win probability tab only when there are live games */}
          {games.filter(game => game.gameStatus === 2).length > 0 && (
            <Tab label="Win Probability" value="win-probability" />
          )}
        </Tabs>
      </Box>

      {activeTab === 'teams' && renderTeamsTab()}
      {activeTab === 'players' && renderPlayersTab()}
      {activeTab === 'win-probability' && (
        <WinProbabilityTracker games={games} winProbabilities={winProbabilities} />
      )}
    </Box>
  );
};

export default UniversalSidebar;

