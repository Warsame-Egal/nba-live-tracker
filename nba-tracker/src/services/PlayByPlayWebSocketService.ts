import { PlayByPlayResponse } from '../types/playbyplay';
import { logger } from '../utils/logger';
import { getWebSocketUrl } from '../utils/apiConfig';

/**
 * Service for managing WebSocket connections to get live play-by-play updates.
 * This connects to the backend WebSocket for a specific game and sends
 * play-by-play events (shots, fouls, etc.) to subscribers.
 */
class PlayByPlayWebSocketService {
  // The WebSocket connection
  private socket: WebSocket | null = null;
  // The current game ID (stored for reconnection)
  private currentGameId: string | null = null;
  // List of functions to call when we get new play-by-play updates
  private listeners: Set<(data: PlayByPlayResponse) => void> = new Set();
  // Whether to automatically reconnect if connection is lost
  private shouldReconnect = true;

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

    // When connection opens successfully
    this.socket.onopen = () => {
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
    this.socket.onclose = (event) => {
      logger.info(`Play-by-play WebSocket disconnected for game ${gameId} (code: ${event.code}, reason: ${event.reason || 'none'})`);
      
      // Clear the socket reference
      this.socket = null;

      // Only reconnect if it wasn't a normal closure (code 1000) or intentional disconnect
      // Try to reconnect after 5 seconds if we should reconnect and have a game ID
      if (this.shouldReconnect && this.currentGameId && event.code !== 1000) {
        logger.info('Reconnecting play-by-play in 5 seconds...');
        setTimeout(() => {
          if (this.shouldReconnect && this.currentGameId && !this.socket) {
            this.connect(this.currentGameId);
          }
        }, 5000);
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
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.currentGameId = null; // Clear stored game ID
  }
}

export default PlayByPlayWebSocketService;
