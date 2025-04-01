import { Game } from "../types/scoreboard";
import { FaUserCircle } from "react-icons/fa";
import { Link } from "react-router-dom";

interface ScoringLeadersProps {
  selectedGame: Game | null;
}

const ScoringLeaders = ({ selectedGame }: ScoringLeadersProps) => {
  if (!selectedGame) {
    return (
      <div className="bg-gradient-to-br from-nba-card-light to-nba-card-dark p-6 rounded-2xl shadow-lg border border-nba-border">
        <p className="text-gray-400 text-center">Select a game to see leaders</p>
      </div>
    );
  }

  const { gameLeaders } = selectedGame;

  return (
    <div className="bg-gradient-to-br from-nba-card-light to-nba-card-dark p-6 rounded-2xl shadow-lg border border-nba-border">
      <h2 className="text-xl font-bold text-white mb-4 tracking-tight flex items-center justify-center">
        Top Performers
      </h2>

      {/* Home Team Leaders */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-blue-400">
          {selectedGame.homeTeam.teamName}
        </h3>
        {gameLeaders?.homeLeaders ? (
          <LeaderCard leader={gameLeaders.homeLeaders} />
        ) : (
          <p className="text-gray-400">No leaders available</p>
        )}
      </div>

      {/* Away Team Leaders */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-pink-400">
          {selectedGame.awayTeam.teamName}
        </h3>
        {gameLeaders?.awayLeaders ? (
          <LeaderCard leader={gameLeaders.awayLeaders} />
        ) : (
          <p className="text-gray-400">No leaders available</p>
        )}
      </div>
    </div>
  );
};

interface LeaderCardProps {
  leader: {
    personId: number;
    name: string;
    points: number;
    rebounds: number;
    assists: number;
  };
}

const LeaderCard = ({ leader }: LeaderCardProps) => {
  const avatarUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.personId}.png`;

  return (
    <div className="flex items-center p-4 rounded-lg"> {/* Removed bg-gray-800 and shadow-inner */}
      <Link to={`/players/${leader.personId}`} className="mr-4">
        <img
          src={avatarUrl}
          alt={leader.name}
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "";
          }}
        />
        {!avatarUrl && (
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
            <FaUserCircle className="text-white text-2xl" />
          </div>
        )}
      </Link>
      <div className="flex-1">
        <Link to={`/players/${leader.personId}`} className="block mb-1 font-semibold text-white hover:text-blue-300">
          {leader.name}
        </Link>
        <p className="text-sm text-gray-400">
          <span className="text-nba-accent">{leader.points} PTS</span> •
          <span className="text-nba-accent"> {leader.rebounds} REB</span> •
          <span className="text-nba-accent"> {leader.assists} AST</span>
        </p>
      </div>
    </div>
  );
};

export default ScoringLeaders;