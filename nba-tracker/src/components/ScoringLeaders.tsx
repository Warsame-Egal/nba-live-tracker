import { Game } from "../types/scoreboard";

const ScoringLeaders = ({ selectedGame }: { selectedGame: Game | null }) => {
  if (!selectedGame) return (
    <div className="bg-neutral-900 p-6 rounded-lg shadow-lg border border-neutral-800">
      <p className="text-gray-400 text-center">Select a game to see leaders</p>
    </div>
  );

  const { gameLeaders } = selectedGame;

  return (
    <div className="bg-neutral-900 p-6 rounded-lg shadow-lg border border-neutral-800">
      <h2 className="text-2xl font-bold text-white mb-4">Scoring Leaders</h2>

      {/* Home Team Leaders */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-indigo-400">
          {selectedGame.homeTeam.teamName} Leaders
        </h3>
        {gameLeaders?.homeLeaders ? (
          <div className="flex items-center gap-4 p-3 mt-2 bg-neutral-800 rounded-lg">
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${gameLeaders.homeLeaders.personId}.png`}
              alt={gameLeaders.homeLeaders.name}
              className="w-12 h-12 rounded-full"
              onError={(e) => (e.currentTarget.src = "https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png")}
            />
            <div>
              <p className="text-white font-semibold">{gameLeaders.homeLeaders.name}</p>
              <p className="text-gray-400 text-sm">{gameLeaders.homeLeaders.points} PTS • {gameLeaders.homeLeaders.rebounds} REB • {gameLeaders.homeLeaders.assists} AST</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 mt-2">No home team leaders available</p>
        )}
      </div>

      {/* Away Team Leaders */}
      <div>
        <h3 className="text-lg font-semibold text-rose-400">
          {selectedGame.awayTeam.teamName} Leaders
        </h3>
        {gameLeaders?.awayLeaders ? (
          <div className="flex items-center gap-4 p-3 mt-2 bg-neutral-800 rounded-lg">
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${gameLeaders.awayLeaders.personId}.png`}
              alt={gameLeaders.awayLeaders.name}
              className="w-12 h-12 rounded-full"
              onError={(e) => (e.currentTarget.src = "https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png")}
            />
            <div>
              <p className="text-white font-semibold">{gameLeaders.awayLeaders.name}</p>
              <p className="text-gray-400 text-sm">{gameLeaders.awayLeaders.points} PTS • {gameLeaders.awayLeaders.rebounds} REB • {gameLeaders.awayLeaders.assists} AST</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 mt-2">No away team leaders available</p>
        )}
      </div>
    </div>
  );
};

export default ScoringLeaders;
