import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token: getAccessToken() },
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function reconnectSocket() {
  disconnectSocket();
  return connectSocket();
}
