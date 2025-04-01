import React from "react";
import { Game } from "../types/scoreboard";
import { GameSummary } from "../types/schedule";
import { format, parseISO } from "date-fns";

interface GameCardProps {
  game: Game | GameSummary;
  setSelectedGame: (game: Game | GameSummary) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, setSelectedGame }) => {
  // Determine if the game object is from live WebSocket (Game) or scheduled API (GameSummary)
  const isLiveGame = "homeTeam" in game;

  // Grab team abbreviations
  const homeTeam = isLiveGame
    ? game.homeTeam?.teamTricode
    : game.home_team?.team_abbreviation;

  const awayTeam = isLiveGame
    ? game.awayTeam?.teamTricode
    : game.away_team?.team_abbreviation;

  // Extract scores
  const homeScore = isLiveGame ? game.homeTeam?.score ?? 0 : game.home_team?.points ?? 0;
  const awayScore = isLiveGame ? game.awayTeam?.score ?? 0 : game.away_team?.points ?? 0;

  // Status string (e.g., FINAL, LIVE, or start time)
  const status = isLiveGame ? game.gameStatusText : game.game_status || "";
  const displayStatus = status || "Scheduled";

  // Format the game time to readable format
  const gameTime = isLiveGame
    ? game.gameEt
      ? format(parseISO(game.gameEt), "h:mm a")
      : game.gameTimeUTC
      ? format(parseISO(game.gameTimeUTC), "h:mm a 'UTC'")
      : "TBD"
    : game.game_date
    ? format(parseISO(game.game_date), "h:mm a")
    : "TBD";

  // Determine if the game hasn't started yet
  const isNotStarted =
    status.startsWith("Start:") || status.startsWith("0Q") || status === "";

  // Decide status background color
  const statusColor = React.useMemo(() => {
    if (status.includes("LIVE")) return "bg-red-600 text-white";
    if (status.includes("FINAL")) return "bg-black -800 text-white";
    return "bg-neutral-900 text-gray-300";
  }, [status]);

  return (
    <div
      onClick={() => setSelectedGame(game)}
      className="relative bg-black -800 rounded-md md:rounded-lg shadow-md hover:black -gray-700 transition duration-200 cursor-pointer p-3 md:p-4 mb-2 md:mb-3 w-full max-w-full"
      style={{ height: "120px" }}
    >
      {/* Layout is 3 sections: Away team - Status - Home team */}
      <div className="flex justify-between items-center h-full">
        {/* Away team info */}
        <TeamInfo
          teamName={isLiveGame ? game.awayTeam?.teamName : awayTeam}
          tricode={awayTeam}
          score={awayScore}
          isWinner={awayScore > homeScore}
          isHomeTeam={false}
        />

        {/* Status (LIVE / FINAL / Scheduled Time) in the center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p
            className={`px-2 py-1 rounded-md text-sm md:text-base font-semibold ${statusColor}`}
          >
            {isNotStarted ? gameTime : displayStatus}
          </p>
        </div>

        {/* Home team info */}
        <TeamInfo
          teamName={isLiveGame ? game.homeTeam?.teamName : homeTeam}
          tricode={homeTeam}
          score={homeScore}
          isWinner={homeScore > awayScore}
          isHomeTeam={true}
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
}

// Reusable component for displaying a team's info (logo + name + score)
const TeamInfo: React.FC<TeamInfoProps> = ({
  teamName,
  tricode,
  score = 0,
  isHomeTeam,
  isWinner,
}) => {
  const logoSrc = teamLogos[tricode || "NBA"] || teamLogos["NBA"];

  return (
    <div
      className={`flex items-center gap-2 md:gap-3 ${
        isHomeTeam ? "flex-row-reverse" : ""
      }`}
    >
      {logoSrc && (
        <img
          src={logoSrc}
          alt={`${teamName || tricode} logo`}
          className="w-10 h-10 md:w-12 md:h-12 object-contain"
        />
      )}
      <div className={isHomeTeam ? "text-right" : "text-left"}>
        <p className="text-base md:text-lg font-semibold text-gray-100 whitespace-nowrap">
          {tricode || teamName || "N/A"}
        </p>
        <p
          className={`text-lg md:text-xl font-bold ${
            isWinner ? "text-blue-400" : "text-white"
          }`}
        >
          {score}
        </p>
      </div>
    </div>
  );
};

// Static list of team logos by abbreviation
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
  NBA: "/logos/NBA.svg", // fallback logo
};

export default GameCard;
