import { useState, useEffect, useRef, useCallback } from 'react';
import { ScoreboardResponse, Game } from '../types/scoreboard';
import { GamesResponse, GameSummary } from '../types/schedule';
import WebSocketService from '../services/websocketService';
import GameCard from '../components/GameCard';
import ScoringLeaders from '../components/ScoringLeaders';
import PlayByPlay from '../components/PlayByPlay';
import Navbar from '../components/Navbar';
import WeeklyCalendar from '../components/WeeklyCalendar';
import { useSearchParams, Link } from 'react-router-dom';
import { PlayerSummary } from '../types/player';
import debounce from 'lodash/debounce';
import { FaSearch, FaTimes, FaSpinner } from 'react-icons/fa';

const SCOREBOARD_WEBSOCKET_URL = 'ws://127.0.0.1:8000/api/v1/ws';

const getLocalISODate = (): string => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

const Scoreboard = () => {
  const [games, setGames] = useState<(Game | GameSummary)[]>([]);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | GameSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!selectedGame && games.length > 0) {
      const liveGame = games.find(g => 'gameId' in g);
      if (liveGame) setSelectedGame(liveGame);
    }
  }, [games, selectedGame]);

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
          `http://localhost:8000/api/v1/players/search/${playerSearchQuery}`,
          { signal: abortController.signal },
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

  useEffect(() => {
    if (selectedDate !== getLocalISODate()) {
      const fetchGamesByDate = async (date: string) => {
        setLoading(true);
        try {
          const response = await fetch(`http://localhost:8000/api/v1/schedule/date/${date}`);
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

  const filteredGames = games.filter(game => {
    if (!searchQuery) return true;
    const homeName = 'homeTeam' in game ? game.homeTeam.teamName : game.home_team.team_abbreviation;
    const awayName = 'awayTeam' in game ? game.awayTeam.teamName : game.away_team.team_abbreviation;
    return (
      homeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      awayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Search + Calendar */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <WeeklyCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          <div className="w-full max-w-md" ref={searchInputRef}>
            <div className="relative">
              <input
                type="text"
                value={playerSearchQuery}
                onChange={e => setPlayerSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="w-full px-4 py-2 pl-10 pr-12 bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {loading && playerSearchQuery ? (
                <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-white animate-spin" />
              ) : playerSearchQuery ? (
                <button
                  onClick={() => {
                    setPlayerSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <FaTimes />
                </button>
              ) : (
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              )}
              {showSearchResults && players.length > 0 && (
                <ul className="absolute left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
                  {players.map(player => (
                    <li key={player.PERSON_ID} className="p-2 cursor-pointer">
                      <Link
                        to={`/players/${player.PERSON_ID}`}
                        onClick={() => setShowSearchResults(false)}
                      >
                        <span className="font-semibold">
                          {player.PLAYER_FIRST_NAME} {player.PLAYER_LAST_NAME}
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          {player.TEAM_ABBREVIATION}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Games */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && !playerSearchQuery ? (
            <div className="col-span-full flex justify-center items-center h-48">
              <FaSpinner className="text-2xl text-white animate-spin" />
              <p className="ml-2 text-lg text-gray-400">Loading games...</p>
            </div>
          ) : filteredGames.length > 0 ? (
            filteredGames.map(game => (
              <div
                key={'gameId' in game ? game.gameId : game.game_id}
                className="border border-neutral-700 bg-black rounded-md p-4 space-y-3 shadow-lg transition-transform transform hover:scale-[1.005]"
              >
                <GameCard game={game} setSelectedGame={setSelectedGame} />
                {'gameLeaders' in game && (
                  <>
                    <ScoringLeaders selectedGame={game as Game} />
                    <PlayByPlay gameId={(game as Game).gameId} />
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-400 text-lg italic">
              No games found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
