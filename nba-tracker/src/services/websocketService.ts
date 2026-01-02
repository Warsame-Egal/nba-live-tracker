import { ScoreboardResponse } from '../types/scoreboard';
import { logger } from '../utils/logger';

/**
 * Service for managing WebSocket connections to get live scoreboard updates.
 * This connects to the backend WebSocket and sends score updates to all subscribers.
 */
class WebSocketService {
  // The WebSocket connection
  private socket: WebSocket | null = null;
  // The WebSocket URL (stored for reconnection)
  private url: string | null = null;
  // List of functions to call when we get new score updates
  private listeners: Set<(data: ScoreboardResponse) => void> = new Set();
  // Whether to automatically reconnect if connection is lost
  private shouldReconnect = true;

  /**
   * Connect to the WebSocket server for live score updates.
   * 
   * @param url - The WebSocket URL to connect to
   */
  connect(url: string) {
    // Don't connect if we're already connected to the same URL and the socket is open
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.url === url) {
      return;
    }

    // If connecting to a different URL, disconnect first
    if (this.socket && this.url !== url) {
      this.disconnect();
    }

    // Clean up existing connection if it exists but is not open
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.shouldReconnect = true;
    this.url = url; // Store URL for reconnection
    this.socket = new WebSocket(url);

    // When connection opens successfully
    this.socket.onopen = () => {
      logger.info('WebSocket connected for scoreboard updates');
    };

    // When we receive a message from the server
    this.socket.onmessage = event => {
      try {
        // Parse the JSON data
        const data = JSON.parse(event.data);
        
        // Check if this is an insights message (has type field)
        if (data.type === 'insights') {
          console.log('[WebSocket] Received insights message:', data);
          // Dispatch as custom event for insights handling with the parsed data
          window.dispatchEvent(new CustomEvent('websocket-insights', { detail: data }));
          return;
        }
        
        // Check if this is a key moments message
        // Key moments are automatically detected important plays like game-tying shots,
        // lead changes, scoring runs, clutch plays, and big shots
        if (data.type === 'key_moments') {
          console.log('[WebSocket] Received key moments message:', data);
          // Dispatch as custom event so the Scoreboard component can handle it
          window.dispatchEvent(new CustomEvent('websocket-key-moments', { detail: data }));
          return;
        }
        
        // Otherwise, treat as scoreboard data
        const scoreboardData: ScoreboardResponse = data;
        this.listeners.forEach(callback => callback(scoreboardData));
      } catch (error) {
        logger.error('Error parsing WebSocket message', error);
        console.error('[WebSocket] Error parsing message:', error, event.data);
      }
    };

    // When there's an error with the connection
    this.socket.onerror = event => {
      logger.error('WebSocket connection error', event);
    };

    // When the connection closes
    this.socket.onclose = (event) => {
      logger.info(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
      
      // Clear the socket reference
      this.socket = null;

      // Only reconnect if it wasn't a normal closure (code 1000) or intentional disconnect
      // Try to reconnect after 5 seconds if we should reconnect and have a URL
      if (this.shouldReconnect && this.url && event.code !== 1000) {
        logger.info('Reconnecting in 5 seconds...');
        setTimeout(() => {
          if (this.shouldReconnect && this.url && !this.socket) {
            this.connect(this.url);
          }
        }, 5000);
      }
    };
  }

  /**
   * Subscribe to scoreboard updates.
   * Your callback function will be called whenever new scores come in.
   * 
   * @param callback - Function to call with new scoreboard data
   */
  subscribe(callback: (data: ScoreboardResponse) => void) {
    this.listeners.add(callback);
  }

  /**
   * Unsubscribe from scoreboard updates.
   * 
   * @param callback - The callback function to remove
   */
  unsubscribe(callback: (data: ScoreboardResponse) => void) {
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
    this.url = null; // Clear stored URL
  }
}

// Export a single instance that the whole app uses
export default new WebSocketService();
