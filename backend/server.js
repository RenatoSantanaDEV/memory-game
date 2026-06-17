'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, joinRoom, rejoinRoom, getRoom, getRoomBySocket } = require('./roomManager');

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

const ERROR_MESSAGES = {
  'not-your-turn':       'Não é sua vez.',
  'board-locked':        'O tabuleiro está bloqueado.',
  'invalid-card':        'Carta inválida.',
  'game-not-active':     'O jogo não está ativo.',
  'room-not-found':      'Sala não encontrada.',
  'room-full':           'Esta sala já está cheia.',
  'waiting-for-player':  'Aguardando o segundo jogador.',
  'invalid-player':      'Jogador inválido.',
  'nothing-to-resolve':  'Nada a resolver.',
};

function errMsg(code) {
  return ERROR_MESSAGES[code] || 'Erro desconhecido.';
}

io.on('connection', (socket) => {
  console.log(`[+] Conectado: ${socket.id}`);

  // ── CRIAR SALA ───────────────────────────────────────────────────────────────
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

  // ── ENTRAR NA SALA ───────────────────────────────────────────────────────────
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

  // ── RECONECTAR ───────────────────────────────────────────────────────────────
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

  // ── VIRAR CARTA ──────────────────────────────────────────────────────────────
  socket.on('flip-card', ({ roomCode, cardId }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { code: 'room-not-found', message: errMsg('room-not-found') });

    const { game } = room;
    const result = game.attemptFlip(socket.id, cardId);

    if (result.error) {
      return socket.emit('error', { code: result.error, message: errMsg(result.error) });
    }

    const state = game.toClientState(roomCode);
    io.to(roomCode).emit('game-state-update', { gameState: state, lastAction: result });
  });

  // ── RESOLVER SEM PAR ─────────────────────────────────────────────────────────
  socket.on('resolve-no-match', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    const { game } = room;
    const result = game.resolveNoMatch(socket.id);

    if (result.error) return; // ignora corrida (ex.: restart chegou antes)

    const state = game.toClientState(roomCode);
    io.to(roomCode).emit('game-state-update', {
      gameState: state,
      lastAction: { action: 'turn-changed' },
    });
  });

  // ── REINICIAR JOGO ───────────────────────────────────────────────────────────
  socket.on('restart-game', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { code: 'room-not-found', message: errMsg('room-not-found') });

    const { game } = room;
    if (game.players.length < 2) {
      return socket.emit('error', { code: 'waiting-for-player', message: errMsg('waiting-for-player') });
    }

    game.restart();
    const state = game.toClientState(roomCode);
    io.to(roomCode).emit('game-state-update', { gameState: state, lastAction: { action: 'restart' } });
    console.log(`[sala] Reiniciada: ${roomCode}`);
  });

  // ── DESCONEXÃO ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const found = getRoomBySocket(socket.id);
    if (!found) return;
    const { roomCode, game } = found;
    game.handleDisconnect(socket.id);
    const state = game.toClientState(roomCode);
    socket.to(roomCode).emit('player-disconnected', { socketId: socket.id, gameState: state });
    console.log(`[-] Desconectado: ${socket.id} (sala: ${roomCode})`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
