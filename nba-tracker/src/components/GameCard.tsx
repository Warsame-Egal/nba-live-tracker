import { Link } from "react-router-dom";
import { Game } from "../types/scoreboard";
import GameLeaders from "../components/GameLeaders";

interface Props {
  game: Game;
}

const GameCard: React.FC<Props> = ({ game }) => {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
      {/* Game Status & Quarter */}
      <div className="flex justify-between text-sm text-gray-300">
        <span className={`px-2 py-1 rounded ${game.gameStatusText === "LIVE" ? "bg-red-600 text-white" : "bg-gray-700"}`}>
          {game.gameStatusText}
        </span>
        <span>{game.period > 0 ? `Q${game.period}` : "Upcoming"}</span>
      </div>

      {/* Team Matchup */}
      <div className="flex justify-center items-center gap-6 my-4">
        <div className="text-center">
          <Link to={`/team/${game.awayTeam.teamId}`} className="block text-lg font-bold hover:underline">
            <img 
              src={`/logos/${game.awayTeam.teamTricode}.svg`} 
              alt={game.awayTeam.teamName} 
              className="w-12 h-12 mx-auto"
            />
            {game.awayTeam.teamName}
          </Link>
          <p className="text-2xl font-bold">
            {game.awayTeam.score ?? "-"}
          </p>
        </div>

        <span className="text-gray-400 text-3xl font-bold">VS</span>

        <div className="text-center">
          <Link to={`/team/${game.homeTeam.teamId}`} className="block text-lg font-bold hover:underline">
            <img 
              src={`/logos/${game.homeTeam.teamTricode}.svg`} 
              alt={game.homeTeam.teamName} 
              className="w-12 h-12 mx-auto"
            />
            {game.homeTeam.teamName}
          </Link>
          <p className="text-2xl font-bold">
            {game.homeTeam.score ?? "-"}
          </p>
        </div>
      </div>

      {/* Game Leaders */}
      <GameLeaders game={game} />
    </div>
  );
};

export default GameCard;
