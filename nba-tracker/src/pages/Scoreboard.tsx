import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Container,
  TextField,
  Typography,
  Box,
  Grid,
  Paper,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Link as MuiLink,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Skeleton,
  Snackbar,
  Alert,
  Button,
} from '@mui/material';
import { Search, Close, Event, Sports, TrendingUp, Schedule, Notifications, CalendarToday, FilterList, Refresh } from '@mui/icons-material';
import { ScoreboardResponse, Game } from '../types/scoreboard';
import { GamesResponse, GameSummary } from '../types/schedule';
import WebSocketService from '../services/websocketService';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';
import Navbar from '../components/Navbar';
import WeeklyCalendar from '../components/WeeklyCalendar';
import GameDetailsModal from '../components/GameDetailsModal';
import { useSearchParams } from 'react-router-dom';
import { SearchResults } from '../types/search';
import ScoringLeaders from '../components/ScoringLeaders';
import debounce from 'lodash/debounce';
import { logger } from '../utils/logger';

// WebSocket URL for live score updates
const SCOREBOARD_WEBSOCKET_URL = `${
  window.location.protocol === 'https:' ? 'wss' : 'ws'
}://${import.meta.env.VITE_WS_URL}/api/v1/ws`;
// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Get today's date in YYYY-MM-DD format, adjusted for local timezone.
 */
const getLocalISODate = (): string => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

/**
 * Figure out if a game is live, upcoming, or completed based on its status.
 */
const getGameStatus = (game: Game | GameSummary): 'live' | 'upcoming' | 'completed' => {
  // Check if it's a live game (has homeTeam property)
  if ('homeTeam' in game) {
    if (game.gameStatusText && game.gameStatusText.toLowerCase().includes('final')) {
      return 'completed';
    }
    return 'live';
  }
  // Check if it's a scheduled game (has game_status property)
  if ('game_status' in game && typeof game.game_status === 'string') {
    const lowerStatus = game.game_status.toLowerCase();
    if (lowerStatus.includes('final')) return 'completed';
    if (lowerStatus.includes('live') || lowerStatus.includes('in progress')) return 'live';
    return 'upcoming';
  }
  return 'upcoming';
};

/**
 * Main scoreboard page that shows all NBA games.
 * Displays live games, upcoming games, and completed games.
 * Also has search functionality and a date picker.
 */
const Scoreboard = () => {
  // List of all games to display
  const [games, setGames] = useState<(Game | GameSummary)[]>([]);
  // Search results from the API
  const [searchResults, setSearchResults] = useState<SearchResults>({
    players: [],
    teams: [],
  });
  // Whether we're loading data
  const [loading, setLoading] = useState(false);
  // The game the user clicked on (to show details modal)
  const [selectedGame, setSelectedGame] = useState<Game | GameSummary | null>(null);
  // The date the user selected to view games for
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  // Get search query from URL if present
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  // The text the user typed in the search box
  const [searchInput, setSearchInput] = useState('');
  // Whether to show the search results dropdown
  const [showSearchResults, setShowSearchResults] = useState(false);
  // Filter type for games
  const [gameFilter, setGameFilter] = useState<'all' | 'close' | 'blowout' | 'overtime'>('all');
  // Track which games were recently updated (for animation effects)
  const [recentlyUpdatedGames, setRecentlyUpdatedGames] = useState<Set<string>>(new Set());
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; severity: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  // Reference to the search container (to detect clicks outside)
  const searchContainerRef = useRef<HTMLDivElement>(null);
  // Reference to track previous scores for detecting changes
  const previousScoresRef = useRef<Map<string, { homeScore: number; awayScore: number }>>(new Map());
  // Reference to track previous game states for detecting events
  const previousGameStatesRef = useRef<Map<string, { status: string; isOvertime: boolean; isFinal: boolean; differential: number; hasStarted: boolean }>>(new Map());

  // Split games into live, upcoming, and completed categories
  // This is memoized so it only recalculates when games or date changes
  const { liveGames, upcomingGames, completedGames } = useMemo(() => {
    // Filter games by search query if there is one
    const filtered = games.filter(game => {
      if (!searchQuery) return true;
      const homeName =
        'homeTeam' in game ? game.homeTeam.teamName : game.home_team.team_abbreviation;
      const awayName =
        'awayTeam' in game ? game.awayTeam.teamName : game.away_team.team_abbreviation;
      return (
        homeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        awayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    const today = getLocalISODate();
    // If viewing today, show all three categories
    if (selectedDate === today) {
      return {
        liveGames: filtered.filter(game => getGameStatus(game) === 'live'),
        upcomingGames: filtered.filter(game => getGameStatus(game) === 'upcoming'),
        completedGames: filtered.filter(game => getGameStatus(game) === 'completed'),
      };
    } else if (selectedDate < today) {
      // If viewing past date, only show completed games
      return {
        liveGames: [],
        upcomingGames: [],
        completedGames: filtered,
      };
    } else {
      // If viewing future date, only show upcoming games
      return {
        liveGames: [],
        upcomingGames: filtered,
        completedGames: [],
      };
    }
  }, [games, searchQuery, selectedDate]);

  /**
   * Set up WebSocket connection for live score updates.
   * Only connects if viewing today's games.
   */
  const setupWebSocket = useCallback(() => {
    if (selectedDate === getLocalISODate()) {
      // Clear games when switching to today to prevent mixing with previous date's games
      setGames([]);
      previousScoresRef.current.clear();
      previousGameStatesRef.current.clear();
      setRecentlyUpdatedGames(new Set());
      
      // Connect to WebSocket for live updates
      WebSocketService.connect(SCOREBOARD_WEBSOCKET_URL);
      // This function gets called whenever new score data arrives
      const handleScoreboardUpdate = (data: ScoreboardResponse) => {
        // Track which games had score changes for animation
        const updatedGameIds = new Set<string>();

        // Update games state efficiently using a Map
        // This prevents unnecessary re-renders
        setGames(prevGames => {
          const gameMap = new Map<string, Game | GameSummary>();

          // Add existing games to the map (these should only be from today's WebSocket)
          prevGames.forEach(g => {
            const key = 'gameId' in g ? g.gameId : g.game_id;
            gameMap.set(key, g);
          });

          // Update with new data from WebSocket and detect score changes
          data.scoreboard.games.forEach(newGame => {
            const key = 'gameId' in newGame ? newGame.gameId : (newGame as GameSummary).game_id;
            const isLiveGame = 'homeTeam' in newGame;
            const newHomeScore = isLiveGame ? newGame.homeTeam?.score ?? 0 : (newGame as GameSummary).home_team?.points ?? 0;
            const newAwayScore = isLiveGame ? newGame.awayTeam?.score ?? 0 : (newGame as GameSummary).away_team?.points ?? 0;
            const status = isLiveGame ? newGame.gameStatusText : (newGame as GameSummary).game_status || '';
            const statusLower = status.toLowerCase();
            const isOvertime = statusLower.includes('ot') && !statusLower.includes('final');
            const isFinal = statusLower.includes('final');
            const hasStarted = newHomeScore > 0 || newAwayScore > 0;
            const differential = Math.abs(newHomeScore - newAwayScore);
            
            // Get team names for toast messages
            const homeTeamName = isLiveGame ? newGame.homeTeam?.teamName : (newGame as GameSummary).home_team?.team_abbreviation;
            const awayTeamName = isLiveGame ? newGame.awayTeam?.teamName : (newGame as GameSummary).away_team?.team_abbreviation;
            const gameName = `${awayTeamName || 'Away'} vs ${homeTeamName || 'Home'}`;

            // Check if scores changed
            const previousScores = previousScoresRef.current.get(key);
            if (previousScores) {
              if (previousScores.homeScore !== newHomeScore || previousScores.awayScore !== newAwayScore) {
                updatedGameIds.add(key);
              }
            } else if (newHomeScore > 0 || newAwayScore > 0) {
              // First time we see scores for this game (game just started)
              updatedGameIds.add(key);
            }

            // Check for game events (game starts, overtime, game ends, close games)
            const previousState = previousGameStatesRef.current.get(key);
            if (previousState) {
              // Game just started (wasn't started before, now has scores and is live)
              if (!previousState.hasStarted && hasStarted && (statusLower.includes('live') || statusLower.match(/\b[1-4]q\b/))) {
                setToast({ message: `🏀 ${gameName} has started!`, severity: 'info' });
              }
              // Game went to overtime
              else if (!previousState.isOvertime && isOvertime && !isFinal) {
                setToast({ message: `⏰ ${gameName} is going to overtime!`, severity: 'warning' });
              }
              // Game ended
              else if (!previousState.isFinal && isFinal) {
                const winner = newHomeScore > newAwayScore ? homeTeamName : awayTeamName;
                setToast({ message: `🏁 ${gameName} - ${winner} wins!`, severity: 'success' });
              }
              // Game became close (within 5 points)
              else if (previousState.differential > 5 && differential <= 5 && hasStarted && !isFinal) {
                setToast({ message: `🔥 ${gameName} is getting close! (${differential} pts)`, severity: 'info' });
              }
            } else if (hasStarted && (statusLower.includes('live') || statusLower.match(/\b[1-4]q\b/))) {
              // First time we see this game and it's already started
              // Don't show toast on initial load, only on actual starts
            }

            // Update previous scores
            previousScoresRef.current.set(key, { homeScore: newHomeScore, awayScore: newAwayScore });
            // Update previous game state
            previousGameStatesRef.current.set(key, { status, isOvertime, isFinal, differential, hasStarted });

            gameMap.set(key, newGame);
          });

          // Convert map back to array
          return Array.from(gameMap.values());
        });

        // Set recently updated games for animation
        if (updatedGameIds.size > 0) {
          setRecentlyUpdatedGames(updatedGameIds);
          // Clear the animation state after 2 seconds
          setTimeout(() => {
            setRecentlyUpdatedGames(prev => {
              const newSet = new Set(prev);
              updatedGameIds.forEach(id => newSet.delete(id));
              return newSet;
            });
          }, 2000);
        }

        setLoading(false);
      };
      // Subscribe to score updates
      WebSocketService.subscribe(handleScoreboardUpdate);
      // Cleanup: unsubscribe when component unmounts or date changes
      return () => {
        WebSocketService.unsubscribe(handleScoreboardUpdate);
        WebSocketService.disconnect();
      };
    }
    return () => {};
  }, [selectedDate]);

  // Set up WebSocket when component mounts or date changes
  useEffect(() => setupWebSocket(), [setupWebSocket]);

  /**
   * Search for players and teams as the user types.
   * Uses debouncing to avoid making too many API calls.
   */
  useEffect(() => {
    const abortController = new AbortController();
    // Wait 300ms after user stops typing before searching
    const debouncedFetch = debounce(async () => {
      if (!searchInput) {
        // Clear results if search is empty
        setSearchResults({ players: [], teams: [] });
        setShowSearchResults(false);
        return;
      }
      setLoading(true);
      setShowSearchResults(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/search?q=${searchInput}`, {
          signal: abortController.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch search results.');
        const data: SearchResults = await response.json();
        setSearchResults(data);
      } catch (err) {
        // Don't log abort errors (they're normal when user types quickly)
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('Error searching players and teams', err);
        }
        setSearchResults({ players: [], teams: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    debouncedFetch();
    // Cleanup: cancel the request if user types again or component unmounts
    return () => {
      abortController.abort();
      debouncedFetch.cancel();
    };
  }, [searchInput]);

  /**
   * Fetch games for a specific date when user selects a different date.
   * Only runs if the selected date is not today (today uses WebSocket).
   */
  useEffect(() => {
    // Clear games and refs when switching dates to prevent mixing data
    setGames([]);
    previousScoresRef.current.clear();
    previousGameStatesRef.current.clear();
    setRecentlyUpdatedGames(new Set());
    
    if (selectedDate !== getLocalISODate()) {
      const fetchGamesByDate = async (date: string) => {
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/schedule/date/${date}`);
          const data: GamesResponse = await response.json();
          setGames(data.games);
          setSelectedGame(null);
        } catch (err) {
          logger.error('Error fetching games for date', err);
        } finally {
          setLoading(false);
        }
      };
      fetchGamesByDate(selectedDate);
    }
  }, [selectedDate]);

  /**
   * Close search results dropdown when user clicks outside of it.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = getLocalISODate();
  const isToday = selectedDate === today;

  /**
   * Calculate game statistics from the current games list.
   * Only calculates stats for today's games to prevent showing incorrect data.
   */
  const gameStats = useMemo(() => {
    // Only show stats for today's games
    if (!isToday) {
      return {
        totalGames: 0,
        gamesInProgress: 0,
        closestGame: null,
        closestDifferential: null,
      };
    }

    const allGamesWithScores = games.filter(game => {
      const isLiveGame = 'homeTeam' in game;
      const homeScore = isLiveGame ? game.homeTeam?.score ?? 0 : game.home_team?.points ?? 0;
      const awayScore = isLiveGame ? game.awayTeam?.score ?? 0 : game.away_team?.points ?? 0;
      return homeScore > 0 || awayScore > 0;
    });

    const totalGames = games.length;
    // Only count games that are actually live (started and in progress, not just scheduled)
    const gamesInProgress = games.filter(game => {
      const status = 'homeTeam' in game ? game.gameStatusText : game.game_status || '';
      const statusLower = status.toLowerCase();
      
      // Game must be explicitly marked as LIVE or in a quarter/OT
      const isLive = statusLower.includes('live') || 
                     (statusLower.match(/\b[1-4]q\b/) && !statusLower.includes('final')) ||
                     (statusLower.includes('ot') && !statusLower.includes('final'));
      
      // Also check if game has scores (meaning it has actually started)
      const isLiveGame = 'homeTeam' in game;
      const homeScore = isLiveGame ? game.homeTeam?.score ?? 0 : game.home_team?.points ?? 0;
      const awayScore = isLiveGame ? game.awayTeam?.score ?? 0 : game.away_team?.points ?? 0;
      const hasStarted = homeScore > 0 || awayScore > 0;
      
      // Must be live AND have started (not just scheduled)
      return isLive && hasStarted;
    }).length;

    // Find closest game (smallest score differential) - only for live/ongoing games
    let closestGame: Game | GameSummary | null = null;
    let closestDifferential: number | null = null;
    
    allGamesWithScores.forEach(game => {
      const isLiveGame = 'homeTeam' in game;
      const status = isLiveGame ? game.gameStatusText : game.game_status || '';
      const statusLower = status.toLowerCase();
      const isFinal = statusLower.includes('final');
      
      // Only consider non-final games for closest game
      if (!isFinal) {
        const homeScore = isLiveGame ? game.homeTeam?.score ?? 0 : game.home_team?.points ?? 0;
        const awayScore = isLiveGame ? game.awayTeam?.score ?? 0 : game.away_team?.points ?? 0;
        const differential = Math.abs(homeScore - awayScore);
        if (closestDifferential === null || differential < closestDifferential) {
          closestGame = game;
          closestDifferential = differential;
        }
      }
    });

    return {
      totalGames,
      gamesInProgress,
      closestGame,
      closestDifferential,
    };
  }, [games, isToday]);

  /**
   * Apply game filter to the game lists.
   */
  const applyGameFilter = useCallback(
    (gameList: (Game | GameSummary)[]): (Game | GameSummary)[] => {
      if (gameFilter === 'all') return gameList;

      return gameList.filter(game => {
        const isLiveGame = 'homeTeam' in game;
        const homeScore = isLiveGame ? game.homeTeam?.score ?? 0 : game.home_team?.points ?? 0;
        const awayScore = isLiveGame ? game.awayTeam?.score ?? 0 : game.away_team?.points ?? 0;
        const differential = Math.abs(homeScore - awayScore);
        const status = isLiveGame ? game.gameStatusText : game.game_status || '';

        switch (gameFilter) {
          case 'close':
            return differential <= 10 && (homeScore > 0 || awayScore > 0);
          case 'blowout':
            return differential >= 20 && (homeScore > 0 || awayScore > 0);
          case 'overtime':
            return status.toLowerCase().includes('ot') || status.toLowerCase().includes('overtime');
          default:
            return true;
        }
      });
    },
    [gameFilter],
  );

  // Apply filters to game lists
  const filteredLiveGames = useMemo(() => applyGameFilter(liveGames), [liveGames, applyGameFilter]);
  const filteredUpcomingGames = useMemo(
    () => applyGameFilter(upcomingGames),
    [upcomingGames, applyGameFilter],
  );
  const filteredCompletedGames = useMemo(
    () => applyGameFilter(completedGames),
    [completedGames, applyGameFilter],
  );

  /**
   * Helper function to render a section of games (live, upcoming, or completed).
   */
  const renderGameSection = (
    title: string,
    gameList: (Game | GameSummary)[],
    hideScore: boolean = false,
  ) => {
    if (gameList.length === 0) return null;

    return (
      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {title}
          </Typography>
          <Chip
            label={gameList.length}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'text.secondary',
              fontWeight: 600,
            }}
          />
        </Box>
        <Grid container spacing={3}>
          {gameList.map(game => {
            const gameId = 'gameId' in game ? game.gameId : game.game_id;
            const isRecentlyUpdated = recentlyUpdatedGames.has(gameId);
            return (
              <Grid item xs={12} sm={6} lg={4} key={gameId}>
                <Box>
                  <GameCard
                    game={game}
                    hideScore={hideScore}
                    onClick={() => setSelectedGame(game)}
                    isRecentlyUpdated={isRecentlyUpdated}
                  />
                  {/* Show top scorers for live games */}
                  {'gameLeaders' in game && (
                    <Box sx={{ mt: 2 }}>
                      <ScoringLeaders selectedGame={game as Game} />
                    </Box>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4, md: 5 } }}>
        {/* Header with search and date picker */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: 3,
            mb: 5,
          }}
        >
          {/* Search box */}
          <Box ref={searchContainerRef} sx={{ position: 'relative', width: { xs: '100%', md: '40%' } }}>
            <TextField
              fullWidth
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search players or teams..."
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    {loading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <IconButton
                        onClick={() => setSearchInput('')}
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      >
                        <Close />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />
            {/* Search results dropdown */}
            {showSearchResults && (searchResults.players.length > 0 || searchResults.teams.length > 0) && (
              <Paper
                elevation={8}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                  zIndex: 1000,
                  backgroundColor: 'background.paper',
                }}
              >
                <List dense>
                  {/* Players section */}
                  {searchResults.players.length > 0 && (
                    <>
                      <ListItem>
                        <ListItemText
                          primary="Players"
                          primaryTypographyProps={{
                            variant: 'caption',
                            sx: { fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' },
                          }}
                        />
                      </ListItem>
                      {searchResults.players.map(player => {
                        const parts = player.name.split(' ');
                        const firstName = parts.slice(0, -1).join(' ');
                        const lastName = parts[parts.length - 1];
                        return (
                          <ListItem
                            key={`p${player.id}`}
                            component={MuiLink}
                            href={`/players/${player.id}`}
                            onClick={() => setShowSearchResults(false)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
                            }}
                          >
                            <ListItemText
                              primary={`${firstName} ${lastName}`}
                              secondary={player.team_abbreviation}
                              primaryTypographyProps={{ fontWeight: 600 }}
                            />
                          </ListItem>
                        );
                      })}
                    </>
                  )}
                  {/* Teams section */}
                  {searchResults.teams.length > 0 && (
                    <>
                      <ListItem>
                        <ListItemText
                          primary="Teams"
                          primaryTypographyProps={{
                            variant: 'caption',
                            sx: { fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' },
                          }}
                        />
                      </ListItem>
                      {searchResults.teams.map(team => (
                        <ListItem
                          key={`t${team.id}`}
                          component={MuiLink}
                          href={`/team/${team.id}`}
                          onClick={() => setShowSearchResults(false)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
                          }}
                        >
                          <ListItemText
                            primary={team.name}
                            secondary={team.abbreviation}
                            primaryTypographyProps={{ fontWeight: 600 }}
                          />
                        </ListItem>
                      ))}
                    </>
                  )}
                </List>
              </Paper>
            )}
          </Box>

          {/* Date picker calendar */}
          <Box sx={{ width: { xs: '100%', md: 'auto' }, display: 'flex', justifyContent: 'center' }}>
            <WeeklyCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          </Box>
        </Box>

        {/* Game Statistics Summary Bar */}
        {loading && isToday ? (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 4 },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              {/* Stats Skeleton */}
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 2, sm: 4 },
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={20} height={20} />
                  <Box>
                    <Skeleton variant="text" width={70} height={14} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width={30} height={24} />
                  </Box>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={20} height={20} />
                  <Box>
                    <Skeleton variant="text" width={80} height={14} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width={30} height={24} />
                  </Box>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={20} height={20} />
                  <Box>
                    <Skeleton variant="text" width={90} height={14} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width={50} height={24} />
                  </Box>
                </Box>
              </Box>

              {/* Filter Buttons Skeleton */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={110} height={32} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={90} height={32} sx={{ borderRadius: 1 }} />
              </Box>
            </Box>
          </Paper>
        ) : (
          games.length > 0 && isToday && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 4,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 2, sm: 4 },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                {/* Stats */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: { xs: 2, sm: 4 },
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Sports sx={{ color: 'text.secondary', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Total Games
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {gameStats.totalGames}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp sx={{ color: 'error.main', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        In Progress
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {gameStats.gamesInProgress}
                      </Typography>
                    </Box>
                  </Box>
                  {gameStats.closestGame && gameStats.closestDifferential !== null && (
                    <>
                      <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule sx={{ color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            Closest Game
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {gameStats.closestDifferential} pts
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                </Box>

                {/* Filter Buttons */}
                <ToggleButtonGroup
                  value={gameFilter}
                  exclusive
                  onChange={(_, newValue) => newValue && setGameFilter(newValue)}
                  size="small"
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 2,
                      py: 0.75,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        borderColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="all">All Games</ToggleButton>
                  <ToggleButton value="close">Close (≤10)</ToggleButton>
                  <ToggleButton value="blowout">Blowout (≥20)</ToggleButton>
                  <ToggleButton value="overtime">Overtime</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Paper>
          )
        )}

        {/* Games Display */}
        {loading && !searchInput && games.length === 0 ? (
          <Box>
            {/* Skeleton loading for game cards */}
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Skeleton variant="text" width={150} height={32} />
                <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
              </Box>
              <Grid container spacing={3}>
                {[...Array(6)].map((_, index) => (
                  <Grid item xs={12} sm={6} lg={4} key={index}>
                    <GameCardSkeleton />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        ) : isToday ? (
          // If viewing today, show all three categories with filters applied
          <Box>
            {loading && (
              <Box sx={{ mb: 5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Skeleton variant="text" width={150} height={32} />
                  <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                </Box>
                <Grid container spacing={3}>
                  {[...Array(3)].map((_, index) => (
                    <Grid item xs={12} sm={6} lg={4} key={index}>
                      <GameCardSkeleton />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            {renderGameSection('Live Games', filteredLiveGames)}
            {renderGameSection('Upcoming Games', filteredUpcomingGames)}
            {renderGameSection('Completed Games', filteredCompletedGames)}
          </Box>
        ) : (
          // If viewing past or future date, show appropriate category with filters applied
          <Box>
            {loading && (
              <Box sx={{ mb: 5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Skeleton variant="text" width={150} height={32} />
                  <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                </Box>
                <Grid container spacing={3}>
                  {[...Array(3)].map((_, index) => (
                    <Grid item xs={12} sm={6} lg={4} key={index}>
                      <GameCardSkeleton />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            {selectedDate < today
              ? renderGameSection('Completed Games', filteredCompletedGames)
              : renderGameSection('Future Games', filteredUpcomingGames, true)}
          </Box>
        )}

        {/* Empty state: no games scheduled */}
        {!loading && games.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: { xs: 8, sm: 12 },
              px: 3,
              minHeight: '50vh',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                mb: 4,
                animation: 'float 3s ease-in-out infinite',
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-10px)' },
                },
              }}
            >
              <Event
                sx={{
                  fontSize: { xs: 100, sm: 120 },
                  color: 'primary.main',
                  opacity: 0.3,
                }}
              />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 1,
                textAlign: 'center',
                color: 'text.primary',
              }}
            >
              No Games Scheduled
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                textAlign: 'center',
                mb: 4,
                maxWidth: 500,
                lineHeight: 1.6,
              }}
            >
              There are no NBA games scheduled for {selectedDate === getLocalISODate() ? 'today' : 'this date'}. Check
              another date or come back later!
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<CalendarToday />}
                onClick={() => setSelectedDate(getLocalISODate())}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                View Today's Games
              </Button>
              <Button
                variant="outlined"
                startIcon={<Schedule />}
                onClick={() => {
                  const tomorrow = new Date(selectedDate);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow.toISOString().split('T')[0]);
                }}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                View Tomorrow
              </Button>
            </Box>
          </Box>
        )}

        {/* Empty state: games exist but don't match filters */}
        {!loading &&
          liveGames.length === 0 &&
          upcomingGames.length === 0 &&
          completedGames.length === 0 &&
          games.length !== 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 8, sm: 12 },
                px: 3,
                minHeight: '50vh',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  mb: 4,
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 0.5 },
                    '50%': { opacity: 1 },
                  },
                }}
              >
                <FilterList
                  sx={{
                    fontSize: { xs: 100, sm: 120 },
                    color: 'text.disabled',
                    opacity: 0.3,
                  }}
                />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  textAlign: 'center',
                  color: 'text.primary',
                }}
              >
                No Games Match Your Filters
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  mb: 4,
                  maxWidth: 500,
                  lineHeight: 1.6,
                }}
              >
                Try adjusting your filters or selecting a different date to see more games.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => setGameFilter('all')}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Clear Filters
              </Button>
            </Box>
          )}

        {/* Game details modal (shows when user clicks a game) */}
        {selectedGame && (
          <GameDetailsModal
            gameId={'gameId' in selectedGame ? selectedGame.gameId : selectedGame.game_id}
            open={!!selectedGame}
            onClose={() => setSelectedGame(null)}
          />
        )}

        {/* Toast notifications */}
        <Snackbar
          open={!!toast}
          autoHideDuration={5000}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 8 }}
        >
          <Alert
            onClose={() => setToast(null)}
            severity={toast?.severity || 'info'}
            variant="filled"
            sx={{ width: '100%' }}
            icon={<Notifications />}
          >
            {toast?.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default Scoreboard;
