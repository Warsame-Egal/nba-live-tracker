import React from "react";
import { Game } from "../types/scoreboard";

interface Props {
  game: Game;
}

const GameLeaders: React.FC<Props> = ({ game }) => {
  return (
    <div className="game-leaders">
      <div className="flex justify-between">
        <p className="leader-title">Game Leaders</p>
        <p>PTS | REB | AST</p>
      </div>

      {/* Away Team Leader */}
      <div className="leader-stats">
        <p>{game.gameLeaders.awayLeaders.name}</p>
        <p>
          {game.gameLeaders.awayLeaders.points} | {game.gameLeaders.awayLeaders.rebounds} | {game.gameLeaders.awayLeaders.assists}
        </p>
      </div>

      {/* Home Team Leader */}
      <div className="leader-stats">
        <p>{game.gameLeaders.homeLeaders.name}</p>
        <p>
          {game.gameLeaders.homeLeaders.points} | {game.gameLeaders.homeLeaders.rebounds} | {game.gameLeaders.homeLeaders.assists}
        </p>
      </div>
    </div>
  );
};

export default GameLeaders;
