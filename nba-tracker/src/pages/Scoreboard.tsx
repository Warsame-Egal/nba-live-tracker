import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Skeleton,
  Snackbar,
  Alert,
  Button,
  IconButton,
  Badge,
} from '@mui/material';
import { Event, Notifications, CalendarToday, FilterList, Refresh, Schedule, FiberManualRecord, Insights } from '@mui/icons-material';
import { ScoreboardResponse, Game, KeyMoment, WinProbability } from '../types/scoreboard';
import { GamesResponse, GameSummary, GameLeaders } from '../types/schedule';
import { PredictionsResponse, GamePrediction } from '../types/predictions';
import WebSocketService from '../services/websocketService';
import GameRow from '../components/GameRow';
import { GameInsightData } from '../components/GameInsight';
import Navbar from '../components/Navbar';
import WeeklyCalendar from '../components/WeeklyCalendar';
import GameDetailsDrawer from '../components/GameDetailsDrawer';
import WinProbabilityTracker from '../components/WinProbabilityTracker';
import PredictionsSidebar from '../components/PredictionsSidebar';
import { useSearchParams } from 'react-router-dom';
import { SearchResults } from '../types/search';
import debounce from 'lodash/debounce';
import { logger } from '../utils/logger';
import { responsiveSpacing, borderRadius, typography, transitions } from '../theme/designTokens';
import { fetchJson } from '../utils/apiClient';
import { getCurrentSeason } from '../utils/season';

import { API_BASE_URL, getWebSocketUrl } from '../utils/apiConfig';

// WebSocket URL for live score updates
const SCOREBOARD_WEBSOCKET_URL = getWebSocketUrl('/api/v1/ws');

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
  // Separate loading state for search to prevent page reflow
  const [searchLoading, setSearchLoading] = useState(false);
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
  // Predictions sidebar open/close state
  const [predictionsSidebarOpen, setPredictionsSidebarOpen] = useState(false);

  // Reference to the search container (to detect clicks outside)
  const searchContainerRef = useRef<HTMLDivElement>(null);
  // Reference to track previous scores for detecting changes
  const previousScoresRef = useRef<Map<string, { homeScore: number; awayScore: number }>>(new Map());
  // Reference to track previous game states for detecting events
  const previousGameStatesRef = useRef<Map<string, { status: string; isOvertime: boolean; isFinal: boolean; differential: number; hasStarted: boolean }>>(new Map());
  // Reference to store game leaders from schedule endpoint (for merging with WebSocket updates)
  const scheduleGameLeadersRef = useRef<Map<string, GameLeaders>>(new Map());
  // Reference to track if predictions have been initially set (prevents clearing on first games load)
  const predictionsInitializedRef = useRef<boolean>(false);
  // Reference to track previous filtered prediction IDs (prevents circular dependency)
  const previousFilteredPredictionIdsRef = useRef<string>('');
  // Reference to track previous game statuses to avoid unnecessary filtering
  const previousGameStatusesRef = useRef<Map<string, string>>(new Map());
  // Reference to store the last filtered predictions to avoid circular dependencies
  const lastFilteredPredictionsRef = useRef<GamePrediction[]>([]);
  
  
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
  // State for predictions - persistent cache keyed by game_id
  // Predictions persist across all fetch cycles, refetches, and errors
  const [predictionCache, setPredictionCache] = useState<Map<string, GamePrediction>>(new Map());
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);

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
              Object.entries(momentsByGame).forEach(([gameId, moments]: [string, unknown]) => {
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
              Object.entries(probabilitiesByGame).forEach(([gameId, winProb]: [string, unknown]) => {
                if (winProb && typeof winProb === 'object' && 'home_win_prob' in winProb && 'away_win_prob' in winProb) {
                  const typedWinProb = winProb as WinProbability;
                  merged.set(gameId, typedWinProb);
                  console.log(`[Scoreboard] Updated win probability for game ${gameId}:`, 
                    `Home ${(typedWinProb.home_win_prob * 100).toFixed(1)}%`);
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
   * Uses separate searchLoading state to prevent page layout reflow.
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
      setSearchLoading(true);
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
        setSearchLoading(false);
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
   * Update prediction cache with new predictions.
   * Only adds/updates predictions when valid new data arrives.
   * Never clears existing predictions - preserves cache across fetch cycles.
   */
  const updatePredictionCache = useCallback((newPredictions: GamePrediction[], date: string) => {
    setPredictionCache(prev => {
      const updated = new Map(prev);
      // Only update if we have valid new predictions
      if (newPredictions && newPredictions.length > 0) {
        newPredictions.forEach(prediction => {
          // Only update if prediction is for current date
          if (prediction.game_date === date) {
            updated.set(prediction.game_id, prediction);
          }
        });
      }
      // Never clear - keep existing predictions
      return updated;
    });
  }, []);

  /**
   * Fetch predictions for the selected date (only for today/future dates with upcoming games).
   * Only fetch when date changes, not when games change.
   * Predictions are persisted in cache and never cleared on error or empty responses.
   */
  useEffect(() => {
    const today = getLocalISODate();
    const isFutureDate = selectedDate >= today;
    
    // Only fetch predictions for today or future dates
    if (!isFutureDate) {
      // Only clear for past dates where predictions don't apply
      setPredictionCache(new Map());
      setPredictionsError(null);
      predictionsInitializedRef.current = false;
      previousFilteredPredictionIdsRef.current = '';
      lastFilteredPredictionsRef.current = [];
      return;
    }

    const fetchPredictions = async () => {
      setPredictionsLoading(true);
      setPredictionsError(null);
      try {
        const season = getCurrentSeason();
        const data = await fetchJson<PredictionsResponse>(
          `${API_BASE_URL}/api/v1/predictions/date/${selectedDate}?season=${season}`,
          {},
          { maxRetries: 2, retryDelay: 500, timeout: 120000 }
        );
        
        // Update cache with new predictions (preserves existing ones)
        if (data && data.predictions) {
          updatePredictionCache(data.predictions, selectedDate);
          predictionsInitializedRef.current = true;
        }
      } catch (err) {
        logger.error('Error fetching predictions', err);
        setPredictionsError(err instanceof Error ? err.message : 'Failed to load predictions');
        // DO NOT clear cache - keep existing predictions visible
        // Cache persists across errors
      } finally {
        setPredictionsLoading(false);
      }
    };

    fetchPredictions();
  }, [selectedDate, updatePredictionCache]);
  
  /**
   * Filter predictions based on current games (without re-fetching).
   * Always reads from persistent prediction cache, never from fetch state.
   * Predictions persist across loading states, errors, and refetches.
   */
  /**
   * Filter predictions to only show upcoming games.
   * 
   * This memo keeps predictions stable and prevents flickering. It only recalculates
   * when game statuses actually change, not on every render.
   */
  const filteredPredictions = useMemo(() => {
    // Always read from persistent cache, never from fetch state
    // This ensures predictions never disappear during data refreshes
    const cachedPredictions = Array.from(predictionCache.values());
    
    // If cache is empty, return empty array (stable reference)
    if (cachedPredictions.length === 0) {
      return [];
    }
    
    // Build a map of current game statuses (only for games that match predictions)
    // We only care about games that have predictions, not all games
    const currentGameStatuses = new Map<string, string>();
    const relevantGameIds = new Set(cachedPredictions.map(p => p.game_id));
    
    games.forEach(game => {
      const gameId = 'gameId' in game ? game.gameId : game.game_id;
      // Only track status for games that have predictions
      if (relevantGameIds.has(gameId)) {
        const status = getGameStatus(game);
        currentGameStatuses.set(gameId, status);
      }
    });
    
    // Check if any relevant game statuses actually changed
    // We only need to recalculate if a game went from upcoming to live/final
    let statusChanged = false;
    if (currentGameStatuses.size !== previousGameStatusesRef.current.size) {
      statusChanged = true;
    } else {
      for (const [gameId, status] of currentGameStatuses.entries()) {
        if (previousGameStatusesRef.current.get(gameId) !== status) {
          statusChanged = true;
          break;
        }
      }
    }
    
    // If no status changes, return last filtered predictions to avoid re-render
    // This prevents unnecessary recalculations and keeps the UI stable
    if (!statusChanged && lastFilteredPredictionsRef.current.length > 0) {
      return lastFilteredPredictionsRef.current;
    }
    
    // Update the ref with current statuses
    previousGameStatusesRef.current = new Map(currentGameStatuses);
    
    // Filter to only show predictions for upcoming games
    // Show predictions if game doesn't exist yet OR if game exists and is upcoming
    const upcomingPredictions = cachedPredictions.filter(prediction => {
      // If no games loaded yet, show all predictions (they're for future games)
      if (games.length === 0) {
        return true;
      }
      
      // Try to find matching game
      const matchingGame = games.find(game => {
        const gameId = 'gameId' in game ? game.gameId : game.game_id;
        if (gameId === prediction.game_id) {
          return true;
        }
        // Also try matching by team IDs
        const homeId = 'homeTeam' in game ? game.homeTeam?.teamId : game.home_team?.team_id;
        const awayId = 'awayTeam' in game ? game.awayTeam?.teamId : game.away_team?.team_id;
        return (
          (homeId === prediction.home_team_id && awayId === prediction.away_team_id) ||
          (homeId === prediction.away_team_id && awayId === prediction.home_team_id)
        );
      });
      
      // Show prediction if:
      // 1. No matching game found (prediction exists but game not in schedule yet) - show it
      // 2. Matching game exists and is upcoming - show it
      if (!matchingGame) {
        return true; // Prediction exists but game not scheduled yet
      }
      
      // Game exists - only show if it's upcoming
      return getGameStatus(matchingGame) === 'upcoming';
    });
    
    // Generate stable ID string for comparison
    // This lets us quickly check if the list of predictions actually changed
    const newIds = upcomingPredictions.map(p => p.game_id).sort().join(',');
    const previousIds = previousFilteredPredictionIdsRef.current;
    
    // Only update if the filtered list actually changed
    if (newIds !== previousIds) {
      // If filtering returns empty but we have cached predictions, preserve current predictions
      // This prevents clearing during rapid game state transitions (game might temporarily
      // appear live during status updates, but we still want to show the prediction)
      if (upcomingPredictions.length === 0 && cachedPredictions.length > 0 && previousIds !== '') {
        const preserved = lastFilteredPredictionsRef.current.length > 0 
          ? lastFilteredPredictionsRef.current 
          : upcomingPredictions;
        lastFilteredPredictionsRef.current = preserved;
        return preserved;
      }
      
      // Update the refs to track the new IDs and predictions
      previousFilteredPredictionIdsRef.current = newIds;
      lastFilteredPredictionsRef.current = upcomingPredictions;
      return upcomingPredictions;
    }
    
    // No change, return last filtered predictions to maintain stability
    return lastFilteredPredictionsRef.current.length > 0 
      ? lastFilteredPredictionsRef.current 
      : upcomingPredictions;
  }, [predictionCache, games]); // Removed predictionsLoading dependency - cache persists across loading

  // Note: We no longer update predictions state here since we use filteredPredictions directly
  // This prevents unnecessary re-renders and flashing

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
    icon?: React.ReactNode,
    isFirst?: boolean,
  ) => {
    // Always render container, never unmount
    return (
      <Box sx={{ 
        mb: { xs: 1.5, sm: 2, md: 2.5 }, 
        mt: isFirst ? 0 : undefined,
        minHeight: gameList.length === 0 ? 0 : undefined,
        visibility: gameList.length === 0 ? 'hidden' : 'visible',
        height: gameList.length === 0 ? 0 : 'auto',
        overflow: 'hidden',
      }}>
        {gameList.length > 0 && (
          <>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 1.5, sm: 2 },
                mb: { xs: 1, sm: 1.5 },
                pb: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                minHeight: 56,
              }}
            >
          {icon && (
            <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
              {icon}
            </Box>
          )}
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: typography.weight.bold, 
              fontSize: { xs: typography.size.h6.xs, sm: typography.size.h6.sm },
              color: 'text.primary',
              letterSpacing: '-0.01em',
              flex: 1,
            }}
          >
            {title}
          </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 2, sm: 2.5, md: 3 },
                minHeight: { xs: 200, sm: 300 },
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
          </>
        )}
      </Box>
    );
  };

  // Prepare search props for Navbar
  // Use searchLoading instead of loading to prevent page reflow
  const searchProps = {
    searchInput,
    setSearchInput,
    searchResults,
    showSearchResults,
    setShowSearchResults,
    loading: searchLoading,
    searchContainerRef,
  };

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
      <Navbar searchProps={searchProps} />
      <Box sx={{ 
        maxWidth: '1400px', 
        mx: 'auto', 
        px: { xs: 1, sm: 2, md: 3, lg: 4 }, 
        pt: { xs: 0.5, sm: 0.75 },
        pb: { xs: 2, sm: 3 },
        width: '100%',
        overflowX: 'hidden',
      }}>
        {/* Scoreboard Page Header: Calendar and Predictions */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.5, sm: 2 },
            mb: { xs: 0.25, sm: 0.5 },
            minHeight: { xs: 48, sm: 56 },
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, flexShrink: 0, flexWrap: 'wrap' }}>
            <Box sx={{ flexShrink: 0 }}>
              <WeeklyCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
            </Box>
            {/* Predictions Toggle Button */}
            {selectedDate >= getLocalISODate() && (
              <IconButton
                onClick={() => setPredictionsSidebarOpen(true)}
                sx={{
                  minWidth: 44,
                  minHeight: 44,
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  transition: transitions.smooth,
                }}
                aria-label="Open predictions and insights"
              >
                <Badge badgeContent={filteredPredictions.length} color="primary" max={99}>
                  <Insights />
                </Badge>
              </IconButton>
            )}
          </Box>
        </Box>


        {/* Win Probability Insights - Only reserve space when visible */}
        {(() => {
          // Extract visibility condition to avoid duplication
          const liveGamesForTracker = isToday && !loading
            ? games.filter(
                (g): g is Game => {
                  if (!('homeTeam' in g) || !('gameStatus' in g)) return false;
                  const game = g as Game;
                  return game.gameStatus === 2;
                }
              )
            : [];
          const shouldShowWinProbability = isToday && !loading && liveGamesForTracker.length > 0 && gameWinProbabilities.size > 0;

          return (
            <Box 
              sx={{ 
                mb: shouldShowWinProbability ? { xs: 0, sm: 0.25 } : 0,
                mt: 0,
                minHeight: shouldShowWinProbability ? { xs: 200, sm: 220 } : 0,
                height: shouldShowWinProbability ? 'auto' : 0,
                transition: 'opacity 0.3s ease',
                opacity: shouldShowWinProbability ? 1 : 0,
                visibility: shouldShowWinProbability ? 'visible' : 'hidden',
                overflow: 'hidden',
              }}
            >
              {shouldShowWinProbability && (
                <WinProbabilityTracker
                  games={liveGamesForTracker}
                  winProbabilities={gameWinProbabilities}
                />
              )}
            </Box>
          );
        })()}

        {/* Game Statistics Summary Bar - Always render container */}
        <Box
          sx={{
            display: 'flex',
            gap: { xs: 2, sm: 3 },
            alignItems: 'center',
            mb: { xs: 0.25, sm: 0.5 },
            mt: 0,
            flexWrap: 'wrap',
            minHeight: 48,
            visibility: isToday ? 'visible' : 'hidden',
          }}
        >
          {loading && isToday ? (
            <>
              <Skeleton variant="text" width={100} height={24} sx={{ borderRadius: borderRadius.xs }} />
              <Skeleton variant="text" width={80} height={24} sx={{ borderRadius: borderRadius.xs }} />
              <Skeleton variant="rectangular" width={200} height={32} sx={{ borderRadius: borderRadius.sm, ml: 'auto' }} />
            </>
          ) : (
            games.length > 0 && isToday && (
              <>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: typography.weight.medium,
                  fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                }}
              >
                {gameStats.totalGames} {gameStats.totalGames === 1 ? 'Game' : 'Games'}
              </Typography>
              {gameStats.gamesInProgress > 0 && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ height: { xs: 14, sm: 16 } }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FiberManualRecord sx={{ fontSize: 8, color: 'error.main' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'error.main', 
                        fontWeight: typography.weight.semibold,
                        fontSize: { xs: typography.size.bodySmall.xs, sm: typography.size.bodySmall.sm },
                      }}
                    >
                      {gameStats.gamesInProgress} Live
                    </Typography>
                  </Box>
                </>
              )}
              <Box sx={{ flex: 1 }} />
              <ToggleButtonGroup
                value={gameFilter}
                exclusive
                onChange={(_, newValue) => newValue && setGameFilter(newValue)}
                size="small"
                sx={{
                  flexWrap: 'wrap',
                  gap: { xs: 0.5, sm: 0 },
                  '& .MuiToggleButton-root': {
                    px: { xs: 1.5, sm: 1.5 },
                    py: { xs: 1, sm: 1 },
                    textTransform: 'none',
                    fontWeight: typography.weight.semibold,
                    fontSize: { xs: '0.7rem', sm: typography.size.caption.sm },
                    minHeight: { xs: 44, sm: 40 }, // 44px minimum for mobile touch targets
                    minWidth: { xs: 44, sm: 'auto' }, // Ensure minimum width for touch
                    borderColor: 'divider',
                    color: 'text.secondary',
                    transition: transitions.smooth,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      borderColor: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  },
                }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="close">Close</ToggleButton>
                <ToggleButton value="blowout">Blowout</ToggleButton>
                <ToggleButton value="overtime">OT</ToggleButton>
              </ToggleButtonGroup>
              </>
            )
          )}
        </Box>


        {/* Games Display */}
        {loading && !searchInput && games.length === 0 ? (
          <Box>
            {/* Skeleton loading */}
            <Box sx={{ mb: { xs: 3, sm: 4, md: 5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 2.5 }, pb: 1 }}>
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton variant="text" width={140} height={28} sx={{ flex: 1 }} />
                <Skeleton variant="rectangular" width={32} height={24} sx={{ borderRadius: borderRadius.xs }} />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 3 } }}>
                {[...Array(3)].map((_, index) => (
                  <Skeleton 
                    key={index} 
                    variant="rectangular" 
                    height={110}
                    sx={{ 
                      borderRadius: borderRadius.md,
                      height: { xs: 100, sm: 110 },
                    }} 
                  />
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
            {renderGameSection('Live Games', filteredLiveGames, <FiberManualRecord sx={{ fontSize: { xs: 16, sm: 18 }, color: 'error.main' }} />, true)}
            {renderGameSection('Upcoming Games', filteredUpcomingGames, <Schedule sx={{ fontSize: { xs: 16, sm: 18 } }} />, filteredLiveGames.length === 0)}
            {renderGameSection('Completed Games', filteredCompletedGames, <Event sx={{ fontSize: { xs: 16, sm: 18 } }} />, filteredLiveGames.length === 0 && filteredUpcomingGames.length === 0)}
          </Box>
        ) : (
          // If viewing past or future date, show appropriate category with filters applied
          <Box>
            {loading && (
              <Box sx={{ mb: { xs: 3, sm: 4, md: 5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 2.5 }, pb: 1 }}>
                  <Skeleton variant="circular" width={20} height={20} />
                  <Skeleton variant="text" width={140} height={28} sx={{ flex: 1 }} />
                  <Skeleton variant="rectangular" width={32} height={24} sx={{ borderRadius: borderRadius.xs }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.5, md: 3 } }}>
                  {[...Array(2)].map((_, index) => (
                    <Skeleton 
                      key={index} 
                      variant="rectangular" 
                      height={110}
                      sx={{ 
                        borderRadius: borderRadius.md,
                        height: { xs: 100, sm: 110 },
                      }} 
                    />
                  ))}
                </Box>
              </Box>
            )}
            {selectedDate < today
              ? renderGameSection('Completed Games', filteredCompletedGames, <Event sx={{ fontSize: { xs: 16, sm: 18 } }} />, true)
              : renderGameSection('Future Games', filteredUpcomingGames, <Schedule sx={{ fontSize: { xs: 16, sm: 18 } }} />, true)}
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

        {/* Predictions Sidebar */}
        {selectedDate >= getLocalISODate() && (
          <PredictionsSidebar
            open={predictionsSidebarOpen}
            onClose={() => setPredictionsSidebarOpen(false)}
            predictions={filteredPredictions}
            loading={predictionsLoading}
            error={predictionsError}
            isUpdating={predictionsLoading && filteredPredictions.length > 0}
          />
        )}
      </Box>
    </Box>
  );
};

export default Scoreboard;
