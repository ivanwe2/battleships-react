import { store } from '../redux/store';
import { setConnectionStatus } from '../redux/slices/webSocketSlice';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.REACT_APP_WS_SERVER_URL;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = this.handleOpen.bind(this);
    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onerror = this.handleError.bind(this);
    this.socket.onclose = this.handleClose.bind(this);

    return this.socket;
  }

  handleOpen() {
    console.log('WebSocket connection established');
    this.reconnectAttempts = 0;
    store.dispatch(setConnectionStatus('connected'));
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const { type } = data;
      
      if (this.messageHandlers.has(type)) {
        this.messageHandlers.get(type).forEach(handler => handler(data));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    store.dispatch(setConnectionStatus('error'));
  }

  handleClose() {
    console.log('WebSocket connection closed');
    store.dispatch(setConnectionStatus('disconnected'));
    
    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, 1000 * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
    }
  }

  addMessageHandler(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type).add(handler);
  }

  removeMessageHandler(type, handler) {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).delete(handler);
    }
  }

  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }

  disconnect() {
    clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageHandlers.clear();
  }
}

// Singleton instance
const websocketService = new WebSocketService();

export default websocketService;