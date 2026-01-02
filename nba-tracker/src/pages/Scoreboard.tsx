import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TextField,
  Typography,
  Box,
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
import { Search, Close, Event, Notifications, CalendarToday, FilterList, Refresh, Schedule } from '@mui/icons-material';
import { ScoreboardResponse, Game, KeyMoment, WinProbability } from '../types/scoreboard';
import { GamesResponse, GameSummary, GameLeaders } from '../types/schedule';
import WebSocketService from '../services/websocketService';
import GameRow from '../components/GameRow';
import { GameInsightData } from '../components/GameInsight';
import Navbar from '../components/Navbar';
import PageLayout from '../components/PageLayout';
import WeeklyCalendar from '../components/WeeklyCalendar';
import GameDetailsDrawer from '../components/GameDetailsDrawer';
import UniversalSidebar from '../components/UniversalSidebar';
import { useSearchParams } from 'react-router-dom';
import { SearchResults } from '../types/search';
import debounce from 'lodash/debounce';
import { logger } from '../utils/logger';
import { responsiveSpacing, borderRadius, typography, zIndex } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';

// WebSocket URL for live score updates
const SCOREBOARD_WEBSOCKET_URL = `${
  window.location.protocol === 'https:' ? 'wss' : 'ws'
}://${import.meta.env.VITE_WS_URL || 'localhost:8000'}/api/v1/ws`;
// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Get today's date in YYYY-MM-DD format (local timezone)
const getLocalISODate = (): string => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

// Determine if game is live, upcoming, or completed
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

// Main scoreboard page showing all NBA games with search and date picker
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
  // The game the user clicked on (to show details modal and top sections)
  const [selectedGame, setSelectedGame] = useState<Game | GameSummary | null>(null);
  // The tab to show in the drawer (box score or play-by-play)
  // null means drawer is closed, 'box' or 'play' means drawer is open
  const [drawerTab, setDrawerTab] = useState<'box' | 'play' | null>(null);
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
  // Reference to store game leaders from schedule endpoint (for merging with WebSocket updates)
  const scheduleGameLeadersRef = useRef<Map<string, GameLeaders>>(new Map());
  
  
  // State for AI insights (game_id -> insight)
  const [gameInsights, setGameInsights] = useState<Map<string, GameInsightData>>(new Map());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  // State for key moments - stores the most recent key moment for each game
  // Key moments are automatically detected important plays (game-tying shots, lead changes, etc.)
  // We only keep the most recent one per game to avoid cluttering the UI
  const [gameKeyMoments, setGameKeyMoments] = useState<Map<string, KeyMoment>>(new Map());
  // State for win probability - stores current win probability for each live game
  // Win probability shows the likelihood of each team winning at any given moment
  const [gameWinProbabilities, setGameWinProbabilities] = useState<Map<string, WinProbability>>(new Map());

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
      setGameInsights(new Map());
      setDismissedInsights(new Set());
      setGameKeyMoments(new Map());
      
      // Handle insights messages from WebSocket
      const handleInsightsEvent = (event: CustomEvent) => {
        try {
          const data = event.detail;
          console.log('[Scoreboard] Received insights event:', data);
          if (data && data.type === 'insights') {
            console.log('[Scoreboard] Insights message structure:', {
              hasData: !!data.data,
              hasInsights: !!(data.data && data.data.insights),
              insightsLength: data.data?.insights?.length || 0
            });
            
            if (data.data && data.data.insights && Array.isArray(data.data.insights)) {
              console.log('[Scoreboard] Processing insights array:', data.data.insights);
              const newInsights = new Map<string, GameInsightData>();
              data.data.insights.forEach((insight: GameInsightData, index: number) => {
                console.log(`[Scoreboard] Processing insight ${index}:`, insight);
                if (insight && insight.game_id && insight.type && insight.type !== 'none' && insight.text) {
                  console.log(`[Scoreboard] ✓ Adding insight for game ${insight.game_id}:`, insight);
                  newInsights.set(insight.game_id, insight);
                } else {
                  console.log(`[Scoreboard] ✗ Skipping insight ${index} - missing/invalid fields:`, {
                    hasInsight: !!insight,
                    hasGameId: !!insight?.game_id,
                    gameId: insight?.game_id,
                    type: insight?.type,
                    hasText: !!insight?.text,
                    text: insight?.text
                  });
                }
              });
              
              if (newInsights.size > 0) {
                setGameInsights(prev => {
                  const merged = new Map(prev);
                  newInsights.forEach((insight, gameId) => {
                    merged.set(gameId, insight);
                  });
                  console.log('[Scoreboard] Updated game insights map. Total insights:', merged.size);
                  console.log('[Scoreboard] Insight keys:', Array.from(merged.keys()));
                  return merged;
                });
              } else {
                console.log('[Scoreboard] No valid insights to add after filtering');
              }
            } else {
              console.log('[Scoreboard] No insights array found in data:', data);
            }
          } else {
            console.log('[Scoreboard] Not an insights message or missing data:', data);
          }
        } catch (error) {
          console.error('[Scoreboard] Error parsing insights message', error);
          logger.error('Error parsing insights message', error);
        }
      };
      
      // Handle key moments messages from WebSocket
      // When the backend detects a key moment (like a game-tying shot or lead change),
      // it sends it to us via WebSocket. We update our state so the badge appears on the game row.
      const handleKeyMomentsEvent = (event: CustomEvent) => {
        try {
          const data = event.detail;
          console.log('[Scoreboard] Received key moments event:', data);
          if (data && data.type === 'key_moments' && data.data && data.data.moments_by_game) {
            const momentsByGame = data.data.moments_by_game;
            console.log('[Scoreboard] Processing key moments for games:', Object.keys(momentsByGame));
            
            setGameKeyMoments(prev => {
              const merged = new Map(prev);
              // Update with most recent moment for each game
              // We only keep the most recent one per game to keep the UI clean
              Object.entries(momentsByGame).forEach(([gameId, moments]: [string, any]) => {
                if (Array.isArray(moments) && moments.length > 0) {
                  // Get the most recent moment (first in array should be most recent)
                  const mostRecent = moments[0];
                  if (mostRecent) {
                    merged.set(gameId, mostRecent);
                    console.log(`[Scoreboard] Updated key moment for game ${gameId}:`, mostRecent.type);
                  }
                }
              });
              return merged;
            });
          }
        } catch (error) {
          console.error('[Scoreboard] Error parsing key moments message', error);
          logger.error('Error parsing key moments message', error);
        }
      };
      
      // Handle win probability messages from WebSocket
      // When the backend calculates win probability for live games, it sends updates via WebSocket.
      // We update our state so the win probability tracker can display the data.
      const handleWinProbabilityEvent = (event: CustomEvent) => {
        try {
          const data = event.detail;
          console.log('[Scoreboard] Received win probability event:', data);
          if (data && data.type === 'win_probability' && data.data && data.data.probabilities_by_game) {
            const probabilitiesByGame = data.data.probabilities_by_game;
            console.log('[Scoreboard] Processing win probabilities for games:', Object.keys(probabilitiesByGame));
            
            setGameWinProbabilities(prev => {
              const merged = new Map(prev);
              // Update win probability for each game
              Object.entries(probabilitiesByGame).forEach(([gameId, winProb]: [string, any]) => {
                if (winProb) {
                  merged.set(gameId, winProb);
                  console.log(`[Scoreboard] Updated win probability for game ${gameId}:`, 
                    `Home ${(winProb.home_win_prob * 100).toFixed(1)}%`);
                }
              });
              return merged;
            });
          }
        } catch (error) {
          console.error('[Scoreboard] Error parsing win probability message', error);
          logger.error('Error parsing win probability message', error);
        }
      };
      
      // Listen for insights events
      window.addEventListener('websocket-insights', handleInsightsEvent as EventListener);
      // Listen for key moments events
      window.addEventListener('websocket-key-moments', handleKeyMomentsEvent as EventListener);
      // Listen for win probability events
      window.addEventListener('websocket-win-probability', handleWinProbabilityEvent as EventListener);
      
      // Connect to WebSocket for live updates
      WebSocketService.connect(SCOREBOARD_WEBSOCKET_URL);
      // This function gets called whenever new score data arrives
      const handleScoreboardUpdate = (data: ScoreboardResponse) => {
        // Check if data has scoreboard structure
        if (!data || !data.scoreboard || !data.scoreboard.games) {
          logger.warn('Invalid scoreboard data received from WebSocket', data);
          return;
        }
        
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
              if (!previousState.hasStarted && hasStarted && (statusLower.includes('live') || statusLower.match(/\b[1-4]q\b/))) {
                setToast({ message: `${gameName} has started!`, severity: 'info' });
              } else if (!previousState.isOvertime && isOvertime && !isFinal) {
                setToast({ message: `${gameName} is going to overtime!`, severity: 'warning' });
              } else if (!previousState.isFinal && isFinal) {
                const winner = newHomeScore > newAwayScore ? homeTeamName : awayTeamName;
                setToast({ message: `${gameName} - ${winner} wins!`, severity: 'success' });
              } else if (previousState.differential > 5 && differential <= 5 && hasStarted && !isFinal) {
                setToast({ message: `${gameName} is getting close! (${differential} pts)`, severity: 'info' });
              }
            } else if (hasStarted && (statusLower.includes('live') || statusLower.match(/\b[1-4]q\b/))) {
              // Don't show toast on initial load
            }

            // Update previous scores
            previousScoresRef.current.set(key, { homeScore: newHomeScore, awayScore: newAwayScore });
            // Update previous game state
            previousGameStatesRef.current.set(key, { status, isOvertime, isFinal, differential, hasStarted });

            const scheduleLeaders = scheduleGameLeadersRef.current.get(key);
            if (scheduleLeaders && 
                (scheduleLeaders.homeLeaders || scheduleLeaders.awayLeaders) &&
                (!newGame.gameLeaders || (!newGame.gameLeaders.homeLeaders && !newGame.gameLeaders.awayLeaders))) {
              (newGame as Game).gameLeaders = {
                homeLeaders: scheduleLeaders.homeLeaders ? {
                  personId: scheduleLeaders.homeLeaders.personId,
                  name: scheduleLeaders.homeLeaders.name,
                  jerseyNum: scheduleLeaders.homeLeaders.jerseyNum || 'N/A',
                  position: scheduleLeaders.homeLeaders.position || 'N/A',
                  teamTricode: scheduleLeaders.homeLeaders.teamTricode || '',
                  points: scheduleLeaders.homeLeaders.points,
                  rebounds: scheduleLeaders.homeLeaders.rebounds,
                  assists: scheduleLeaders.homeLeaders.assists,
                } : null,
                awayLeaders: scheduleLeaders.awayLeaders ? {
                  personId: scheduleLeaders.awayLeaders.personId,
                  name: scheduleLeaders.awayLeaders.name,
                  jerseyNum: scheduleLeaders.awayLeaders.jerseyNum || 'N/A',
                  position: scheduleLeaders.awayLeaders.position || 'N/A',
                  teamTricode: scheduleLeaders.awayLeaders.teamTricode || '',
                  points: scheduleLeaders.awayLeaders.points,
                  rebounds: scheduleLeaders.awayLeaders.rebounds,
                  assists: scheduleLeaders.awayLeaders.assists,
                } : null,
              };
            }

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
        window.removeEventListener('websocket-insights', handleInsightsEvent as EventListener);
        window.removeEventListener('websocket-key-moments', handleKeyMomentsEvent as EventListener);
        window.removeEventListener('websocket-win-probability', handleWinProbabilityEvent as EventListener);
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
        const data = await fetchJson<SearchResults>(
          `${API_BASE_URL}/api/v1/search?q=${searchInput}`,
          { signal: abortController.signal },
          { maxRetries: 2, retryDelay: 500, timeout: 15000 }
        );
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
   */
  useEffect(() => {
    // Clear games and refs when switching dates to prevent mixing data
    setGames([]);
    previousScoresRef.current.clear();
    previousGameStatesRef.current.clear();
    setRecentlyUpdatedGames(new Set());
    scheduleGameLeadersRef.current.clear();
    
    const fetchGamesByDate = async (date: string) => {
      setLoading(true);
      try {
        const data = await fetchJson<GamesResponse>(
          `${API_BASE_URL}/api/v1/schedule/date/${date}`,
          {},
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 }
        );
        
        if (date === getLocalISODate()) {
          scheduleGameLeadersRef.current.clear();
          data.games.forEach(game => {
            if (game.gameLeaders) {
              scheduleGameLeadersRef.current.set(game.game_id, game.gameLeaders);
            }
          });
        }
        
        setGames(data.games);
        setSelectedGame(null);
      } catch (err) {
        logger.error('Error fetching games for date', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGamesByDate(selectedDate);
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
   */
  const gameStats = useMemo(() => {
    if (!isToday) {
    return {
      totalGames: 0,
      gamesInProgress: 0,
    };
    }

    const totalGames = games.length;
    const gamesInProgress = games.filter(game => {
      const status = 'homeTeam' in game ? game.gameStatusText : game.game_status || '';
      const statusLower = status.toLowerCase();
      const isLive = statusLower.includes('live') || 
                     (statusLower.match(/\b[1-4]q\b/) && !statusLower.includes('final')) ||
                     (statusLower.includes('ot') && !statusLower.includes('final'));
      const isLiveGame = 'homeTeam' in game;
      const homeScore = isLiveGame ? game.homeTeam?.score ?? 0 : game.home_team?.points ?? 0;
      const awayScore = isLiveGame ? game.awayTeam?.score ?? 0 : game.away_team?.points ?? 0;
      const hasStarted = homeScore > 0 || awayScore > 0;
      return isLive && hasStarted;
    }).length;

    return {
      totalGames,
      gamesInProgress,
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
   * Helper function to render a section of games in horizontal rows.
   */
  const renderGameSection = (
    title: string,
    gameList: (Game | GameSummary)[],
  ) => {
    if (gameList.length === 0) return null;

    return (
      <Box sx={{ mb: responsiveSpacing.section }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: responsiveSpacing.element }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: typography.weight.bold, 
              fontSize: typography.size.h6,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          <Chip
            label={gameList.length}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'text.secondary',
              fontWeight: typography.weight.semibold,
              height: 22,
              fontSize: typography.size.captionSmall,
            }}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {gameList.map(game => {
            const gameId = 'gameId' in game ? game.gameId : game.game_id;
            const isRecentlyUpdated = recentlyUpdatedGames.has(gameId);
            const gameStatus = getGameStatus(game);
            const isLive = gameStatus === 'live';
            const status = 'homeTeam' in game ? game.gameStatusText : game.game_status || '';
            const isCompleted = status.toLowerCase().includes('final');
            const canClick = isLive || isCompleted;
            const isSelected = canClick && selectedGame ? (('gameId' in selectedGame ? selectedGame.gameId : selectedGame.game_id) === gameId) : false;
            
            // Handler for opening boxscore (works for both live and completed games)
            const handleOpenBoxScore = (id: string) => {
              const gameToOpen = games.find(g => ('gameId' in g ? g.gameId : g.game_id) === id);
              if (gameToOpen) {
                setSelectedGame(gameToOpen);
                setDrawerTab('box');
              }
            };
            
            // Handler for opening play-by-play (works for both live and completed games)
            const handleOpenPlayByPlay = (id: string) => {
              const gameToOpen = games.find(g => ('gameId' in g ? g.gameId : g.game_id) === id);
              if (gameToOpen) {
                setSelectedGame(gameToOpen);
                setDrawerTab('play');
              }
            };
            
            const insight = dismissedInsights.has(gameId) ? null : (gameInsights.get(gameId) || null);
            const keyMoment = gameKeyMoments.get(gameId) || null;
            if (isLive) {
              console.log(`[Scoreboard] Game ${gameId} - isLive: ${isLive}, insight:`, insight);
              if (insight) {
                console.log(`[Scoreboard] Insight details - type: ${insight.type}, text: ${insight.text}, game_id: ${insight.game_id}`);
              } else {
                console.log(`[Scoreboard] No insight for game ${gameId}. Available insights:`, Array.from(gameInsights.keys()));
              }
            }
            
            return (
              <GameRow
                key={gameId}
                game={game}
                onClick={canClick ? () => setSelectedGame(game) : undefined}
                isRecentlyUpdated={isRecentlyUpdated}
                isSelected={isSelected}
                onOpenBoxScore={(isLive || isCompleted) ? handleOpenBoxScore : undefined}
                onOpenPlayByPlay={(isLive || isCompleted) ? handleOpenPlayByPlay : undefined}
                insight={insight}
                keyMoment={keyMoment}
                winProbability={isLive && 'gameId' in game ? gameWinProbabilities.get(game.gameId) || null : null}
              />
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <PageLayout sidebar={<UniversalSidebar games={games.filter((g): g is Game => 'gameId' in g)} winProbabilities={gameWinProbabilities} />}>
        {/* Scoreboard Page Header: Title, Calendar, and Search */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 2, sm: 3 },
            mb: { xs: 3, sm: 4 },
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Page Title */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, minWidth: 0 }}>
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
              Live Scoreboard
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem' } }}
            >
              Real-time NBA game scores and updates
            </Typography>
          </Box>

          {/* Center: Calendar - Compact */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '0 0 auto' },
              order: { xs: 3, md: 2 },
              width: { xs: '100%', md: 'auto' },
              maxWidth: { xs: '100%', md: 400 },
            }}
          >
            <WeeklyCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          </Box>

          {/* Right: Search input */}
          <Box
            ref={searchContainerRef}
            sx={{
              position: 'relative',
              flex: { xs: '1 1 100%', md: '0 0 auto' },
              width: { xs: '100%', md: 'auto' },
              maxWidth: { xs: '100%', md: 320 },
              order: { xs: 2, md: 3 },
            }}
          >
            <TextField
              fullWidth
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search..."
              variant="outlined"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    {loading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <IconButton
                        onClick={() => setSearchInput('')}
                        size="small"
                        sx={{ color: 'text.secondary', p: 0.5 }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  height: { xs: 36, sm: 40 },
                },
              }}
            />
            {/* Search results dropdown */}
            {showSearchResults && (searchResults.players.length > 0 || searchResults.teams.length > 0) && (
              <Paper
                elevation={3} // Material 3: max elevation for dropdowns
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                  zIndex: zIndex.dropdown,
                  backgroundColor: 'background.paper', // Material 3: surface
                  borderRadius: 1.5, // Material 3: 12dp
                  border: '1px solid',
                  borderColor: 'divider', // Material 3: outline
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
                            sx: { fontWeight: typography.weight.bold, textTransform: 'uppercase', color: 'text.secondary' },
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
                            href={`/player/${player.id}`}
                            onClick={() => setShowSearchResults(false)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
                            }}
                          >
                            <ListItemText
                              primary={`${firstName} ${lastName}`}
                              secondary={player.team_abbreviation}
                              primaryTypographyProps={{ fontWeight: typography.weight.semibold }}
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
                            sx: { fontWeight: typography.weight.bold, textTransform: 'uppercase', color: 'text.secondary' },
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
                            primaryTypographyProps={{ fontWeight: typography.weight.semibold }}
                          />
                        </ListItem>
                      ))}
                    </>
                  )}
                </List>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Game Statistics Summary Bar */}
        {loading && isToday ? (
          <Box sx={{ mb: responsiveSpacing.element, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="text" width={100} height={20} />
            <Skeleton variant="text" width={100} height={20} />
            <Skeleton variant="text" width={100} height={20} />
          </Box>
        ) : (
          games.length > 0 && isToday && (
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 2, sm: 3 },
                alignItems: 'center',
                mb: responsiveSpacing.element,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: typography.weight.medium }}>
                {gameStats.totalGames} Games
              </Typography>
              {gameStats.gamesInProgress > 0 && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ height: 16 }} />
                  <Typography variant="body2" sx={{ color: 'error.main', fontWeight: typography.weight.semibold }}>
                    {gameStats.gamesInProgress} Live
                  </Typography>
                </>
              )}
              <Box sx={{ flex: 1 }} />
              <ToggleButtonGroup
                value={gameFilter}
                exclusive
                onChange={(_, newValue) => newValue && setGameFilter(newValue)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.5,
                    textTransform: 'none',
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.caption,
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
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="close">Close</ToggleButton>
                <ToggleButton value="blowout">Blowout</ToggleButton>
                <ToggleButton value="overtime">OT</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )
        )}


        {/* Games Display */}
        {loading && !searchInput && games.length === 0 ? (
          <Box>
            {/* Skeleton loading */}
            <Box sx={{ mb: responsiveSpacing.section }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: responsiveSpacing.element }}>
                <Skeleton variant="text" width={120} height={24} />
                <Skeleton variant="rectangular" width={32} height={22} sx={{ borderRadius: borderRadius.xs }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} variant="rectangular" height={64} sx={{ borderRadius: borderRadius.sm }} />
                ))}
              </Box>
            </Box>
          </Box>
        ) : isToday ? (
          // If viewing today, show all three categories with filters applied
          <Box>
            {loading && (
              <Box sx={{ mb: responsiveSpacing.section }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: responsiveSpacing.element }}>
                  <Skeleton variant="text" width={120} height={24} />
                  <Skeleton variant="rectangular" width={32} height={22} sx={{ borderRadius: borderRadius.xs }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[...Array(2)].map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={64} sx={{ borderRadius: borderRadius.sm }} />
                  ))}
                </Box>
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
              <Box sx={{ mb: responsiveSpacing.section }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: responsiveSpacing.element }}>
                  <Skeleton variant="text" width={120} height={24} />
                  <Skeleton variant="rectangular" width={32} height={22} sx={{ borderRadius: borderRadius.xs }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[...Array(2)].map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={64} sx={{ borderRadius: borderRadius.sm }} />
                  ))}
                </Box>
              </Box>
            )}
            {selectedDate < today
              ? renderGameSection('Completed Games', filteredCompletedGames)
              : renderGameSection('Future Games', filteredUpcomingGames)}
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
                fontWeight: typography.weight.bold,
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
                  borderRadius: borderRadius.sm,
                  textTransform: 'none',
                  fontWeight: typography.weight.semibold,
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
                  borderRadius: borderRadius.sm,
                  textTransform: 'none',
                  fontWeight: typography.weight.semibold,
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
                  fontWeight: typography.weight.bold,
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
                  borderRadius: 1.5, // Material 3: 12dp
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Clear Filters
              </Button>
            </Box>
          )}

        {/* Game details drawer (shows when user clicks Box Score button) */}
        {selectedGame && drawerTab && (
          <GameDetailsDrawer
            gameId={'gameId' in selectedGame ? selectedGame.gameId : selectedGame.game_id}
            open={!!drawerTab}
            onClose={() => {
              setDrawerTab(null);
            }}
            initialTab={drawerTab || 'box'}
            gameInfo={{
              homeTeam: 'homeTeam' in selectedGame ? selectedGame.homeTeam?.teamName : selectedGame.home_team?.team_abbreviation,
              awayTeam: 'awayTeam' in selectedGame ? selectedGame.awayTeam?.teamName : selectedGame.away_team?.team_abbreviation,
              homeScore: 'homeTeam' in selectedGame ? selectedGame.homeTeam?.score : selectedGame.home_team?.points,
              awayScore: 'awayTeam' in selectedGame ? selectedGame.awayTeam?.score : selectedGame.away_team?.points,
              status: 'gameStatusText' in selectedGame ? selectedGame.gameStatusText : selectedGame.game_status,
            }}
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
      </PageLayout>
    </Box>
  );
};

export default Scoreboard;
