import { Game } from '../types/scoreboard';
import { Link } from 'react-router-dom';

interface ScoringLeadersProps {
  selectedGame: Game;
}

// Optional encoding fix helper
const fixEncoding = (str: string) => decodeURIComponent(escape(str));

const ScoringLeaders = ({ selectedGame }: ScoringLeadersProps) => {
  const { gameLeaders } = selectedGame;

  return (
    <div className="text-sm text-gray-300 space-y-3">
      {/* Home Team */}
      <div>
        <h3 className="text-xs font-semibold text-blue-400 mb-1">
          {selectedGame.homeTeam.teamName}
        </h3>
        {gameLeaders?.homeLeaders ? (
          <LeaderRow leader={gameLeaders.homeLeaders} />
        ) : (
          <p className="text-gray-500 text-xs">No leader</p>
        )}
      </div>

      {/* Away Team */}
      <div>
        <h3 className="text-xs font-semibold text-pink-400 mb-1">
          {selectedGame.awayTeam.teamName}
        </h3>
        {gameLeaders?.awayLeaders ? (
          <LeaderRow leader={gameLeaders.awayLeaders} />
        ) : (
          <p className="text-gray-500 text-xs">No leader</p>
        )}
      </div>
    </div>
  );
};

interface LeaderRowProps {
  leader: {
    personId: number;
    name: string;
    points: number;
    rebounds: number;
    assists: number;
  };
}

const LeaderRow = ({ leader }: LeaderRowProps) => {
  const avatarUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${leader.personId}.png`;

  return (
    <div className="flex items-center gap-3">
      <Link to={`/players/${leader.personId}`}>
        <img
          src={avatarUrl}
          alt={leader.name}
          className="w-8 h-8 rounded-full object-cover"
          onError={e => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '';
          }}
        />
      </Link>
      <div className="flex flex-col text-xs">
        <Link
          to={`/players/${leader.personId}`}
          className="text-white font-semibold hover:underline"
        >
          {fixEncoding(leader.name)}
        </Link>
        <span className="text-gray-400">
          {leader.points} PTS • {leader.rebounds} REB • {leader.assists} AST
        </span>
      </div>
    </div>
  );
};

export default ScoringLeaders;
