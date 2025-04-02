import { PlayByPlayResponse } from "../types/playbyplay";

class PlayByPlayWebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<(data: PlayByPlayResponse) => void> = new Set();
  private shouldReconnect = true;

  connect(gameId: string) {
    if (this.socket) return; // Prevent duplicate connections

    this.shouldReconnect = true;
    const url = `ws://127.0.0.1:8000/api/v1/ws/${gameId}/play-by-play`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("Play-by-Play WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      try {
        const data: PlayByPlayResponse = JSON.parse(event.data);
        this.listeners.forEach((callback) => callback(data));
      } catch (error) {
        console.error("Error parsing Play-by-Play WebSocket message:", error);
      }
    };

    this.socket.onerror = (event) => {
      console.error("Play-by-Play WebSocket error:", event);
    };

    this.socket.onclose = () => {
      console.log("Play-by-Play WebSocket disconnected");

      if (this.shouldReconnect) {
        console.log("Reconnecting Play-by-Play in 5 seconds...");
        setTimeout(() => this.connect(gameId), 5000);
      }
    };
  }

  subscribe(callback: (data: PlayByPlayResponse) => void) {
    this.listeners.add(callback);
  }

  unsubscribe(callback: (data: PlayByPlayResponse) => void) {
    this.listeners.delete(callback);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default PlayByPlayWebSocketService;
