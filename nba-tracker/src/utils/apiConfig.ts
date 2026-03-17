/**
 * Centralized API base URL configuration
 * Handles empty string for relative paths (Vercel proxy) and localhost for development
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If explicitly set to empty string or '/', use empty string for relative paths
  if (envUrl === '' || envUrl === '/') return '';
  // In dev, default to same-origin so Vite proxy can forward /api to the API server
  if (import.meta.env.DEV && envUrl === undefined) return '';
  return envUrl ?? 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Centralized WebSocket URL configuration
 * WebSockets need direct connection
 * For HTTPS frontend, use WSS (secure WebSocket)
 */
export const getWebSocketUrl = (path: string = '/api/v1/ws'): string => {
  const envUrl = import.meta.env.VITE_WS_URL;
  const baseHost = envUrl?.replace(/^https?:\/\//, '') || 'localhost:8000';

  // Determine protocol based on current page protocol
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  return `${protocol}://${baseHost}${path}`;
};

export const getWebSocketHost = (): string => {
  const envUrl = import.meta.env.VITE_WS_URL;
  return envUrl?.replace(/^https?:\/\//, '') || 'localhost:8000';
};
