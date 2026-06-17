'use strict';

const { ServerMemoryGame } = require('./gameLogic');

// roomCode → { game: ServerMemoryGame, createdAt: number }
const rooms = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I (ambíguos)

function generateRoomCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(socketId, playerName) {
  const roomCode = generateRoomCode();
  const game = new ServerMemoryGame();
  game.addPlayer(socketId, playerName);
  rooms.set(roomCode, { game, createdAt: Date.now() });
  return { roomCode, game };
}

function joinRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'room-not-found' };

  const alreadyIn = room.game.players.some(p => p.id === socketId);
  if (room.game.players.length >= 2 && !alreadyIn) return { error: 'room-full' };

  if (!alreadyIn) {
    const success = room.game.addPlayer(socketId, playerName);
    if (!success) return { error: 'room-full' };
  }
  return { game: room.game };
}

function rejoinRoom(roomCode, playerIndex, newSocketId) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'room-not-found' };
  const success = room.game.rejoin(playerIndex, newSocketId);
  if (!success) return { error: 'invalid-player' };
  return { game: room.game };
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function getRoomBySocket(socketId) {
  for (const [code, room] of rooms) {
    if (room.game.players.some(p => p.id === socketId)) {
      return { roomCode: code, game: room.game };
    }
  }
  return null;
}

function cleanupStaleRooms() {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > TWO_HOURS) rooms.delete(code);
  }
}

setInterval(cleanupStaleRooms, 30 * 60 * 1000);

module.exports = { createRoom, joinRoom, rejoinRoom, getRoom, getRoomBySocket };
