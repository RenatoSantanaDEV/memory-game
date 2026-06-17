'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'game.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Metadados da sala
  CREATE TABLE IF NOT EXISTS rooms (
    room_code  TEXT    PRIMARY KEY,
    phase      TEXT    NOT NULL DEFAULT 'waiting',
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    updated_at INTEGER NOT NULL
  );

  -- Um registro por jogador por sala
  CREATE TABLE IF NOT EXISTS players (
    room_code    TEXT    NOT NULL,
    player_index INTEGER NOT NULL,
    socket_id    TEXT,
    name         TEXT    NOT NULL,
    score        INTEGER NOT NULL DEFAULT 0,
    attempts     INTEGER NOT NULL DEFAULT 0,
    is_connected INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (room_code, player_index),
    FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE
  );

  -- Um registro por carta por sala
  CREATE TABLE IF NOT EXISTS cards (
    room_code  TEXT    NOT NULL,
    card_id    INTEGER NOT NULL,
    symbol     TEXT    NOT NULL,
    pair_id    INTEGER NOT NULL,
    is_flipped INTEGER NOT NULL DEFAULT 0,
    is_matched INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (room_code, card_id),
    FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE
  );

  -- Estado mutável do jogo (uma linha por sala)
  CREATE TABLE IF NOT EXISTS game_state (
    room_code            TEXT    PRIMARY KEY,
    current_player_index INTEGER NOT NULL DEFAULT 0,
    is_locked            INTEGER NOT NULL DEFAULT 0,
    match_count          INTEGER NOT NULL DEFAULT 0,
    is_over              INTEGER NOT NULL DEFAULT 0,
    flipped_card_ids     TEXT    NOT NULL DEFAULT '[]',
    restart_vote_ids     TEXT    NOT NULL DEFAULT '[]',
    FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE
  );

  -- Histórico de pares encontrados (append-only por partida)
  CREATE TABLE IF NOT EXISTS match_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code    TEXT    NOT NULL,
    match_number INTEGER NOT NULL,
    player_index INTEGER NOT NULL,
    player_name  TEXT    NOT NULL,
    symbol       TEXT    NOT NULL,
    matched_at   INTEGER NOT NULL,
    FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE
  );

  -- Log de eventos da partida (append-only por partida)
  CREATE TABLE IF NOT EXISTS event_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT    NOT NULL,
    sequence  INTEGER NOT NULL,
    message   TEXT    NOT NULL,
    FOREIGN KEY (room_code) REFERENCES rooms(room_code) ON DELETE CASCADE
  );

  -- Resultados permanentes de partidas finalizadas (nunca deletado com a sala)
  CREATE TABLE IF NOT EXISTS game_results (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code        TEXT    NOT NULL,
    player1_name     TEXT    NOT NULL,
    player1_score    INTEGER NOT NULL,
    player1_attempts INTEGER NOT NULL,
    player2_name     TEXT    NOT NULL,
    player2_score    INTEGER NOT NULL,
    player2_attempts INTEGER NOT NULL,
    winner_name      TEXT,
    total_pairs      INTEGER NOT NULL,
    duration_seconds INTEGER,
    played_at        INTEGER NOT NULL
  );
`);

const stmts = {
  // ── Rooms ───────────────────────────────────────────────────────────────────
  upsertRoom: db.prepare(`
    INSERT INTO rooms (room_code, phase, created_at, started_at, updated_at)
    VALUES (@roomCode, @phase, @createdAt, @startedAt, @updatedAt)
    ON CONFLICT(room_code) DO UPDATE SET
      phase      = excluded.phase,
      started_at = COALESCE(rooms.started_at, excluded.started_at),
      updated_at = excluded.updated_at
  `),
  deleteRoom:     db.prepare('DELETE FROM rooms WHERE room_code = ?'),
  getActiveRooms: db.prepare("SELECT * FROM rooms WHERE phase IN ('waiting','playing')"),

  // ── Players ─────────────────────────────────────────────────────────────────
  upsertPlayer: db.prepare(`
    INSERT INTO players (room_code, player_index, socket_id, name, score, attempts, is_connected)
    VALUES (@roomCode, @playerIndex, @socketId, @name, @score, @attempts, @isConnected)
    ON CONFLICT(room_code, player_index) DO UPDATE SET
      socket_id    = excluded.socket_id,
      score        = excluded.score,
      attempts     = excluded.attempts,
      is_connected = excluded.is_connected
  `),
  getPlayers: db.prepare('SELECT * FROM players WHERE room_code = ? ORDER BY player_index'),

  // ── Cards ───────────────────────────────────────────────────────────────────
  upsertCard: db.prepare(`
    INSERT INTO cards (room_code, card_id, symbol, pair_id, is_flipped, is_matched)
    VALUES (@roomCode, @cardId, @symbol, @pairId, @isFlipped, @isMatched)
    ON CONFLICT(room_code, card_id) DO UPDATE SET
      is_flipped = excluded.is_flipped,
      is_matched = excluded.is_matched
  `),
  getCards: db.prepare('SELECT * FROM cards WHERE room_code = ? ORDER BY card_id'),

  // ── Game state ──────────────────────────────────────────────────────────────
  upsertGameState: db.prepare(`
    INSERT INTO game_state
      (room_code, current_player_index, is_locked, match_count, is_over, flipped_card_ids, restart_vote_ids)
    VALUES
      (@roomCode, @currentPlayerIndex, @isLocked, @matchCount, @isOver, @flippedCardIds, @restartVoteIds)
    ON CONFLICT(room_code) DO UPDATE SET
      current_player_index = excluded.current_player_index,
      is_locked            = excluded.is_locked,
      match_count          = excluded.match_count,
      is_over              = excluded.is_over,
      flipped_card_ids     = excluded.flipped_card_ids,
      restart_vote_ids     = excluded.restart_vote_ids
  `),
  getGameState: db.prepare('SELECT * FROM game_state WHERE room_code = ?'),

  // ── Match history ────────────────────────────────────────────────────────────
  insertMatch: db.prepare(`
    INSERT INTO match_history (room_code, match_number, player_index, player_name, symbol, matched_at)
    VALUES (@roomCode, @matchNumber, @playerIndex, @playerName, @symbol, @matchedAt)
  `),
  getMatchHistory:    db.prepare('SELECT * FROM match_history WHERE room_code = ? ORDER BY match_number'),
  getMatchCount:      db.prepare('SELECT COUNT(*) as c FROM match_history WHERE room_code = ?'),
  deleteMatchHistory: db.prepare('DELETE FROM match_history WHERE room_code = ?'),

  // ── Event log ────────────────────────────────────────────────────────────────
  insertEvent: db.prepare(`
    INSERT INTO event_log (room_code, sequence, message) VALUES (@roomCode, @sequence, @message)
  `),
  getEventLog:    db.prepare('SELECT * FROM event_log WHERE room_code = ? ORDER BY sequence'),
  getEventCount:  db.prepare('SELECT COUNT(*) as c FROM event_log WHERE room_code = ?'),
  deleteEventLog: db.prepare('DELETE FROM event_log WHERE room_code = ?'),

  // ── Game results ─────────────────────────────────────────────────────────────
  insertResult: db.prepare(`
    INSERT INTO game_results
      (room_code, player1_name, player1_score, player1_attempts,
       player2_name, player2_score, player2_attempts,
       winner_name, total_pairs, duration_seconds, played_at)
    VALUES
      (@roomCode, @player1Name, @player1Score, @player1Attempts,
       @player2Name, @player2Score, @player2Attempts,
       @winnerName, @totalPairs, @durationSeconds, @playedAt)
  `),
  getAllResults: db.prepare('SELECT * FROM game_results ORDER BY played_at DESC LIMIT 100'),
};

module.exports = { db, stmts };
