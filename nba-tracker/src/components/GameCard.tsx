import { Link } from "react-router-dom";
import { Game } from "../types/scoreboard";

const GameCard = ({ game, setSelectedGame }: { game: Game; setSelectedGame: (game: Game) => void }) => {
  return (
    <div className="bg-neutral-900 p-4 rounded-lg shadow-lg border border-neutral-700">
      <div className="flex justify-between items-center text-sm text-gray-300">
        {/* Game Status */}
        <span className={`px-2 py-1 rounded ${game.gameStatusText === "LIVE" ? "bg-red-600 text-white" : "bg-gray-600"}`}>
          {game.gameStatusText} {game.period > 0 ? `Q${game.period}` : ""}
        </span>
      </div>

      {/* Team Logos & Names */}
      <div className="flex justify-center items-center gap-6 my-4">
        
        {/* Away Team */}
        <div className="text-center">
          <Link to={`/team/${game.awayTeam.teamId}`}>
            <img
              src={`/logos/${game.awayTeam.teamTricode}.svg`}
              className="w-12 h-12 mx-auto cursor-pointer hover:scale-110 transition"
              alt={game.awayTeam.teamName}
            />
          </Link>
          <p className="text-sm text-gray-300">{game.awayTeam.teamTricode}</p>
        </div>

        {/* Score & Status */}
        <div className="mx-4 text-center">
          <p className="text-2xl font-bold text-white">
            {game.awayTeam.score} - {game.homeTeam.score}
          </p>
        </div>

        {/* Home Team */}
        <div className="text-center">
          <Link to={`/team/${game.homeTeam.teamId}`}>
            <img
              src={`/logos/${game.homeTeam.teamTricode}.svg`}
              className="w-12 h-12 mx-auto cursor-pointer hover:scale-110 transition"
              alt={game.homeTeam.teamName}
            />
          </Link>
          <p className="text-sm text-gray-300">{game.homeTeam.teamTricode}</p>
        </div>
      </div>

      {/* View Play-by-Play Button */}
      <button
        className="mt-3 w-full text-indigo-400 hover:text-indigo-300 text-sm"
        onClick={() => setSelectedGame(game)}
      >
        View Play-by-Play
      </button>
    </div>
  );
};

export default GameCard;
