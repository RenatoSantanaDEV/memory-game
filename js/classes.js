/* ============================================================
   CLASSES.JS — Game model (pure logic, no DOM)
   ============================================================ */

'use strict';

/* ----------------------------------------------------------
   Card
   Represents a single card on the board.
   ---------------------------------------------------------- */
class Card {
    /**
     * @param {number} id      - Unique index on the board (0 … n-1)
     * @param {string} symbol  - Emoji/character displayed when face-up
     * @param {number} pairId  - Shared ID between the two matching cards
     */
    constructor(id, symbol, pairId) {
        this.id        = id;
        this.symbol    = symbol;
        this.pairId    = pairId;
        this.isFlipped = false;
        this.isMatched = false;
    }

    /** Turn the card face-up (not permanently). */
    flip() {
        this.isFlipped = true;
    }

    /** Turn the card face-down again (after a failed attempt). */
    unflip() {
        this.isFlipped = false;
    }

    /** Mark the card as permanently matched. */
    match() {
        this.isMatched = true;
        this.isFlipped = true;
    }
}

/* ----------------------------------------------------------
   Player
   Represents one human player.
   ---------------------------------------------------------- */
class Player {
    /**
     * @param {number} id   - 1 or 2
     * @param {string} name - Display name
     */
    constructor(id, name) {
        this.id       = id;
        this.name     = name;
        this.score    = 0;   // number of matched pairs
        this.attempts = 0;   // number of turns taken
    }

    /** Called every time the player reveals their second card. */
    recordAttempt() {
        this.attempts++;
    }

    /** Called when the player successfully finds a pair. */
    addPair() {
        this.score++;
    }

    /** Resets stats for a new game. */
    reset() {
        this.score    = 0;
        this.attempts = 0;
    }
}

/* ----------------------------------------------------------
   MemoryGame
   Central game model.  Holds all state and exposes the
   minimal public API that game.js calls.
   ---------------------------------------------------------- */
class MemoryGame {

    static SYMBOLS = [
        '🦁', '🦊', '🐸', '🐬',
        '🦋', '🌺', '⭐', '🍄',
        '🎩', '🔮', '🎸', '🦚',
        '🍉', '🐉', '🏆', '🎭'
    ];

    static TOTAL_PAIRS = 8;  // → 16 cards on the board

    /**
     * @param {string} name1 - Player 1 name
     * @param {string} name2 - Player 2 name
     */
    constructor(name1, name2) {
        this.players     = [ new Player(1, name1), new Player(2, name2) ];
        this.cards       = [];
        this.flippedCards = [];
        this.currentIdx  = 0;   // index into this.players
        this.matchCount  = 0;
        this.isLocked    = false;
        this.isOver      = false;
        this.matchHistory = [];  // { number, playerName, playerId, symbol }
        this.eventLog     = [];  // { id, message }
    }

    /* ---------- Accessors ---------- */

    get currentPlayer() {
        return this.players[this.currentIdx];
    }

    /* ---------- Setup ---------- */

    /**
     * Shuffles symbols into pairs, creates Card instances, and logs
     * the opening message.
     * @returns {Card[]} the array of cards (in board order)
     */
    initialize() {
        const symbols  = MemoryGame.SYMBOLS.slice(0, MemoryGame.TOTAL_PAIRS);
        const pairs    = [...symbols, ...symbols];
        MemoryGame._shuffle(pairs);

        this.cards = pairs.map((sym, idx) => {
            const pairId = symbols.indexOf(sym);
            return new Card(idx, sym, pairId);
        });

        this._log(`Jogo iniciado! Vez de ${this.currentPlayer.name}.`);
        return this.cards;
    }

    /** Fisher-Yates in-place shuffle. */
    static _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    /* ---------- Core turn logic ---------- */

    /**
     * Attempt to flip card at index `cardId`.
     *
     * Returns an action descriptor object:
     *   { action: 'locked' | 'invalid' | 'first' | 'match' | 'no-match' | 'game-over',
     *     card,          ← the flipped card (when applicable)
     *     matchEntry,    ← filled on 'match' / 'game-over'
     *     mismatchCards  ← [Card, Card] on 'no-match'
     *   }
     */
    attemptFlip(cardId) {
        if (this.isLocked)  return { action: 'locked' };

        const card = this.cards[cardId];
        if (!card || card.isFlipped || card.isMatched) return { action: 'invalid' };

        card.flip();
        this.flippedCards.push(card);

        /* First card of the turn — just show it. */
        if (this.flippedCards.length === 1) {
            return { action: 'first', card };
        }

        /* Second card — evaluate the pair. */
        this.isLocked = true;
        this.currentPlayer.recordAttempt();

        const [c1, c2] = this.flippedCards;
        const isMatch  = c1.pairId === c2.pairId;

        if (isMatch) {
            c1.match();
            c2.match();
            this.currentPlayer.addPair();
            this.matchCount++;

            const matchEntry = {
                number:     this.matchHistory.length + 1,
                playerName: this.currentPlayer.name,
                playerId:   this.currentPlayer.id,
                symbol:     c1.symbol
            };
            this.matchHistory.push(matchEntry);
            this._log(`✓ ${this.currentPlayer.name} acertou o par ${c1.symbol}!`);

            this.flippedCards = [];
            this.isLocked     = false;

            if (this.matchCount === MemoryGame.TOTAL_PAIRS) {
                this.isOver = true;
                return { action: 'game-over', card, matchEntry };
            }

            return { action: 'match', card, matchEntry };
        }

        /* No match — cards will be hidden after a short delay by game.js. */
        this._log(`✗ ${this.currentPlayer.name} errou (${c1.symbol} ≠ ${c2.symbol})`);
        return { action: 'no-match', card, mismatchCards: [c1, c2] };
    }

    /**
     * Called by game.js after the "no-match" animation delay.
     * Hides the two failed cards and passes the turn.
     */
    resolveNoMatch() {
        const [c1, c2] = this.flippedCards;
        c1.unflip();
        c2.unflip();
        this.flippedCards = [];
        this.isLocked     = false;
        this._switchPlayer();
    }

    /** Returns the winning Player, or null on a tie. */
    getWinner() {
        const [p1, p2] = this.players;
        if (p1.score > p2.score) return p1;
        if (p2.score > p1.score) return p2;
        return null;
    }

    /**
     * Returns the set of unmatched symbols still on the board.
     * @returns {string[]}
     */
    getRemainingSymbols() {
        const seen = new Set();
        const result = [];
        for (const card of this.cards) {
            if (!card.isMatched && !seen.has(card.symbol)) {
                seen.add(card.symbol);
                result.push(card.symbol);
            }
        }
        return result;
    }

    /**
     * Resets everything and starts a fresh round with the same players.
     * @returns {Card[]} new shuffled card array
     */
    restart() {
        this.players.forEach(p => p.reset());
        this.cards        = [];
        this.flippedCards = [];
        this.currentIdx   = 0;
        this.matchCount   = 0;
        this.isLocked     = false;
        this.isOver       = false;
        this.matchHistory = [];
        this.eventLog     = [];
        return this.initialize();
    }

    /* ---------- Private helpers ---------- */

    _switchPlayer() {
        this.currentIdx = this.currentIdx === 0 ? 1 : 0;
        this._log(`Vez de ${this.currentPlayer.name}.`);
    }

    _log(message) {
        this.eventLog.push({ id: this.eventLog.length + 1, message });
    }
}
