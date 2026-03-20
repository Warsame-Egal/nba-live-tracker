// API client with automatic retries and timeouts
// Handles network hiccups by retrying failed requests
import { API_BASE_URL } from './apiConfig';
import type { LeagueLeadersResponse } from '../types/league';
import type { PlayerSearchResult, ComparisonResponse } from '../types/compare';
import type { GameDetailResponse } from '../types/gameDetail';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// Fetch with automatic retries on failure
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {},
): Promise<Response> {
  const { maxRetries = 3, retryDelay = 1000, timeout = 30000 } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Retry on server errors (5xx) or request timeout (408)
      if (response.status >= 500 || response.status === 408) {
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Never retry rate limits; let callers surface a friendly message immediately.
      if (response.status === 429) {
        throw new Error('Too many requests — please wait a moment and try again.');
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

/** Extract user-facing message from FastAPI-style JSON error bodies. */
function parseFastApiErrorBody(text: string): string | null {
  try {
    const body = JSON.parse(text) as { detail?: unknown };
    const d = body.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
      const msgs = d
        .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
        .map((x) => (typeof x.msg === 'string' ? x.msg : ''))
        .filter(Boolean);
      if (msgs.length) return msgs.join(' ');
    }
    if (
      d &&
      typeof d === 'object' &&
      d !== null &&
      'message' in d &&
      typeof (d as { message: unknown }).message === 'string'
    ) {
      return (d as { message: string }).message;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Fetch JSON with same retry logic
export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {},
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);
  const text = await response.text();

  if (!response.ok) {
    const fromApi = parseFastApiErrorBody(text);
    throw new Error(fromApi ?? `Request failed (${response.status})`);
  }

  return JSON.parse(text) as T;
}

// Fetch league leaders for a specific stat category
export async function fetchLeagueLeaders(
  statCategory: string,
  season?: string,
): Promise<LeagueLeadersResponse> {
  const params = new URLSearchParams({ stat_category: statCategory });
  if (season) {
    params.append('season', season);
  }
  const url = `${API_BASE_URL}/api/v1/league/leaders?${params.toString()}`;
  return fetchJson(url, {}, { maxRetries: 3, retryDelay: 1000, timeout: 30000 });
}

// Compare: player search for autocomplete
export async function searchComparePlayers(q: string): Promise<PlayerSearchResult[]> {
  const params = new URLSearchParams({ q: q.trim() });
  const url = `${API_BASE_URL}/api/v1/compare/search?${params.toString()}`;
  return fetchJson(url, {}, { maxRetries: 2, timeout: 15000 });
}

// Compare: list seasons for a player (for season selector)
export async function fetchPlayerSeasons(playerId: number): Promise<string[]> {
  const url = `${API_BASE_URL}/api/v1/compare/seasons/${playerId}`;
  return fetchJson(url, {}, { maxRetries: 2, timeout: 15000 });
}

// Compare: full comparison for two players. season1 for player 1, season2 for player 2 (optional).
export async function fetchComparison(
  player1Id: number,
  player2Id: number,
  season1: string,
  lastNGames: number = 20,
  season2?: string,
): Promise<ComparisonResponse> {
  const params = new URLSearchParams({ season: season1, last_n_games: String(lastNGames) });
  if (season2 != null && season2 !== season1) {
    params.set('season1', season1);
    params.set('season2', season2);
  }
  const url = `${API_BASE_URL}/api/v1/compare/${player1Id}/${player2Id}?${params.toString()}`;
  return fetchJson(url, {}, { maxRetries: 2, timeout: 25000 });
}

/** Game detail: aggregated score, box score, player impacts, key moments, win probability, AI summary */
export async function fetchGameDetail(gameId: string): Promise<GameDetailResponse> {
  const url = `${API_BASE_URL}/api/v1/game/${gameId}/detail`;
  return fetchJson(url, {}, { maxRetries: 2, timeout: 35000 });
}

/** Fetch or trigger AI game summary (completed games only). Waits up to ~15s for generation. */
export async function fetchGameSummary(gameId: string): Promise<{ summary: string | null }> {
  const url = `${API_BASE_URL}/api/v1/game/${gameId}/summary`;
  return fetchJson(url, {}, { maxRetries: 1, timeout: 20000 });
}

/** Fetch or generate post-game recap (completed games only). */
export async function fetchGameRecap(
  gameId: string,
): Promise<{ game_id: string; recap: string; cached: boolean } | null> {
  const url = `${API_BASE_URL}/api/v1/game/${gameId}/recap`;
  try {
    return await fetchJson(url, {}, { maxRetries: 1, timeout: 20000 });
  } catch {
    return null;
  }
}
