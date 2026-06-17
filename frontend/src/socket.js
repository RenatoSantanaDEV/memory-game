import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
