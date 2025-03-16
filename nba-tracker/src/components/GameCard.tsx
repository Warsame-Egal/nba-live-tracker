import { Game } from "../types/scoreboard";
import { GameSummary } from "../types/schedule";

interface GameCardProps {
  game: Game | GameSummary;
  setSelectedGame: (game: Game | GameSummary) => void;
}

const GameCard = ({ game, setSelectedGame }: GameCardProps) => {
  const isLiveGame = 'homeTeam' in game;

  const homeTeam = isLiveGame ? game.homeTeam.teamTricode : game.home_team.team_abbreviation;
  const awayTeam = isLiveGame ? game.awayTeam.teamTricode : game.away_team.team_abbreviation;
  const homeScore = isLiveGame ? game.homeTeam.score : game.home_team.points ?? '-';
  const awayScore = isLiveGame ? game.awayTeam.score : game.away_team.points ?? '-';
  const status = isLiveGame ? game.gameStatusText : game.game_status;

  return (
    <div
      className="p-4 bg-neutral-900 rounded-lg shadow-lg border border-neutral-800 cursor-pointer hover:bg-neutral-800 transition-all flex flex-col items-center gap-4"
      onClick={() => setSelectedGame(game)}
    >
      <div className="flex justify-between w-full">
        <TeamInfo logo={homeTeam} name={homeTeam} />

        <div className="text-center">
          <p className="text-xl font-bold">
            {awayScore} - {homeScore}
          </p>
          <p className={`text-xs px-2 py-1 rounded ${status === "LIVE" ? "bg-red-600 text-white" : "bg-gray-600"}`}>
            {status}
          </p>
        </div>

        <TeamInfo logo={awayTeam} name={awayTeam} />
      </div>
    </div>
  );
};

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
