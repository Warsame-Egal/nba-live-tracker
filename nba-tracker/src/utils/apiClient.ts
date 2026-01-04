// API client with automatic retries and timeouts
// Handles network hiccups by retrying failed requests
import { API_BASE_URL } from './apiConfig';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// Fetch with automatic retries on failure
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
  } = retryOptions;

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

      // Retry on server errors (5xx) or timeout/rate limit (408, 429)
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
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

// Fetch JSON with same retry logic
export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// Fetch league leaders for a specific stat category
export async function fetchLeagueLeaders(
  statCategory: string,
  season?: string
): Promise<any> {
  const params = new URLSearchParams({ stat_category: statCategory });
  if (season) {
    params.append('season', season);
  }
  const url = `${API_BASE_URL}/api/v1/league/leaders?${params.toString()}`;
  return fetchJson(url, {}, { maxRetries: 3, retryDelay: 1000, timeout: 30000 });
}


