'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
  createRoom, joinRoom, rejoinRoom,
  getRoom, getRoomBySocket, deleteRoom,
  listRooms, getHistory, persistRoom, saveGameResult,
} = require('./roomManager');

const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/debug/rooms', (_, res) => res.json(listRooms()));

app.get('/debug/history', (_, res) => res.json(getHistory()));

app.get('/debug/rooms/:code', (req, res) => {
  const room = getRoom(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Sala não encontrada.' });
  res.json(room.game.toClientState(req.params.code.toUpperCase()));
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

const ERROR_MESSAGES = {
  'not-your-turn':      'Não é sua vez.',
  'board-locked':       'O tabuleiro está bloqueado.',
  'invalid-card':       'Carta inválida.',
  'game-not-active':    'O jogo não está ativo.',
  'room-not-found':     'Sala não encontrada.',
  'room-full':          'Esta sala já está cheia.',
  'waiting-for-player': 'Aguardando o segundo jogador.',
  'invalid-player':     'Jogador inválido.',
  'nothing-to-resolve': 'Nada a resolver.',
};

function errMsg(code) {
  return ERROR_MESSAGES[code] || 'Erro desconhecido.';
}

io.on('connection', (socket) => {
  console.log(`[+] Conectado: ${socket.id}`);

  // ── CRIAR SALA ──────────────────────────────────────────────────────────────
  socket.on('create-room', ({ playerName }) => {
    if (!playerName?.trim()) {
      return socket.emit('error', { code: 'invalid-name', message: 'Nome inválido.' });
    }
    const { roomCode, game } = createRoom(socket.id, playerName.trim());
    socket.join(roomCode);
    socket.emit('room-created', {
      roomCode,
      yourSocketId: socket.id,
      gameState: game.toClientState(roomCode),
    });
    console.log(`[sala] Criada: ${roomCode} por ${playerName.trim()}`);
  });

  // ── ENTRAR NA SALA ──────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = roomCode?.trim().toUpperCase();
    if (!playerName?.trim() || !code) {
      return socket.emit('error', { code: 'invalid-input', message: 'Dados inválidos.' });
    }

    const result = joinRoom(code, socket.id, playerName.trim());
    if (result.error) {
      return socket.emit('error', { code: result.error, message: errMsg(result.error) });
    }

    socket.join(code);
    const { game } = result;
    const state = game.toClientState(code);

    socket.emit('player-joined', { yourSocketId: socket.id, gameState: state });

    if (game.phase === 'playing') {
      io.to(code).emit('game-started', { gameState: state });
    }

    console.log(`[sala] ${playerName.trim()} entrou: ${code}`);
  });

  // ── RECONECTAR ──────────────────────────────────────────────────────────────
  socket.on('rejoin-room', ({ roomCode, playerIndex }) => {
    const code = roomCode?.trim().toUpperCase();
    if (!code || playerIndex == null) return;

    const result = rejoinRoom(code, Number(playerIndex), socket.id);
    if (result.error) {
      return socket.emit('error', { code: result.error, message: errMsg(result.error) });
    }

    socket.join(code);
    const { game } = result;
    const state = game.toClientState(code);

    socket.emit('rejoined', { yourSocketId: socket.id, gameState: state });
    socket.to(code).emit('game-state-update', {
      gameState: state,
      lastAction: { action: 'player-reconnected' },
    });

    console.log(`[sala] Reconectou índice ${playerIndex} em: ${code}`);
  });

  // ── VIRAR CARTA ─────────────────────────────────────────────────────────────
  socket.on('flip-card', ({ roomCode, cardId }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { code: 'room-not-found', message: errMsg('room-not-found') });

    const { game } = room;
    const result = game.attemptFlip(socket.id, cardId);

    if (result.error) {
      return socket.emit('error', { code: result.error, message: errMsg(result.error) });
    }

    // Persiste e salva resultado antes de broadcast
    if (result.action === 'game-over') {
      saveGameResult(roomCode);
    }
    persistRoom(roomCode);

    const state = game.toClientState(roomCode);
    io.to(roomCode).emit('game-state-update', { gameState: state, lastAction: result });
  });

  // ── RESOLVER SEM PAR ────────────────────────────────────────────────────────
  socket.on('resolve-no-match', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    const { game } = room;
    const result = game.resolveNoMatch(socket.id);

    if (result.error) return;

    persistRoom(roomCode);

    const state = game.toClientState(roomCode);
    io.to(roomCode).emit('game-state-update', {
      gameState: state,
      lastAction: { action: 'turn-changed' },
    });
  });

  // ── VOTAR REVANCHE ──────────────────────────────────────────────────────────
  socket.on('vote-restart', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { code: 'room-not-found', message: errMsg('room-not-found') });

    const { game } = room;
    const result = game.voteRestart(socket.id);

    if (result.error) return socket.emit('error', { code: result.error, message: errMsg(result.error) });

    persistRoom(roomCode);

    const state = game.toClientState(roomCode);
    const action = result.allVoted ? 'restart' : 'restart-vote';
    io.to(roomCode).emit('game-state-update', { gameState: state, lastAction: { action } });

    if (result.allVoted) console.log(`[sala] Reiniciada por votação: ${roomCode}`);
  });

  // ── SAIR DA SALA (intencional) ──────────────────────────────────────────────
  socket.on('leave-room', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    const { game } = room;
    const leavingPlayer = game.players.find(p => p.id === socket.id);
    if (!leavingPlayer) return;

    socket.to(roomCode).emit('player-left', { playerName: leavingPlayer.name });
    socket.emit('left-room');
    socket.leave(roomCode);
    deleteRoom(roomCode);

    console.log(`[sala] ${leavingPlayer.name} saiu de: ${roomCode}`);
  });

  // ── DESCONEXÃO ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const found = getRoomBySocket(socket.id);
    if (!found) return;
    const { roomCode, game } = found;
    game.handleDisconnect(socket.id);
    persistRoom(roomCode);
    const state = game.toClientState(roomCode);
    socket.to(roomCode).emit('player-disconnected', { socketId: socket.id, gameState: state });
    console.log(`[-] Desconectado: ${socket.id} (sala: ${roomCode})`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
