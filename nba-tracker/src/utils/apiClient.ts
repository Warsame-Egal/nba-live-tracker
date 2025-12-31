/**
 * API client utility with retry logic and timeout handling.
 * Automatically retries failed requests to handle intermittent network issues.
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Fetch with retry logic and timeout.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (same as native fetch)
 * @param retryOptions - Retry configuration
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000, // Start with 1 second
    timeout = 30000, // 30 second timeout
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Merge abort signal with existing options
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // If response is ok, return it
      if (response.ok) {
        return response;
      }

      // If it's a server error (5xx), retry
      // If it's a client error (4xx), don't retry (except 408, 429)
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        if (attempt < maxRetries) {
          // Calculate exponential backoff delay
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // For other errors, return the response (let caller handle it)
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort (timeout) or if we've exhausted retries
      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Network errors - retry
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Request failed after all retries');
}

/**
 * Fetch JSON with retry logic.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Promise<T>
 */
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

