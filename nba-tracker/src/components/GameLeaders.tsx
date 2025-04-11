import { Game } from '../types/scoreboard';

interface Props {
  game: Game;
}

const GameLeaders: React.FC<Props> = ({ game }) => {
  const awayLeader = game.gameLeaders?.awayLeaders;
  const homeLeader = game.gameLeaders?.homeLeaders;

  return (
    <div
      className="bg-black -to-br from-gray-800 to-neutral-900 rounded-xl p-5 shadow-2xl border border-gray-700 
      flex justify-between w-full md:w-96 text-sm"
    >
      {/* Away Team Leader */}
      <div className="text-center w-1/2 border-r border-gray-700">
        {awayLeader ? (
          <>
            <p className="text-gray-300 font-semibold">{awayLeader.name}</p>
            <p className="text-white font-bold text-lg">
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
            <p className="text-white font-bold text-lg">
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
