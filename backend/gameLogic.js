'use strict';

const SYMBOLS = ['👑','💎','🦁','⭐','🍄','🌺','🐬','🧪','🌙','🔥','🦊','🦋','🎩','🔮','🐉','🏆'];
const TOTAL_PAIRS = 10;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

class ServerCard {
  constructor(id, symbol, pairId) {
    this.id = id;
    this.symbol = symbol;
    this.pairId = pairId;
    this.isFlipped = false;
    this.isMatched = false;
  }

  toJSON() {
    return {
      id: this.id,
      symbol: (this.isFlipped || this.isMatched) ? this.symbol : null,
      isFlipped: this.isFlipped,
      isMatched: this.isMatched,
    };
  }
}

class ServerPlayer {
  constructor(socketId, name, playerIndex) {
    this.id = socketId;
    this.name = name;
    this.score = 0;
    this.attempts = 0;
    this.playerIndex = playerIndex;
    this.isConnected = true;
  }
}

class ServerMemoryGame {
  constructor() {
    this.players = [];
    this.cards = [];
    this.flippedCards = [];
    this.currentPlayerIndex = 0;
    this.matchCount = 0;
    this.isLocked = false;
    this.isOver = false;
    this.matchHistory = [];
    this.eventLog = [];
    this.phase = 'waiting';
    this.restartVotes = new Set(); // socket IDs que votaram por revanche
  }

  addPlayer(socketId, name) {
    if (this.players.length >= 2) return false;
    this.players.push(new ServerPlayer(socketId, name, this.players.length));
    if (this.players.length === 2) {
      this.phase = 'playing';
      this._initCards();
      this._log(`Jogo iniciado! Vez de ${this.players[0].name}.`);
    }
    return true;
  }

  _initCards() {
    const symbols = SYMBOLS.slice(0, TOTAL_PAIRS);
    const pairs = [...symbols, ...symbols];
    shuffle(pairs);
    this.cards = pairs.map((sym, idx) => new ServerCard(idx, sym, symbols.indexOf(sym)));
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  attemptFlip(socketId, cardId) {
    if (this.phase !== 'playing') return { error: 'game-not-active' };
    if (this.isLocked) return { error: 'board-locked' };
    if (!this.currentPlayer || this.currentPlayer.id !== socketId) return { error: 'not-your-turn' };

    const card = this.cards[cardId];
    if (!card || card.isFlipped || card.isMatched) return { error: 'invalid-card' };

    card.isFlipped = true;
    this.flippedCards.push(card);

    if (this.flippedCards.length === 1) {
      return { action: 'first' };
    }

    // Segunda carta virada
    this.isLocked = true;
    this.currentPlayer.attempts++;

    const [c1, c2] = this.flippedCards;
    const isMatch = c1.pairId === c2.pairId;

    if (isMatch) {
      c1.isMatched = true;
      c1.isFlipped = true;
      c2.isMatched = true;
      c2.isFlipped = true;
      this.currentPlayer.score++;
      this.matchCount++;

      const matchEntry = {
        matchNumber: this.matchHistory.length + 1,
        playerName: this.currentPlayer.name,
        playerId: this.currentPlayer.id,
        playerIndex: this.currentPlayer.playerIndex,
        symbol: c1.symbol,
      };
      this.matchHistory.push(matchEntry);
      this._log(`✓ ${this.currentPlayer.name} acertou o par ${c1.symbol}!`);
      this.flippedCards = [];
      this.isLocked = false;

      if (this.matchCount === TOTAL_PAIRS) {
        this.phase = 'over';
        this.isOver = true;
        return { action: 'game-over', matchEntry };
      }
      return { action: 'match', matchEntry };
    }

    // Sem par — tabuleiro bloqueado até o cliente enviar resolve-no-match
    this._log(`✗ ${this.currentPlayer.name} errou (${c1.symbol} ≠ ${c2.symbol})`);
    return {
      action: 'no-match',
      mismatchCardIds: [c1.id, c2.id],
    };
  }

  resolveNoMatch(socketId) {
    if (!this.currentPlayer || this.currentPlayer.id !== socketId) return { error: 'not-your-turn' };
    if (!this.isLocked || this.flippedCards.length !== 2) return { error: 'nothing-to-resolve' };

    const [c1, c2] = this.flippedCards;
    c1.isFlipped = false;
    c2.isFlipped = false;
    this.flippedCards = [];
    this.isLocked = false;
    this._switchPlayer();
    return { action: 'resolved' };
  }

  voteRestart(socketId) {
    if (this.phase !== 'over') return { error: 'game-not-over' };
    if (!this.players.some(p => p.id === socketId)) return { error: 'not-a-player' };
    this.restartVotes.add(socketId);
    const allVoted = this.restartVotes.size >= 2;
    if (allVoted) this.restart();
    return { allVoted };
  }

  restart() {
    this.players.forEach(p => { p.score = 0; p.attempts = 0; });
    this.cards = [];
    this.flippedCards = [];
    this.currentPlayerIndex = 0;
    this.matchCount = 0;
    this.isLocked = false;
    this.isOver = false;
    this.matchHistory = [];
    this.eventLog = [];
    this.restartVotes = new Set();
    this.phase = 'playing';
    this._initCards();
    this._log(`Nova partida! Vez de ${this.players[0].name}.`);
  }

  getWinner() {
    if (!this.isOver) return null;
    const [p1, p2] = this.players;
    if (p1.score > p2.score) return p1;
    if (p2.score > p1.score) return p2;
    return null; // empate
  }

  getRemainingSymbols() {
    const seen = new Set();
    return this.cards
      .filter(c => {
        if (!c.isMatched && !seen.has(c.symbol)) {
          seen.add(c.symbol);
          return true;
        }
        return false;
      })
      .map(c => c.symbol);
  }

  handleDisconnect(socketId) {
    const player = this.players.find(p => p.id === socketId);
    if (player) player.isConnected = false;
  }

  rejoin(playerIndex, newSocketId) {
    const player = this.players[playerIndex];
    if (!player) return false;
    player.id = newSocketId;
    player.isConnected = true;
    // Se era a vez do jogador que reconectou e o tabuleiro está bloqueado num no-match,
    // o estado já está correto — o cliente vai re-emitir resolve-no-match se necessário.
    return true;
  }

  toClientState(roomCode) {
    const winner = this.getWinner();
    return {
      roomCode,
      phase: this.phase,
      cards: this.cards.map(c => c.toJSON()),
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        attempts: p.attempts,
        playerIndex: p.playerIndex,
        isConnected: p.isConnected,
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      flippedCardIds: this.flippedCards.map(c => c.id),
      isLocked: this.isLocked,
      matchHistory: this.matchHistory,
      eventLog: this.eventLog,
      winner: winner ? { id: winner.id, name: winner.name, score: winner.score, playerIndex: winner.playerIndex } : null,
      remainingSymbols: this.getRemainingSymbols(),
      restartVoteCount: this.restartVotes.size,
      restartVotedIds: [...this.restartVotes],
    };
  }

  static fromNormalized({ phase, players, cards, state, matchHistory, eventLog }) {
    const game = new ServerMemoryGame();
    game.phase = phase;

    game.players = players.map(p => {
      const player = new ServerPlayer(p.socket_id || '', p.name, p.player_index);
      player.score    = p.score;
      player.attempts = p.attempts;
      player.isConnected = false; // sempre desconectado ao restaurar
      return player;
    });

    game.cards = cards.map(c => {
      const card = new ServerCard(c.card_id, c.symbol, c.pair_id);
      card.isFlipped = !!c.is_flipped;
      card.isMatched = !!c.is_matched;
      return card;
    });

    if (state) {
      game.currentPlayerIndex = state.current_player_index;
      game.isLocked           = !!state.is_locked;
      game.isOver             = !!state.is_over;
      game.matchCount         = state.match_count;
      game.restartVotes       = new Set(JSON.parse(state.restart_vote_ids || '[]'));
      game.flippedCards       = JSON.parse(state.flipped_card_ids || '[]')
        .map(id => game.cards.find(c => c.id === id))
        .filter(Boolean);
    }

    game.matchHistory = matchHistory.map(m => ({
      matchNumber: m.match_number,
      playerName:  m.player_name,
      playerId:    null, // socket IDs são transitórios
      playerIndex: m.player_index,
      symbol:      m.symbol,
    }));

    game.eventLog = eventLog.map(e => ({
      id:      e.sequence,
      message: e.message,
    }));

    return game;
  }

  _switchPlayer() {
    this.currentPlayerIndex = this.currentPlayerIndex === 0 ? 1 : 0;
    this._log(`Vez de ${this.currentPlayer.name}.`);
  }

  _log(message) {
    this.eventLog.push({ id: this.eventLog.length + 1, message });
  }
}

module.exports = { ServerMemoryGame };
