import { format, parseISO } from 'date-fns';
import { Game } from '../types/scoreboard';
import { GameSummary } from '../types/schedule';

export type GameStatus = 'live' | 'upcoming' | 'completed';

export function getGameStatus(game: Game | GameSummary): GameStatus {
  if ('homeTeam' in game) {
    if (game.gameStatusText && game.gameStatusText.toLowerCase().includes('final')) {
      return 'completed';
    }
    return 'live';
  }
  if ('game_status' in game && typeof game.game_status === 'string') {
    const lower = game.game_status.toLowerCase();
    if (lower.includes('final')) return 'completed';
    if (lower.includes('live') || lower.includes('in progress')) return 'live';
    return 'upcoming';
  }
  return 'upcoming';
}

export const TEAM_LOGOS: Record<string, string> = {
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

export function getGameTime(game: Game | GameSummary): string {
  const isLive = 'homeTeam' in game;
  if (isLive) {
    const g = game as Game;
    if (g.gameEt) {
      try {
        const parsed = parseISO(g.gameEt);
        if (!isNaN(parsed.getTime())) return format(parsed, 'h:mm a');
      } catch {
        //
      }
    }
    if (g.gameTimeUTC) {
      try {
        const parsed = parseISO(g.gameTimeUTC);
        if (!isNaN(parsed.getTime())) return format(parsed, 'h:mm a');
      } catch {
        //
      }
    }
    return 'TBD';
  }
  const g = game as GameSummary;
  if (g.game_time_utc && g.game_time_utc.trim() !== '') {
    try {
      let parsed = parseISO(g.game_time_utc);
      if (isNaN(parsed.getTime())) parsed = new Date(g.game_time_utc);
      if (!isNaN(parsed.getTime())) return format(parsed, 'h:mm a');
    } catch {
      //
    }
  }
  if ('gameTimeUTC' in g && g.gameTimeUTC && typeof g.gameTimeUTC === 'string') {
    try {
      const parsed = parseISO(g.gameTimeUTC);
      if (!isNaN(parsed.getTime())) return format(parsed, 'h:mm a');
    } catch {
      //
    }
  }
  if (g.game_date) {
    try {
      const parsed = parseISO(g.game_date);
      if (!isNaN(parsed.getTime()) && (parsed.getHours() !== 0 || parsed.getMinutes() !== 0)) {
        return format(parsed, 'h:mm a');
      }
    } catch {
      //
    }
  }
  return 'TBD';
}

export function getStatusLabel(game: Game | GameSummary): string {
  const isLive = 'homeTeam' in game;
  const status = isLive ? (game as Game).gameStatusText : (game as GameSummary).game_status || '';
  const lower = status.toLowerCase();
  if (lower.includes('final')) return 'FINAL';
  const g = game as Game;
  if (isLive && g.period != null && g.gameClock) return `${g.period}Q ${g.gameClock}`;
  if (lower.includes('live') || (status.match(/\b[1-4]q\b/i) && !lower.includes('final')))
    return 'LIVE';
  return getGameTime(game);
}
