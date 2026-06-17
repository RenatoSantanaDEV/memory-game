'use strict';

const { ServerMemoryGame } = require('./gameLogic');
const { db, stmts } = require('./db');

// roomCode → { game: ServerMemoryGame, createdAt: number, startedAt: number|null }
const rooms = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

// ── Transação atômica: persiste todas as 6 tabelas de jogo ───────────────────
const _persistTx = db.transaction((roomCode) => {
  const room = rooms.get(roomCode);
  if (!room) return;
  const { game, createdAt, startedAt } = room;
  const now = Date.now();

  // 1. rooms
  stmts.upsertRoom.run({
    roomCode, phase: game.phase,
    createdAt, startedAt: startedAt || null, updatedAt: now,
  });

  // 2. players
  for (const p of game.players) {
    stmts.upsertPlayer.run({
      roomCode, playerIndex: p.playerIndex, socketId: p.id,
      name: p.name, score: p.score, attempts: p.attempts,
      isConnected: p.isConnected ? 1 : 0,
    });
  }

  // 3. cards (só existem após o segundo jogador entrar)
  for (const c of game.cards) {
    stmts.upsertCard.run({
      roomCode, cardId: c.id, symbol: c.symbol, pairId: c.pairId,
      isFlipped: c.isFlipped ? 1 : 0, isMatched: c.isMatched ? 1 : 0,
    });
  }

  // 4. game_state
  stmts.upsertGameState.run({
    roomCode,
    currentPlayerIndex: game.currentPlayerIndex,
    isLocked:           game.isLocked ? 1 : 0,
    matchCount:         game.matchCount,
    isOver:             game.isOver ? 1 : 0,
    flippedCardIds:     JSON.stringify(game.flippedCards.map(c => c.id)),
    restartVoteIds:     JSON.stringify([...game.restartVotes]),
  });

  // 5. match_history — append-only; detecta restart pela comparação de tamanho
  const { c: savedMatchCount } = stmts.getMatchCount.get(roomCode);
  const isRestart = game.matchHistory.length < savedMatchCount;
  if (isRestart) {
    stmts.deleteMatchHistory.run(roomCode);
    stmts.deleteEventLog.run(roomCode);
  }
  const newMatches = game.matchHistory.slice(isRestart ? 0 : savedMatchCount);
  for (const m of newMatches) {
    stmts.insertMatch.run({
      roomCode, matchNumber: m.matchNumber, playerIndex: m.playerIndex,
      playerName: m.playerName, symbol: m.symbol, matchedAt: now,
    });
  }

  // 6. event_log — append-only; idem ao match_history
  const savedEventCount = isRestart ? 0 : stmts.getEventCount.get(roomCode).c;
  const newEvents = game.eventLog.slice(savedEventCount);
  for (const e of newEvents) {
    stmts.insertEvent.run({ roomCode, sequence: e.id, message: e.message });
  }
});

function persistRoom(roomCode) {
  try {
    _persistTx(roomCode);
  } catch (e) {
    console.error(`[db] Erro ao persistir sala ${roomCode}:`, e.message);
  }
}

// ── Restaura salas ativas do banco na inicialização ──────────────────────────
function loadRoomsFromDB() {
  const roomRows = stmts.getActiveRooms.all();
  for (const row of roomRows) {
    try {
      const players     = stmts.getPlayers.all(row.room_code);
      const cards       = stmts.getCards.all(row.room_code);
      const state       = stmts.getGameState.get(row.room_code);
      const matchHist   = stmts.getMatchHistory.all(row.room_code);
      const eventLog    = stmts.getEventLog.all(row.room_code);

      const game = ServerMemoryGame.fromNormalized({
        phase: row.phase, players, cards, state,
        matchHistory: matchHist, eventLog,
      });

      rooms.set(row.room_code, {
        game, createdAt: row.created_at, startedAt: row.started_at || null,
      });

      // Sincroniza isConnected:false de volta ao banco
      persistRoom(row.room_code);
    } catch (e) {
      console.error(`[db] Falha ao restaurar sala ${row.room_code}:`, e.message);
    }
  }
  if (roomRows.length > 0) {
    console.log(`[db] ${roomRows.length} sala(s) restaurada(s).`);
  }
}

loadRoomsFromDB();

// ── Salva resultado permanente de partida finalizada ─────────────────────────
function saveGameResult(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.game.players.length < 2) return;
  const { game, startedAt } = room;
  const [p1, p2] = game.players;
  const winner = game.getWinner();
  stmts.insertResult.run({
    roomCode,
    player1Name:     p1.name,
    player1Score:    p1.score,
    player1Attempts: p1.attempts,
    player2Name:     p2.name,
    player2Score:    p2.score,
    player2Attempts: p2.attempts,
    winnerName:      winner ? winner.name : null,
    totalPairs:      game.matchCount,
    durationSeconds: startedAt ? Math.floor((Date.now() - startedAt) / 1000) : null,
    playedAt:        Date.now(),
  });
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
function createRoom(socketId, playerName) {
  const roomCode = generateRoomCode();
  const game = new ServerMemoryGame();
  game.addPlayer(socketId, playerName);
  const now = Date.now();
  rooms.set(roomCode, { game, createdAt: now, startedAt: null });
  persistRoom(roomCode);
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
    if (room.game.phase === 'playing') room.startedAt = Date.now();
  }

  persistRoom(roomCode);
  return { game: room.game };
}

function rejoinRoom(roomCode, playerIndex, newSocketId) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'room-not-found' };
  const success = room.game.rejoin(playerIndex, newSocketId);
  if (!success) return { error: 'invalid-player' };
  persistRoom(roomCode);
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

function deleteRoom(roomCode) {
  rooms.delete(roomCode);
  stmts.deleteRoom.run(roomCode); // CASCADE apaga players, cards, game_state, history, events
}

function listRooms() {
  return [...rooms.entries()].map(([code, room]) => ({
    roomCode:   code,
    phase:      room.game.phase,
    players:    room.game.players.map(p => ({
      name: p.name, score: p.score, attempts: p.attempts, isConnected: p.isConnected,
    })),
    matchCount: room.game.matchCount,
    createdAt:  new Date(room.createdAt).toISOString(),
    startedAt:  room.startedAt ? new Date(room.startedAt).toISOString() : null,
  }));
}

function getHistory() {
  return stmts.getAllResults.all().map(r => ({
    id:              r.id,
    roomCode:        r.room_code,
    players: [
      { name: r.player1_name, score: r.player1_score, attempts: r.player1_attempts },
      { name: r.player2_name, score: r.player2_score, attempts: r.player2_attempts },
    ],
    winner:          r.winner_name || null,
    totalPairs:      r.total_pairs,
    durationSeconds: r.duration_seconds,
    playedAt:        new Date(r.played_at).toISOString(),
  }));
}

function cleanupStaleRooms() {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > TWO_HOURS) deleteRoom(code);
  }
}

setInterval(cleanupStaleRooms, 30 * 60 * 1000);

module.exports = {
  createRoom, joinRoom, rejoinRoom,
  getRoom, getRoomBySocket, deleteRoom,
  listRooms, getHistory, persistRoom, saveGameResult,
};
