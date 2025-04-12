import React from 'react';
import { Game } from '../types/scoreboard';
import { GameSummary } from '../types/schedule';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface GameCardProps {
  game: Game | GameSummary;
  setSelectedGame?: (game: Game | GameSummary) => void;
  hideScore?: boolean; // Optional prop to control score rendering
}

const GameCard: React.FC<GameCardProps> = ({ game, hideScore = false }) => {
  const isLiveGame = 'homeTeam' in game;

  const homeTeam = isLiveGame
    ? game.homeTeam?.teamTricode
    : game.home_team?.team_abbreviation;
  const awayTeam = isLiveGame
    ? game.awayTeam?.teamTricode
    : game.away_team?.team_abbreviation;

  const homeScore = isLiveGame
    ? (game.homeTeam?.score ?? 0)
    : (game.home_team?.points ?? 0);
  const awayScore = isLiveGame
    ? (game.awayTeam?.score ?? 0)
    : (game.away_team?.points ?? 0);

  const homeId = isLiveGame
    ? game.homeTeam?.teamId
    : game.home_team?.team_id;
  const awayId = isLiveGame
    ? game.awayTeam?.teamId
    : game.away_team?.team_id;

  const status = isLiveGame ? game.gameStatusText : game.game_status || '';
  const period = isLiveGame ? game.period : null;
  const gameClock = isLiveGame ? game.gameClock : null;
  const displayStatus = status || 'Scheduled';

  const gameTime = isLiveGame
    ? game.gameEt
      ? format(parseISO(game.gameEt), 'h:mm a')
      : game.gameTimeUTC
        ? format(parseISO(game.gameTimeUTC), "h:mm a 'UTC'")
        : 'TBD'
    : game.game_date
      ? format(parseISO(game.game_date), 'h:mm a')
      : 'TBD';

  const isLive = status.includes('LIVE');
  const isFinal = status.includes('FINAL');
  const isNotStarted = status.startsWith('Start:') || status.startsWith('0Q') || status === '';

  const statusColor = React.useMemo(() => {
    if (isLive) return 'bg-red-600 text-white';
    if (isFinal) return 'bg-black text-white';
    return 'bg-neutral-900 text-gray-300';
  }, [isLive, isFinal]);

  const centralInfo = React.useMemo(() => {
    if (isNotStarted) {
      return gameTime;
    }
    if (isLive && period && gameClock) {
      return `${period}Q ${gameClock}`;
    }
    return displayStatus;
  }, [isNotStarted, isLive, period, gameClock, gameTime, displayStatus]);

  return (
    <div
      className="bg-black rounded-md md:rounded-lg transition duration-200 p-3 md:p-4 mb-2 md:mb-3 w-full max-w-full flex items-center justify-between"
      style={{ height: '100px' }}
    >
      <TeamInfo
        teamName={isLiveGame ? game.awayTeam?.teamName : awayTeam}
        tricode={awayTeam}
        score={awayScore}
        isWinner={awayScore > homeScore}
        isHomeTeam={false}
        teamId={awayId}
        hideScore={hideScore} // Passing hideScore prop to TeamInfo
      />

      <div className="flex flex-col items-center justify-center">
        <p className={`px-2 py-1 rounded-md text-xs md:text-sm font-semibold ${statusColor}`}>
          {centralInfo}
        </p>
      </div>

      <TeamInfo
        teamName={isLiveGame ? game.homeTeam?.teamName : homeTeam}
        tricode={homeTeam}
        score={homeScore}
        isWinner={homeScore > awayScore}
        isHomeTeam={true}
        teamId={homeId}
        hideScore={hideScore} // Passing hideScore prop to TeamInfo
      />
    </div>
  );
};

interface TeamInfoProps {
  teamName?: string | null;
  tricode?: string | null;
  score?: number;
  isHomeTeam: boolean;
  isWinner?: boolean;
  teamId?: number | null;
  hideScore?: boolean; // Prop to control score rendering
}

const TeamInfo: React.FC<TeamInfoProps> = ({
  teamName,
  tricode,
  score = 0,
  isHomeTeam,
  isWinner,
  teamId,
  hideScore = false,
}) => {
  const logoSrc = teamLogos[tricode || 'NBA'] || teamLogos['NBA'];
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (teamId) navigate(`/team/${teamId}`);
  };

  return (
    <div className={`flex items-center gap-2 md:gap-3 ${isHomeTeam ? 'flex-row-reverse' : ''}`}>
      <div onClick={handleClick} className="flex items-center gap-2 cursor-pointer">
        {logoSrc && (
          <img
            src={logoSrc}
            alt={`${teamName || tricode} logo`}
            className="w-8 h-8 md:w-10 md:h-10 object-contain"
          />
        )}
        <div className={isHomeTeam ? 'text-right' : 'text-left'}>
          <p className="text-sm md:text-base font-semibold text-blue-300 whitespace-nowrap">
            {tricode || teamName || 'N/A'}
          </p>
        </div>
      </div>

      <p className={`text-lg md:text-xl font-bold ${isWinner ? 'text-blue-400' : 'text-white'}`}>
        {hideScore ? '' : score}
      </p>
    </div>
  );
};

const teamLogos: Record<string, string> = {
  ATL: '/logos/ATL.svg',
  BOS: '/logos/BOS.svg',
  BKN: '/logos/BKN.svg',
  CHA: '/logos/CHA.svg',
  CHI: '/logos/CHI.svg',
  CLE: '/logos/CLE.svg',
  DAL: '/logos/DAL.svg',
  DEN: '/logos/DEN.svg',
  DET: '/logos/DET.svg',
  GSW: '/logos/GSW.svg',
  HOU: '/logos/HOU.svg',
  IND: '/logos/IND.svg',
  LAC: '/logos/LAC.svg',
  LAL: '/logos/LAL.svg',
  MEM: '/logos/MEM.svg',
  MIA: '/logos/MIA.svg',
  MIL: '/logos/MIL.svg',
  MIN: '/logos/MIN.svg',
  NOP: '/logos/NOP.svg',
  NYK: '/logos/NYK.svg',
  OKC: '/logos/OKC.svg',
  ORL: '/logos/ORL.svg',
  PHI: '/logos/PHI.svg',
  PHX: '/logos/PHX.svg',
  POR: '/logos/POR.svg',
  SAC: '/logos/SAC.svg',
  SAS: '/logos/SAS.svg',
  TOR: '/logos/TOR.svg',
  UTA: '/logos/UTA.svg',
  WAS: '/logos/WAS.svg',
  NBA: '/logos/NBA.svg',
};

export default GameCard;