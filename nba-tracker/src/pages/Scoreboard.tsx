import { useState, useEffect, useRef, useCallback } from 'react';
import { ScoreboardResponse, Game } from '../types/scoreboard';
import { GamesResponse, GameSummary } from '../types/schedule';
import WebSocketService from '../services/websocketService';
import GameCard from '../components/GameCard';
import Navbar from '../components/Navbar';
import WeeklyCalendar from '../components/WeeklyCalendar';
import GameDetailsModal from '../components/GameDetailsModal';
import { useSearchParams, Link } from 'react-router-dom';
import { PlayerSummary } from '../types/player';
import ScoringLeaders from '../components/ScoringLeaders';
import debounce from 'lodash/debounce';
import { FaSearch, FaTimes, FaSpinner } from 'react-icons/fa';

const SCOREBOARD_WEBSOCKET_URL = `${
  window.location.protocol === 'https:' ? 'wss' : 'ws'
}://${import.meta.env.VITE_WS_URL}/api/v1/ws`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


const getLocalISODate = (): string => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

// Revised helper to determine game status remains unchanged.
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
  const [liveGames, setLiveGames] = useState<(Game | GameSummary)[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<(Game | GameSummary)[]>([]);
  const [completedGames, setCompletedGames] = useState<(Game | GameSummary)[]>([]);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | GameSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Use a container ref that wraps both the input and the search results
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket setup for live updates on today’s games remains unchanged.
  const setupWebSocket = useCallback(() => {
    if (selectedDate === getLocalISODate()) {
      WebSocketService.connect(SCOREBOARD_WEBSOCKET_URL);
      const handleScoreboardUpdate = (data: ScoreboardResponse) => {
        setGames(data.scoreboard.games);
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

  // Debounced player search remains unchanged.
  useEffect(() => {
    const abortController = new AbortController();
    const debouncedFetch = debounce(async () => {
      if (!playerSearchQuery) {
        setPlayers([]);
        setShowSearchResults(false);
        return;
      }
      setLoading(true);
      setShowSearchResults(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/players/search/${playerSearchQuery}`,
          { signal: abortController.signal }
        );
        if (!response.ok) throw new Error('Failed to fetch players.');
        const data: PlayerSummary[] = await response.json();
        setPlayers(data);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') console.error(err);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    debouncedFetch();
    return () => {
      abortController.abort();
      debouncedFetch.cancel();
    };
  }, [playerSearchQuery]);

  // Fetch games based on selected date if it’s not today remains unchanged.
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

  // Group games based on selected date and search query remains unchanged.
  useEffect(() => {
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
      setLiveGames(filtered.filter(game => getGameStatus(game) === 'live'));
      setUpcomingGames(filtered.filter(game => getGameStatus(game) === 'upcoming'));
      setCompletedGames(filtered.filter(game => getGameStatus(game) === 'completed'));
    } else if (selectedDate < today) {
      setLiveGames([]);
      setUpcomingGames([]);
      setCompletedGames(filtered);
    } else if (selectedDate > today) {
      setLiveGames([]);
      setUpcomingGames(filtered);
      setCompletedGames([]);
    }
  }, [games, searchQuery, selectedDate]);

  // Update the click outside handler to check the container instead of just the input.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper render function for game cards remains unchanged.
  const renderGameCards = (
    gameList: (Game | GameSummary)[],
    hideScore: boolean = false
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {gameList.map(game => (
        <div
          key={'gameId' in game ? game.gameId : game.game_id}
          className="rounded-xl overflow-hidden transition-transform transform hover:scale-105 cursor-pointer bg-black border border-neutral-700 p-4 rounded-md"
          onClick={hideScore ? undefined : () => setSelectedGame(game)}
        >
          <GameCard game={game} hideScore={hideScore} />
          {'gameLeaders' in game && (
            <ScoringLeaders selectedGame={game as Game} />
          )}
        </div>
      ))}
    </div>
  );

  const today = getLocalISODate();
  const isToday = selectedDate === today;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top Section: Search Bar and Weekly Calendar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Search Bar with a container that wraps both the input and results */}
          <div ref={searchContainerRef} className="w-full md:w-1/3 relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <FaSearch className="text-gray-400" size={20} />
            </div>
            <input
              type="text"
              value={playerSearchQuery}
              onChange={e => setPlayerSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full py-3 pl-12 pr-4 rounded-full bg-neutral-900 border border-neutral-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {loading && playerSearchQuery && (
              <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-white animate-spin" size={20} />
            )}
            {playerSearchQuery && (
              <button
                onClick={() => {
                  setPlayerSearchQuery('');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                <FaTimes size={20} />
              </button>
            )}
            {showSearchResults && players.length > 0 && (
              <ul className="absolute left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-md max-h-60 overflow-y-auto z-20">
                {players.map(player => (
                  <li key={player.PERSON_ID} className="py-2 px-4 hover:bg-neutral-700 transition">
                    <Link
                      to={`/players/${player.PERSON_ID}`}
                      onClick={() => setShowSearchResults(false)}
                      className="flex items-center gap-3"
                    >
                      <span className="font-bold">
                        {player.PLAYER_FIRST_NAME} {player.PLAYER_LAST_NAME}
                      </span>
                      <span className="text-sm text-gray-400">{player.TEAM_ABBREVIATION}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weekly Calendar remains unchanged */}
          <div className="w-full md:w-auto flex justify-center">
            <WeeklyCalendar
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
          </div>
        </div>

        {/* Games Display Section remains unchanged */}
        {loading && !playerSearchQuery && games.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className="text-5xl text-blue-500 animate-spin" />
          </div>
        ) : isToday ? (
          <>
            {liveGames.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-extrabold text-gray-200">Live Games</h2>
                {renderGameCards(liveGames)}
              </section>
            )}
            {upcomingGames.length > 0 && (
              <section className="space-y-4 mt-10">
                <h2 className="text-2xl font-extrabold text-gray-200">Upcoming Games</h2>
                {renderGameCards(upcomingGames)}
              </section>
            )}
            {completedGames.length > 0 && (
              <section className="space-y-4 mt-10">
                <h2 className="text-2xl font-extrabold text-gray-200">Completed Games</h2>
                {renderGameCards(completedGames)}
              </section>
            )}
          </>
        ) : (
          <section className="space-y-4">
            {selectedDate < today ? (
              <>
                <h2 className="text-2xl font-extrabold text-gray-200">Completed Games</h2>
                {renderGameCards(completedGames)}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-gray-200">Future Games</h2>
                {renderGameCards(upcomingGames, true)}
              </>
            )}
          </section>
        )}

        {/* Fallback Message remains unchanged */}
        {!loading &&
          liveGames.length === 0 &&
          upcomingGames.length === 0 &&
          completedGames.length === 0 &&
          games.length !== 0 && (
            <p className="text-center text-xl text-gray-500 italic py-16">
              No games found for the selected date.
            </p>
          )}

        {/* Game Details Modal remains unchanged */}
        {selectedGame && (
          <GameDetailsModal
            gameId={'gameId' in selectedGame ? selectedGame.gameId : selectedGame.game_id}
            open={!!selectedGame}
            onClose={() => setSelectedGame(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Scoreboard;
