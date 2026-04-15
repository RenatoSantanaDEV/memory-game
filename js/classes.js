'use strict';

class Card {
    constructor(id, symbol, pairId) {
        this.id        = id;
        this.symbol    = symbol;
        this.pairId    = pairId;
        this.isFlipped = false;
        this.isMatched = false;
    }

    flip() {
        this.isFlipped = true;
    }

    unflip() {
        this.isFlipped = false;
    }

    match() {
        this.isMatched = true;
        this.isFlipped = true;
    }
}

class Player {
    constructor(id, name) {
        this.id       = id;
        this.name     = name;
        this.score    = 0;
        this.attempts = 0;
    }

    recordAttempt() {
        this.attempts++;
    }

    addPair() {
        this.score++;
    }

    reset() {
        this.score    = 0;
        this.attempts = 0;
    }
}

class MemoryGame {

    static SYMBOLS = [
        '🦁', '🦊', '🐸', '🐬',
        '🦋', '🌺', '⭐', '🍄',
        '🎩', '🔮', '🎸', '🦚',
        '🍉', '🐉', '🏆', '🎭'
    ];

    static TOTAL_PAIRS = 8;

    constructor(name1, name2) {
        this.players     = [ new Player(1, name1), new Player(2, name2) ];
        this.cards       = [];
        this.flippedCards = [];
        this.currentIdx  = 0;
        this.matchCount  = 0;
        this.isLocked    = false;
        this.isOver      = false;
        this.matchHistory = [];
        this.eventLog     = [];
    }

    get currentPlayer() {
        return this.players[this.currentIdx];
    }

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

    static _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    attemptFlip(cardId) {
        if (this.isLocked)  return { action: 'locked' };

        const card = this.cards[cardId];
        if (!card || card.isFlipped || card.isMatched) return { action: 'invalid' };

        card.flip();
        this.flippedCards.push(card);

        if (this.flippedCards.length === 1) {
            return { action: 'first', card };
        }

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

        this._log(`✗ ${this.currentPlayer.name} errou (${c1.symbol} ≠ ${c2.symbol})`);
        return { action: 'no-match', card, mismatchCards: [c1, c2] };
    }

    resolveNoMatch() {
        const [c1, c2] = this.flippedCards;
        c1.unflip();
        c2.unflip();
        this.flippedCards = [];
        this.isLocked     = false;
        this._switchPlayer();
    }

    getWinner() {
        const [p1, p2] = this.players;
        if (p1.score > p2.score) return p1;
        if (p2.score > p1.score) return p2;
        return null;
    }

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

    _switchPlayer() {
        this.currentIdx = this.currentIdx === 0 ? 1 : 0;
        this._log(`Vez de ${this.currentPlayer.name}.`);
    }

    _log(message) {
        this.eventLog.push({ id: this.eventLog.length + 1, message });
    }
}
