import { Game } from "../types/scoreboard";

interface GameCardProps {
  game: Game;
  setSelectedGame: (game: Game) => void;
}

const GameCard = ({ game, setSelectedGame }: GameCardProps) => {
  return (
    <div
      className="p-4 bg-neutral-900 rounded-lg shadow-lg border border-neutral-800 cursor-pointer 
      hover:bg-neutral-800 transition-all flex flex-col items-center gap-4"
      onClick={() => setSelectedGame(game)}
    >
      {/* Teams & Score */}
      <div className="flex justify-between w-full">
        {/* Home Team */}
        <TeamInfo logo={game.homeTeam.teamTricode} name={game.homeTeam.teamTricode} />

        {/* Score & Status */}
        <div className="text-center">
          <p className="text-xl font-bold">{game.awayTeam.score} - {game.homeTeam.score}</p>
          <p className={`text-xs px-2 py-1 rounded ${game.gameStatusText === "LIVE" ? "bg-red-600 text-white" : "bg-gray-600"}`}>
            {game.gameStatusText} {game.period > 0 ? `Q${game.period}` : ""}
          </p>
        </div>

        {/* Away Team */}
        <TeamInfo logo={game.awayTeam.teamTricode} name={game.awayTeam.teamTricode} />
      </div>
    </div>
  );
};

/* Reusable TeamInfo Component */
const TeamInfo = ({ logo, name }: { logo: string; name: string }) => (
  <div className="text-center">
    <img
      src={`/logos/${logo}.svg`}
      className="w-10 h-10 mx-auto cursor-pointer hover:scale-110 transition"
      alt={name}
    />
    <p className="text-sm text-gray-300">{name}</p>
  </div>
);

export default GameCard;
