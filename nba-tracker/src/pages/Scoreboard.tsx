import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { ScoreboardResponse, Game } from "../types/scoreboard";
import { GamesResponse, GameSummary } from "../types/schedule";
import WebSocketService from "../services/websocketService";
import GameCard from "../components/GameCard";
import Navbar from "../components/Navbar";
import WeeklyCalendar from "../components/WeeklyCalendar";
import { useSearchParams, Link } from "react-router-dom";
import { PlayerSummary } from "../types/player";
import debounce from "lodash/debounce";
import { FaSearch, FaTimes, FaSpinner } from "react-icons/fa";

// Lazy load these components to improve performance
const ScoringLeaders = React.lazy(() => import("../components/ScoringLeaders"));
const PlayByPlay = React.lazy(() => import("../components/PlayByPlay"));

const SCOREBOARD_WEBSOCKET_URL = "ws://127.0.0.1:8000/api/v1/ws";

// Get today's date in local ISO format (YYYY-MM-DD)
const getLocalISODate = (): string => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

const Scoreboard = () => {
  // App state
  const [games, setGames] = useState<(Game | GameSummary)[]>([]);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | GameSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // WebSocket setup for live game updates (only for today's games)
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

  // Activate WebSocket listener
  useEffect(() => {
    return setupWebSocket();
  }, [setupWebSocket]);

  // Debounced player search API call
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
          { signal: abortController.signal }
        );
        if (!response.ok) throw new Error("Failed to fetch players.");

        const data: PlayerSummary[] = await response.json();
        setPlayers(data);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error(err);
        }
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

  // Fetch scheduled games by date (used for past/future games)
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

  // Filter games based on search query (team abbreviation or name)
  const filteredGames = games.filter((game) => {
    if (!searchQuery) return true;

    const homeName = "homeTeam" in game ? game.homeTeam.teamName : game.home_team.team_abbreviation;
    const awayName = "awayTeam" in game ? game.awayTeam.teamName : game.away_team.team_abbreviation;
    return (
      homeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      awayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Close player search dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white relative">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Top bar with date picker + player search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
          <WeeklyCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

          {/* Player search input */}
          <div className="w-full md:w-1/2">
            <div className="relative w-full" ref={searchInputRef}>
              <input
                type="text"
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="w-full px-4 py-3 pl-10 pr-12 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 transition-all"
                aria-label="Search players"
              />

              {/* Right icon: spinner, clear, or search */}
              {loading && playerSearchQuery ? (
                <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-white animate-spin" />
              ) : playerSearchQuery ? (
                <button
                  onClick={() => { setPlayerSearchQuery(""); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              ) : (
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              )}

              {/* Dropdown search results */}
              {showSearchResults && players.length > 0 && (
                <ul className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
                  {players.map((player) => (
                    <li key={player.PERSON_ID} className="p-2 hover:bg-gray-700 cursor-pointer">
                      <Link to={`/players/${player.PERSON_ID}`} className="block text-white" onClick={() => setShowSearchResults(false)}>
                        <span className="font-semibold">{player.PLAYER_FIRST_NAME} {player.PLAYER_LAST_NAME}</span>
                        <span className="text-sm text-gray-400 ml-2">{player.TEAM_ABBREVIATION}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Main content: games + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Games section */}
          <div className="lg:col-span-2 space-y-6">
            {loading && !playerSearchQuery ? (
              <div className="flex justify-center items-center h-48">
                <FaSpinner className="text-2xl text-white animate-spin" />
                <p className="ml-2 text-lg text-gray-400">Loading games...</p>
              </div>
            ) : filteredGames.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredGames.map((game) => (
                  <GameCard
                    key={"gameId" in game ? game.gameId : game.game_id}
                    game={game}
                    setSelectedGame={setSelectedGame}
                  />
                ))}
              </div>
            ) : !playerSearchQuery ? (
              <div className="flex justify-center items-center h-48">
                <p className="text-xl text-gray-400">No games found.</p>
              </div>
            ) : null}
          </div>

          {/* Sidebar: scoring leaders and play-by-play */}
          <aside className="space-y-6">
            <Suspense fallback={<div className="flex justify-center items-center h-48"><FaSpinner className="text-2xl text-white animate-spin" /></div>}>
              {selectedDate === getLocalISODate() ? (
                <>
                  {selectedGame && <ScoringLeaders selectedGame={selectedGame as Game} />}
                  {selectedGame && <PlayByPlay gameId={(selectedGame as Game)?.gameId || null} />}
                </>
              ) : (
                <div className="flex justify-center items-center h-48">
                  <p className="text-lg text-gray-400">
                    Live scoreboard available only for today's games.
                  </p>
                </div>
              )}
            </Suspense>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
