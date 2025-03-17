import { useState, useEffect } from "react";
import { ScoreboardResponse, Game } from "../types/scoreboard";
import { GamesResponse, GameSummary } from "../types/schedule";
import WebSocketService from "../services/websocketService";
import GameCard from "../components/GameCard";
import SearchBar from "../components/SearchBar";
import ScoringLeaders from "../components/ScoringLeaders";
import PlayByPlay from "../components/PlayByPlay";
import Navbar from "../components/Navbar";
import WeeklyCalendar from "../components/WeeklyCalendar";
import MonthlyCalender from "../components/MonthlyCalender";
import { format } from "date-fns";



const SCOREBOARD_WEBSOCKET_URL = "ws://127.0.0.1:8000/api/v1/ws";

const getLocalISODate = (): string => {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzoffset).toISOString().slice(0, 10);
};

const Scoreboard = () => {
  const [games, setGames] = useState<(Game | GameSummary)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | GameSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());

  useEffect(() => {
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
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate !== getLocalISODate()) {
      const fetchGamesByDate = async (date: string) => {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/v1/schedule/date/${date}`);
        const data: GamesResponse = await response.json();
        setGames(data.games);
        setLoading(false);
        setSelectedGame(null);
      };

      fetchGamesByDate(selectedDate);
    }
  }, [selectedDate]);

  const filteredGames = games.filter(
    (game) => {
      const homeName = 'homeTeam' in game ? game.homeTeam.teamName : game.home_team.team_abbreviation;
      const awayName = 'awayTeam' in game ? game.awayTeam.teamName : game.away_team.team_abbreviation;
      return homeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             awayName.toLowerCase().includes(searchQuery.toLowerCase());
    }
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <WeeklyCalendar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />
      <MonthlyCalender
        selectedDate={new Date(selectedDate)}
        setSelectedDate={(date) => setSelectedDate(format(date, "yyyy-MM-dd"))}
      />

      <div className="max-w-7xl mx-auto px-4 mt-4 flex justify-between items-center">
        <SearchBar setSearchQuery={setSearchQuery} />
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {loading ? (
            <p className="text-center text-gray-400 text-lg">Loading games...</p>
          ) : filteredGames.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <GameCard key={'gameId' in game ? game.gameId : game.game_id} game={game} setSelectedGame={setSelectedGame} />
              ))}
            </div>
          ) : (
            <p className="text-center col-span-3 text-gray-400">No games found.</p>
          )}
        </div>

        <div className="space-y-6 flex flex-col h-full max-h-[80vh]">
          {selectedDate === getLocalISODate() ? (
            <>
              <ScoringLeaders selectedGame={selectedGame as Game} />
              <PlayByPlay gameId={(selectedGame as Game)?.gameId || null} />
            </>
          ) : (
            <p className="text-center text-gray-400">
              Live scoreboard available only for today's games.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
