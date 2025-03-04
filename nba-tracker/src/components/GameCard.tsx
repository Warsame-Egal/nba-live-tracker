import React from "react";
import { Game } from "../types/scoreboard";
import GameLeaders from "./GameLeaders";

interface Props {
  game: Game;
}

const GameCard: React.FC<Props> = ({ game }) => {
  return (
    <div className="game-card">
      {/* Game Status */}
      <div className="game-status">
        <span
          className={
            game.gameStatusText === "LIVE"
              ? "live-game"
              : game.gameStatusText === "FINAL"
              ? "final-game"
              : "upcoming-game"
          }
        >
          {game.gameStatusText}
        </span>
        <span>{game.period > 0 ? `Q${game.period}` : "Upcoming"}</span>
      </div>

      {/* Teams Section */}
      <div className="team-section">
        {/* Home Team */}
        <div className="team-info">
          <img
            src={`/logos/${game.homeTeam.teamTricode}.svg`}
            alt={game.homeTeam.teamName}
            className="team-logo"
          />
          <p className="team-name">{game.homeTeam.teamName}</p>
          <p className="team-score">{game.homeTeam.score}</p>
        </div>

        <span className="vs-text">VS</span>

        {/* Away Team */}
        <div className="team-info">
          <img
            src={`/logos/${game.awayTeam.teamTricode}.svg`}
            alt={game.awayTeam.teamName}
            className="team-logo"
          />
          <p className="team-name">{game.awayTeam.teamName}</p>
          <p className="team-score">{game.awayTeam.score}</p>
        </div>
      </div>

      {/* Quarter-by-Quarter Scores */}
      <div className="quarter-scores">
        {/* Header Row */}
        <div className="score-row font-bold text-gray-300">
          <span className="team-col">Team</span>
          {game.homeTeam.periods.map((_, index) => (
            <span key={index} className="score-col">{index + 1}</span>
          ))}
          <span className="score-col">T</span>
        </div>

        {/* Home Team Scores */}
        <div className="score-row">
          <span className="team-col">{game.homeTeam.teamTricode}</span>
          {game.homeTeam.periods.map((period, index) => (
            <span key={index} className="score-col">
              {period.score > 0 ? period.score : "-"}
            </span>
          ))}
          <span className="score-col font-bold">{game.homeTeam.score}</span>
        </div>

        {/* Away Team Scores */}
        <div className="score-row">
          <span className="team-col">{game.awayTeam.teamTricode}</span>
          {game.awayTeam.periods.map((period, index) => (
            <span key={index} className="score-col">
              {period.score > 0 ? period.score : "-"}
            </span>
          ))}
          <span className="score-col font-bold">{game.awayTeam.score}</span>
        </div>
      </div>

      {/* Game Leaders */}
      <GameLeaders game={game} />

      {/* Game Clock */}
      {game.gameClock && <p className="game-clock">{game.gameClock}</p>}
    </div>
  );
};

export default GameCard;
