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
          <p className="team-record">{game.homeTeam.wins}-{game.homeTeam.losses}</p>
          <p className="team-score">{game.homeTeam.score}</p>
        </div>

        <span className="text-xl font-bold">VS</span>

        {/* Away Team */}
        <div className="team-info">
          <img
            src={`/logos/${game.awayTeam.teamTricode}.svg`}
            alt={game.awayTeam.teamName}
            className="team-logo"
          />
          <p className="team-name">{game.awayTeam.teamName}</p>
          <p className="team-record">{game.awayTeam.wins}-{game.awayTeam.losses}</p>
          <p className="team-score">{game.awayTeam.score}</p>
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
