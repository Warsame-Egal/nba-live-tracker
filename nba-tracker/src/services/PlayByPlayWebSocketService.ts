import { PlayByPlayResponse } from '../types/playbyplay';
import { logger } from '../utils/logger';

/**
 * Service for managing WebSocket connections to get live play-by-play updates.
 * This connects to the backend WebSocket for a specific game and sends
 * play-by-play events (shots, fouls, etc.) to subscribers.
 */
class PlayByPlayWebSocketService {
  // The WebSocket connection
  private socket: WebSocket | null = null;
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
    // Don't connect if we're already connected
    if (this.socket) return;

    this.shouldReconnect = true;
    
    // Build the WebSocket URL based on whether we're using https or http
    // Use 'wss' for secure connections (https) and 'ws' for regular (http)
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const baseHost = import.meta.env.VITE_WS_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    const url = `${protocol}://${baseHost}/api/v1/ws/${gameId}/play-by-play`;

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
    this.socket.onclose = () => {
      logger.info(`Play-by-play WebSocket disconnected for game ${gameId}`);

      // Try to reconnect after 5 seconds if we should reconnect
      if (this.shouldReconnect) {
        logger.info('Reconnecting play-by-play in 5 seconds...');
        setTimeout(() => this.connect(gameId), 5000);
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
  }
}

export default PlayByPlayWebSocketService;
