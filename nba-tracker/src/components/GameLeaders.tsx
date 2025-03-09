import { Game } from "../types/scoreboard";

// Define the props for the GameLeaders component
interface Props {
  game: Game;
}

// GameLeaders component to display the top performers of the game
const GameLeaders: React.FC<Props> = ({ game }) => {
  return (
    <div className="flex justify-between bg-gray-800 rounded-md p-3 text-sm shadow-lg">
      {/* Away Team Leader */}
      <div className="text-center">
        <p className="text-gray-300 font-semibold">{game.gameLeaders.awayLeaders.name}</p>
        <p className="text-white font-bold">
          {game.gameLeaders.awayLeaders.points} PTS | {game.gameLeaders.awayLeaders.rebounds} REB | {game.gameLeaders.awayLeaders.assists} AST
        </p>
      </div>

      {/* Home Team Leader */}
      <div className="text-center">
        <p className="text-gray-300 font-semibold">{game.gameLeaders.homeLeaders.name}</p>
        <p className="text-white font-bold">
          {game.gameLeaders.homeLeaders.points} PTS | {game.gameLeaders.homeLeaders.rebounds} REB | {game.gameLeaders.homeLeaders.assists} AST
        </p>
      </div>
    </div>
  );
};

export default GameLeaders;
