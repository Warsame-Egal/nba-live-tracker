import React from "react";
import { Game } from "../types/scoreboard";
import { GameSummary } from "../types/schedule";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface GameCardProps {
  game: Game | GameSummary;
  setSelectedGame?: (game: Game | GameSummary) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const isLiveGame = "homeTeam" in game;

  const homeTeam = isLiveGame
    ? game.homeTeam?.teamTricode
    : game.home_team?.team_abbreviation;

  const awayTeam = isLiveGame
    ? game.awayTeam?.teamTricode
    : game.away_team?.team_abbreviation;

  const homeScore = isLiveGame ? game.homeTeam?.score ?? 0 : game.home_team?.points ?? 0;
  const awayScore = isLiveGame ? game.awayTeam?.score ?? 0 : game.away_team?.points ?? 0;

  const homeId = isLiveGame ? game.homeTeam?.teamId : game.home_team?.team_id;
  const awayId = isLiveGame ? game.awayTeam?.teamId : game.away_team?.team_id;

  const status = isLiveGame ? game.gameStatusText : game.game_status || "";
  const displayStatus = status || "Scheduled";

  const gameTime = isLiveGame
    ? game.gameEt
      ? format(parseISO(game.gameEt), "h:mm a")
      : game.gameTimeUTC
      ? format(parseISO(game.gameTimeUTC), "h:mm a 'UTC'")
      : "TBD"
    : game.game_date
    ? format(parseISO(game.game_date), "h:mm a")
    : "TBD";

  const isNotStarted =
    status.startsWith("Start:") || status.startsWith("0Q") || status === "";

  const statusColor = React.useMemo(() => {
    if (status.includes("LIVE")) return "bg-red-600 text-white";
    if (status.includes("FINAL")) return "bg-black text-white";
    return "bg-neutral-900 text-gray-300";
  }, [status]);

  return (
    <div
      className="relative bg-black rounded-md md:rounded-lg shadow-md transition duration-200 p-3 md:p-4 mb-2 md:mb-3 w-full max-w-full"
      style={{ height: "120px" }}
    >
      <div className="flex justify-between items-center h-full">
        <TeamInfo
          teamName={isLiveGame ? game.awayTeam?.teamName : awayTeam}
          tricode={awayTeam}
          score={awayScore}
          isWinner={awayScore > homeScore}
          isHomeTeam={false}
          teamId={awayId}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className={`px-2 py-1 rounded-md text-sm md:text-base font-semibold ${statusColor}`}>
            {isNotStarted ? gameTime : displayStatus}
          </p>
        </div>

        <TeamInfo
          teamName={isLiveGame ? game.homeTeam?.teamName : homeTeam}
          tricode={homeTeam}
          score={homeScore}
          isWinner={homeScore > awayScore}
          isHomeTeam={true}
          teamId={homeId}
        />
      </div>
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
}

const TeamInfo: React.FC<TeamInfoProps> = ({
  teamName,
  tricode,
  score = 0,
  isHomeTeam,
  isWinner,
  teamId,
}) => {
  const logoSrc = teamLogos[tricode || "NBA"] || teamLogos["NBA"];
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (teamId) navigate(`/team/${teamId}`);
  };

  return (
    <div
      className={`flex items-center gap-2 md:gap-3 ${
        isHomeTeam ? "flex-row-reverse" : ""
      }`}
    >
      <div onClick={handleClick} className="flex items-center gap-2 cursor-pointer">
        {logoSrc && (
          <img
            src={logoSrc}
            alt={`${teamName || tricode} logo`}
            className="w-10 h-10 md:w-12 md:h-12 object-contain"
          />
        )}
        <div className={isHomeTeam ? "text-right" : "text-left"}>
          <p className="text-base md:text-lg font-semibold text-blue-300 whitespace-nowrap">
            {tricode || teamName || "N/A"}
          </p>
        </div>
      </div>

      <p
        className={`text-lg md:text-xl font-bold ${
          isWinner ? "text-blue-400" : "text-white"
        }`}
      >
        {score}
      </p>
    </div>
  );
};

const teamLogos: Record<string, string> = {
  ATL: "/logos/ATL.svg",
  BOS: "/logos/BOS.svg",
  BKN: "/logos/BKN.svg",
  CHA: "/logos/CHA.svg",
  CHI: "/logos/CHI.svg",
  CLE: "/logos/CLE.svg",
  DAL: "/logos/DAL.svg",
  DEN: "/logos/DEN.svg",
  DET: "/logos/DET.svg",
  GSW: "/logos/GSW.svg",
  HOU: "/logos/HOU.svg",
  IND: "/logos/IND.svg",
  LAC: "/logos/LAC.svg",
  LAL: "/logos/LAL.svg",
  MEM: "/logos/MEM.svg",
  MIA: "/logos/MIA.svg",
  MIL: "/logos/MIL.svg",
  MIN: "/logos/MIN.svg",
  NOP: "/logos/NOP.svg",
  NYK: "/logos/NYK.svg",
  OKC: "/logos/OKC.svg",
  ORL: "/logos/ORL.svg",
  PHI: "/logos/PHI.svg",
  PHX: "/logos/PHX.svg",
  POR: "/logos/POR.svg",
  SAC: "/logos/SAC.svg",
  SAS: "/logos/SAS.svg",
  TOR: "/logos/TOR.svg",
  UTA: "/logos/UTA.svg",
  WAS: "/logos/WAS.svg",
  NBA: "/logos/NBA.svg",
};

export default GameCard;
