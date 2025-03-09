import { Link } from "react-router-dom";
import { Game } from "../types/scoreboard";
import GameLeaders from "../components/GameLeaders";

interface Props {
  game: Game;
}

const GameCard: React.FC<Props> = ({ game }) => {
  return (
    <div className="game-card">
      {/* Game Status & Quarter */}
      <div className="flex justify-between text-xs text-gray-300">
        <span className={`status-${game.gameStatusText.toLowerCase()}`}>
          {game.gameStatusText}
        </span>
        <span>{game.period > 0 ? `Q${game.period}` : "Upcoming"}</span>
      </div>

      {/* Team Matchup */}
      <div className="flex justify-center items-center gap-6 my-4">
        <div className="text-center">
          <Link to={`/team/${game.awayTeam.teamId}`} className="block text-lg font-bold hover:underline">
            <img src={`/logos/${game.awayTeam.teamTricode}.svg`} alt={game.awayTeam.teamName} className="team-logo" />
            {game.awayTeam.teamName}
          </Link>
          <p className="text-2xl font-bold">{game.awayTeam.score}</p>
        </div>

        <span className="text-gray-400 text-3xl font-bold">VS</span>

        <div className="text-center">
          <Link to={`/team/${game.homeTeam.teamId}`} className="block text-lg font-bold hover:underline">
            <img src={`/logos/${game.homeTeam.teamTricode}.svg`} alt={game.homeTeam.teamName} className="team-logo" />
            {game.homeTeam.teamName}
          </Link>
          <p className="text-2xl font-bold">{game.homeTeam.score}</p>
        </div>
      </div>

      {/* Game Leaders */}
      <GameLeaders game={game} />
    </div>
  );
};

export default GameCard;
