import { Game } from "../types/scoreboard";

// Define the props for the GameLeaders component
interface Props {
  game: Game;
}

const GameLeaders: React.FC<Props> = ({ game }) => {
  // Ensure gameLeaders exists before accessing properties
  const awayLeader = game.gameLeaders?.awayLeaders;
  const homeLeader = game.gameLeaders?.homeLeaders;

  return (
    <div className="flex justify-between bg-gray-800 rounded-md p-3 text-sm shadow-lg">
      {/* Away Team Leader */}
      <div className="text-center w-1/2 border-r border-gray-700">
        {awayLeader ? (
          <>
            <p className="text-gray-300 font-semibold">{awayLeader.name}</p>
            <p className="text-white font-bold">
              {awayLeader.points} PTS | {awayLeader.rebounds} REB | {awayLeader.assists} AST
            </p>
          </>
        ) : (
          <p className="text-gray-400">No leader data</p>
        )}
      </div>

      {/* Home Team Leader */}
      <div className="text-center w-1/2">
        {homeLeader ? (
          <>
            <p className="text-gray-300 font-semibold">{homeLeader.name}</p>
            <p className="text-white font-bold">
              {homeLeader.points} PTS | {homeLeader.rebounds} REB | {homeLeader.assists} AST
            </p>
          </>
        ) : (
          <p className="text-gray-400">No leader data</p>
        )}
      </div>
    </div>
  );
};

export default GameLeaders;
