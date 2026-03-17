import React from 'react';
import { Game } from '../types/scoreboard';
import { GameSummary } from '../types/schedule';
import { getGameStatus } from '../utils/gameUtils';
import LiveGameCard from './games/LiveGameCard';
import ScheduledGameCard from './games/ScheduledGameCard';
import CompletedGameCard from './games/CompletedGameCard';
import { GameInsightData } from './GameInsight';
import { KeyMoment, WinProbability } from '../types/scoreboard';

export interface GameRowProps {
  game: Game | GameSummary;
  onClick?: () => void;
  isRecentlyUpdated?: boolean;
  isSelected?: boolean;
  onOpenBoxScore?: (gameId: string) => void;
  onOpenPlayByPlay?: (gameId: string) => void;
  insight?: GameInsightData | null;
  keyMoment?: KeyMoment | null;
  winProbability?: WinProbability | null;
  /** For scheduled games: home team win probability 0–1 from predictions */
  homeWinPercent?: number | null;
}

/**
 * Thin router: picks LiveGameCard, ScheduledGameCard, or CompletedGameCard by game status.
 * Box score / play-by-play live on GameDetail; clicking a card navigates to /game/:id.
 */
const GameRow: React.FC<GameRowProps> = ({
  game,
  onClick,
  isRecentlyUpdated = false,
  insight,
  keyMoment,
  winProbability,
  homeWinPercent,
}) => {
  const status = getGameStatus(game);

  if (status === 'live') {
    return (
      <LiveGameCard
        game={game}
        onClick={onClick}
        isRecentlyUpdated={isRecentlyUpdated}
        keyMoment={keyMoment}
        winProbability={winProbability}
        insight={insight}
      />
    );
  }

  if (status === 'upcoming') {
    return (
      <ScheduledGameCard
        game={game}
        onClick={onClick}
        homeWinPercent={homeWinPercent}
      />
    );
  }

  return (
    <CompletedGameCard
      game={game}
      onClick={onClick}
      isRecentlyUpdated={isRecentlyUpdated}
    />
  );
};

export default GameRow;
