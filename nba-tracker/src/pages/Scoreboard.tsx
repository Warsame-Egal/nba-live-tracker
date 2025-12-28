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

const SCOREBOARD_WEBSOCKET_URL = `${
  window.location.protocol === 'https:' ? 'wss' : 'ws'
}://${import.meta.env.VITE_WS_URL}/api/v1/ws`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getLocalISODate = (): string => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

const getGameStatus = (game: Game | GameSummary): 'live' | 'upcoming' | 'completed' => {
  if ('homeTeam' in game) {
    if (game.gameStatusText && game.gameStatusText.toLowerCase().includes('final')) {
      return 'completed';
    }
    return 'live';
  }
  if ('game_status' in game && typeof game.game_status === 'string') {
    const lowerStatus = game.game_status.toLowerCase();
    if (lowerStatus.includes('final')) return 'completed';
    if (lowerStatus.includes('live') || lowerStatus.includes('in progress')) return 'live';
    return 'upcoming';
  }
  return 'upcoming';
};

const Scoreboard = () => {
  const [games, setGames] = useState<(Game | GameSummary)[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    players: [],
    teams: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | GameSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Memoize game categorization for performance
  const { liveGames, upcomingGames, completedGames } = useMemo(() => {
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
    if (selectedDate === today) {
      return {
        liveGames: filtered.filter(game => getGameStatus(game) === 'live'),
        upcomingGames: filtered.filter(game => getGameStatus(game) === 'upcoming'),
        completedGames: filtered.filter(game => getGameStatus(game) === 'completed'),
      };
    } else if (selectedDate < today) {
      return {
        liveGames: [],
        upcomingGames: [],
        completedGames: filtered,
      };
    } else {
      return {
        liveGames: [],
        upcomingGames: filtered,
        completedGames: [],
      };
    }
  }, [games, searchQuery, selectedDate]);

  const setupWebSocket = useCallback(() => {
    if (selectedDate === getLocalISODate()) {
      WebSocketService.connect(SCOREBOARD_WEBSOCKET_URL);
      const handleScoreboardUpdate = (data: ScoreboardResponse) => {
        // Update games state without causing full re-render
        setGames(prevGames => {
          const gameMap = new Map<string, Game | GameSummary>();
          
          // Add existing games
          prevGames.forEach(g => {
            const key = 'gameId' in g ? g.gameId : g.game_id;
            gameMap.set(key, g);
          });
          
          // Update with new data
          data.scoreboard.games.forEach(newGame => {
            const key = 'gameId' in newGame ? newGame.gameId : (newGame as GameSummary).game_id;
            gameMap.set(key, newGame);
          });
          
          return Array.from(gameMap.values());
        });
        setLoading(false);
      };
      WebSocketService.subscribe(handleScoreboardUpdate);
      return () => {
        WebSocketService.unsubscribe(handleScoreboardUpdate);
        WebSocketService.disconnect();
      };
    }
    return () => {};
  }, [selectedDate]);

  useEffect(() => setupWebSocket(), [setupWebSocket]);

  useEffect(() => {
    const abortController = new AbortController();
    const debouncedFetch = debounce(async () => {
      if (!searchInput) {
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
        if (!response.ok) throw new Error('Failed to fetch results.');
        const data: SearchResults = await response.json();
        setSearchResults(data);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') console.error(err);
        setSearchResults({ players: [], teams: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    debouncedFetch();
    return () => {
      abortController.abort();
      debouncedFetch.cancel();
    };
  }, [searchInput]);

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
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchGamesByDate(selectedDate);
    }
  }, [selectedDate]);

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
        {/* Header Section */}
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
          <Box>
            {renderGameSection('Live Games', liveGames)}
            {renderGameSection('Upcoming Games', upcomingGames)}
            {renderGameSection('Completed Games', completedGames)}
          </Box>
        ) : (
          <Box>
            {selectedDate < today
              ? renderGameSection('Completed Games', completedGames)
              : renderGameSection('Future Games', upcomingGames, true)}
          </Box>
        )}

        {/* Empty States */}
        {!loading && games.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
            <Event sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No games scheduled for this date.
            </Typography>
          </Box>
        )}

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

        {/* Game Details Modal */}
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
