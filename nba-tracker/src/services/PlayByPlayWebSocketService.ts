import { PlayByPlayResponse } from '../types/playbyplay';
import { logger } from '../utils/logger';
import { getWebSocketUrl } from '../utils/apiConfig';

/**
 * Service for managing WebSocket connections to get live play-by-play updates.
 * This connects to the backend WebSocket for a specific game and sends
 * play-by-play events (shots, fouls, etc.) to subscribers.
 */
class PlayByPlayWebSocketService {
  private socket: WebSocket | null = null;
  private currentGameId: string | null = null;
  private listeners: Set<(data: PlayByPlayResponse) => void> = new Set();
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1s
  private maxDelay = 30000; // 30s cap (Infrastructure Part 4)

  private getReconnectDelay(): number {
    const exponential = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay,
    );
    const jitter = exponential * 0.2 * Math.random();
    return exponential + jitter;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max Play-by-play WebSocket reconnect attempts reached');
      return;
    }
    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;
    logger.info(
      `Play-by-play WebSocket reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`,
    );
    setTimeout(() => {
      if (this.shouldReconnect && this.currentGameId && !this.socket) {
        this.connect(this.currentGameId);
      }
    }, delay);
  }

  /**
   * Connect to the WebSocket server for play-by-play updates for a specific game.
   *
   * @param gameId - The ID of the game to get play-by-play updates for
   */
  connect(gameId: string) {
    // Don't connect if we're already connected to the same game and the socket is open
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentGameId === gameId) {
      return;
    }

    // If connecting to a different game, disconnect first
    if (this.socket && this.currentGameId !== gameId) {
      this.disconnect();
    }

    // Clean up existing connection if it exists but is not open
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.shouldReconnect = true;
    this.currentGameId = gameId; // Store game ID for reconnection

    // Build the WebSocket URL - WebSockets need direct connection (can't use Vercel proxy)
    const url = getWebSocketUrl(`/api/v1/ws/${gameId}/play-by-play`);

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      logger.info(`Play-by-play WebSocket connected for game ${gameId}`);
    };

    // When we receive a message from the server
    this.socket.onmessage = event => {
      try {
        // Parse the JSON data and send it to all subscribers
        const data: PlayByPlayResponse = JSON.parse(event.data);
        this.listeners.forEach(callback => callback(data));
      } catch (error) {
        logger.error('Error parsing play-by-play WebSocket message', error);
      }
    };

    // When there's an error with the connection
    this.socket.onerror = event => {
      logger.error('Play-by-play WebSocket connection error', event);
    };

    // When the connection closes
    this.socket.onclose = event => {
      logger.info(
        `Play-by-play WebSocket disconnected for game ${gameId} (code: ${event.code}, reason: ${event.reason || 'none'})`,
      );

      // Clear the socket reference
      this.socket = null;

      if (this.shouldReconnect && this.currentGameId && event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Subscribe to play-by-play updates.
   * Your callback function will be called whenever new plays happen.
   *
   * @param callback - Function to call with new play-by-play data
   */
  subscribe(callback: (data: PlayByPlayResponse) => void) {
    this.listeners.add(callback);
  }

  /**
   * Unsubscribe from play-by-play updates.
   *
   * @param callback - The callback function to remove
   */
  unsubscribe(callback: (data: PlayByPlayResponse) => void) {
    this.listeners.delete(callback);
  }

  /**
   * Disconnect from the WebSocket server.
   * This stops automatic reconnection attempts.
   */
  disconnect() {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.currentGameId = null;
  }
}

export default PlayByPlayWebSocketService;
