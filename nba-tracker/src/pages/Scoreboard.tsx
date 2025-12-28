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
} from '@mui/material';
import { Search, Close, Event } from '@mui/icons-material';
import { ScoreboardResponse, Game } from '../types/scoreboard';
import { GamesResponse, GameSummary } from '../types/schedule';
import WebSocketService from '../services/websocketService';
import GameCard from '../components/GameCard';
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

  // Reference to the search container (to detect clicks outside)
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
      // Connect to WebSocket for live updates
      WebSocketService.connect(SCOREBOARD_WEBSOCKET_URL);
      // This function gets called whenever new score data arrives
      const handleScoreboardUpdate = (data: ScoreboardResponse) => {
        // Update games state efficiently using a Map
        // This prevents unnecessary re-renders
        setGames(prevGames => {
          const gameMap = new Map<string, Game | GameSummary>();

          // Add existing games to the map
          prevGames.forEach(g => {
            const key = 'gameId' in g ? g.gameId : g.game_id;
            gameMap.set(key, g);
          });

          // Update with new data from WebSocket
          data.scoreboard.games.forEach(newGame => {
            const key = 'gameId' in newGame ? newGame.gameId : (newGame as GameSummary).game_id;
            gameMap.set(key, newGame);
          });

          // Convert map back to array
          return Array.from(gameMap.values());
        });
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
          {gameList.map(game => (
            <Grid item xs={12} sm={6} lg={4} key={'gameId' in game ? game.gameId : game.game_id}>
              <Box>
                <GameCard
                  game={game}
                  hideScore={hideScore}
                  onClick={() => setSelectedGame(game)}
                />
                {/* Show top scorers for live games */}
                {'gameLeaders' in game && (
                  <Box sx={{ mt: 2 }}>
                    <ScoringLeaders selectedGame={game as Game} />
                  </Box>
                )}
              </Box>
            </Grid>
          ))}
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

        {/* Games Display */}
        {loading && !searchInput && games.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress size={60} />
          </Box>
        ) : isToday ? (
          // If viewing today, show all three categories
          <Box>
            {renderGameSection('Live Games', liveGames)}
            {renderGameSection('Upcoming Games', upcomingGames)}
            {renderGameSection('Completed Games', completedGames)}
          </Box>
        ) : (
          // If viewing past or future date, show appropriate category
          <Box>
            {selectedDate < today
              ? renderGameSection('Completed Games', completedGames)
              : renderGameSection('Future Games', upcomingGames, true)}
          </Box>
        )}

        {/* Empty state: no games scheduled */}
        {!loading && games.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
            <Event sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No games scheduled for this date.
            </Typography>
          </Box>
        )}

        {/* Empty state: games exist but don't match filters */}
        {!loading &&
          liveGames.length === 0 &&
          upcomingGames.length === 0 &&
          completedGames.length === 0 &&
          games.length !== 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No games found for the selected date.
              </Typography>
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
      </Container>
    </Box>
  );
};

export default Scoreboard;
