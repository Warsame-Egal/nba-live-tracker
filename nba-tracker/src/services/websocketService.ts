import { ScoreboardResponse } from "../types/scoreboard";

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<(data: ScoreboardResponse) => void> = new Set();
  private shouldReconnect = true;

  connect(url: string) {
    if (this.socket) return;

    this.shouldReconnect = true;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      try {
        const data: ScoreboardResponse = JSON.parse(event.data);
        this.listeners.forEach((callback) => callback(data));
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.socket.onerror = (event) => {
      console.error("WebSocket error:", event);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");

      if (this.shouldReconnect) {
        console.log("Reconnecting in 5 seconds...");
        setTimeout(() => this.connect(url), 5000);
      }
    };
  }

  subscribe(callback: (data: ScoreboardResponse) => void) {
    this.listeners.add(callback);
  }

  unsubscribe(callback: (data: ScoreboardResponse) => void) {
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

export default new WebSocketService();
