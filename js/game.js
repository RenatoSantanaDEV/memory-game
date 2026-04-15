'use strict';

(function () {

    const dom = {
        board:           document.getElementById('gameBoard'),
        scoreTableBody:  document.getElementById('scoreTableBody'),
        matchTableBody:  document.getElementById('matchTableBody'),
        turnP1:          document.getElementById('turnP1'),
        turnP2:          document.getElementById('turnP2'),
        turnP1Name:      document.getElementById('turnP1Name'),
        turnP2Name:      document.getElementById('turnP2Name'),
        gameLog:         document.getElementById('gameLog'),
        remainingList:   document.getElementById('remainingList'),
        statusMsg:       document.getElementById('statusMsg'),
        restartBtn:      document.getElementById('restartBtn'),
        gameOverModal:   document.getElementById('gameOverModal'),
        modalTitle:      document.getElementById('modalTitle'),
        modalSubtitle:   document.getElementById('modalSubtitle'),
        modalScores:     document.getElementById('modalScores'),
        playAgainBtn:    document.getElementById('playAgainBtn')
    };

    let game;

    function boot() {
        const params = new URLSearchParams(window.location.search);
        const name1  = params.get('p1') || 'Jogador 1';
        const name2  = params.get('p2') || 'Jogador 2';

        dom.turnP1Name.textContent = name1;
        dom.turnP2Name.textContent = name2;

        game = new MemoryGame(name1, name2);
        launchGame(game.initialize());

        dom.restartBtn.addEventListener('click', handleRestart);
        dom.playAgainBtn.addEventListener('click', handleRestart);
    }

    function launchGame(cards) {
        renderBoard(cards);
        buildScoreRows();
        updateTurnIndicator();
        rebuildRemainingList();
        dom.matchTableBody.textContent = '';
        dom.gameLog.textContent        = '';
        syncLog();
        setStatus('');
    }

    function handleRestart() {
        dom.gameOverModal.classList.add('hidden');
        launchGame(game.restart());
    }

    function renderBoard(cards) {
        dom.board.textContent = '';

        cards.forEach(card => {
            dom.board.appendChild(createCardElement(card));
        });
    }

    function createCardElement(card) {
        const wrapper = document.createElement('div');
        wrapper.className        = 'card';
        wrapper.dataset.cardId   = card.id;
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');
        wrapper.setAttribute('aria-label', 'Carta virada para baixo');

        const inner   = document.createElement('div');
        inner.className = 'card-inner';

        const faceDown = document.createElement('div');
        faceDown.className   = 'card-face-down';
        faceDown.textContent = '?';

        const faceUp = document.createElement('div');
        faceUp.className   = 'card-face-up';
        faceUp.textContent = card.symbol;

        inner.appendChild(faceDown);
        inner.appendChild(faceUp);
        wrapper.appendChild(inner);

        wrapper.addEventListener('click', () => handleCardClick(card.id));
        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') handleCardClick(card.id);
        });

        return wrapper;
    }

    function getCardEl(cardId) {
        return dom.board.querySelector(`[data-card-id="${cardId}"]`);
    }

    function handleCardClick(cardId) {
        const result = game.attemptFlip(cardId);

        if (result.action === 'locked' || result.action === 'invalid') return;

        const el = getCardEl(cardId);

        el.classList.add('flipped');
        el.setAttribute('aria-label', `Carta: ${result.card.symbol}`);

        switch (result.action) {

            case 'first':
                break;

            case 'match':
                handleMatch(result.matchEntry);
                break;

            case 'game-over':
                handleMatch(result.matchEntry);
                setTimeout(() => showGameOver(), 900);
                break;

            case 'no-match':
                handleNoMatch(result.mismatchCards);
                break;
        }
    }

    function handleMatch(matchEntry) {
        setTimeout(() => {
            game.cards
                .filter(c => c.isMatched)
                .forEach(c => {
                    const el = getCardEl(c.id);
                    if (el && !el.classList.contains('matched')) {
                        el.classList.add('matched');
                    }
                });
        }, 300);

        updateScoreRows();
        insertMatchRow(matchEntry);
        syncLog();
        removeRemainingItem(matchEntry.symbol);
        setStatus(`${matchEntry.playerName} encontrou o par ${matchEntry.symbol}!`);
    }

    function handleNoMatch(mismatchCards) {
        syncLog();
        setStatus('Não foi desta vez... virando de volta.');

        setTimeout(() => {
            mismatchCards.forEach(c => {
                const el = getCardEl(c.id);
                if (el) {
                    el.classList.remove('flipped');
                    el.setAttribute('aria-label', 'Carta virada para baixo');
                }
            });

            game.resolveNoMatch();

            updateTurnIndicator();
            updateScoreRows();
            syncLog();
            setStatus(`Vez de ${game.currentPlayer.name}`);
        }, 1100);
    }

    function buildScoreRows() {
        while (dom.scoreTableBody.firstChild) {
            dom.scoreTableBody.removeChild(dom.scoreTableBody.firstChild);
        }

        game.players.forEach(player => {
            const tr = document.createElement('tr');
            tr.dataset.playerId = player.id;

            const tdName   = document.createElement('td');
            tdName.className   = player.id === 1 ? 'p1-name' : 'p2-name';
            tdName.textContent = player.name;

            const tdScore  = document.createElement('td');
            tdScore.className   = 'score-val';
            tdScore.textContent = '0';

            const tdAtt    = document.createElement('td');
            tdAtt.textContent = '0';

            tr.append(tdName, tdScore, tdAtt);
            dom.scoreTableBody.appendChild(tr);
        });

        updateScoreRows();
    }

    function updateScoreRows() {
        game.players.forEach(player => {
            const tr = dom.scoreTableBody.querySelector(`[data-player-id="${player.id}"]`);
            if (!tr) return;
            const [, tdScore, tdAtt] = tr.cells;
            tdScore.textContent = player.score;
            tdAtt.textContent   = player.attempts;

            tr.classList.toggle('active-row', game.currentIdx === player.id - 1);
        });
    }

    function insertMatchRow(entry) {
        const MAX_ROWS = 10;

        const tr = document.createElement('tr');
        tr.className = `match-row-p${entry.playerId} row-flash`;

        const tdNum    = document.createElement('td');
        tdNum.textContent = entry.number;

        const tdPlayer = document.createElement('td');
        tdPlayer.textContent = entry.playerName;

        const tdSym    = document.createElement('td');
        tdSym.className   = 'symbol-cell';
        tdSym.textContent = entry.symbol;

        tr.append(tdNum, tdPlayer, tdSym);
        dom.matchTableBody.insertBefore(tr, dom.matchTableBody.firstChild);

        while (dom.matchTableBody.rows.length > MAX_ROWS) {
            dom.matchTableBody.removeChild(dom.matchTableBody.lastChild);
        }
    }

    function updateTurnIndicator() {
        const isP1Active = game.currentIdx === 0;
        dom.turnP1.classList.toggle('active-turn', isP1Active);
        dom.turnP2.classList.toggle('active-turn', !isP1Active);
    }

    function syncLog() {
        const MAX_ITEMS = 12;

        while (dom.gameLog.firstChild) {
            dom.gameLog.removeChild(dom.gameLog.firstChild);
        }

        const recent = game.eventLog.slice(-MAX_ITEMS).reverse();
        recent.forEach(entry => {
            const li = document.createElement('li');
            li.className   = 'log-item';
            li.textContent = entry.message;

            if (entry.message.includes('✓')) li.classList.add('log-match');
            if (entry.message.includes('✗')) li.classList.add('log-miss');

            dom.gameLog.appendChild(li);
        });
    }

    function rebuildRemainingList() {
        while (dom.remainingList.firstChild) {
            dom.remainingList.removeChild(dom.remainingList.firstChild);
        }

        game.getRemainingSymbols().forEach(symbol => {
            dom.remainingList.appendChild(createRemainingItem(symbol));
        });
    }

    function createRemainingItem(symbol) {
        const li = document.createElement('li');
        li.className            = 'remaining-item';
        li.dataset.symbol       = symbol;

        const spanSym   = document.createElement('span');
        spanSym.className   = 'remaining-symbol';
        spanSym.textContent = symbol;

        const spanCount = document.createElement('span');
        spanCount.className   = 'remaining-count';
        spanCount.textContent = '×2';

        li.append(spanSym, spanCount);
        return li;
    }

    function removeRemainingItem(symbol) {
        const li = dom.remainingList.querySelector(`[data-symbol="${symbol}"]`);
        if (!li) return;

        li.classList.add('removing');
        li.addEventListener('transitionend', () => {
            if (li.parentNode) {
                dom.remainingList.removeChild(li);
            }
        }, { once: true });
    }

    function setStatus(text) {
        dom.statusMsg.textContent = text;
        dom.statusMsg.classList.remove('animating');
        void dom.statusMsg.offsetWidth;
        dom.statusMsg.classList.add('animating');
    }

    function showGameOver() {
        const winner = game.getWinner();

        if (winner) {
            dom.modalTitle.textContent    = `🏆 ${winner.name} venceu!`;
            dom.modalSubtitle.textContent = `Parabéns por encontrar mais pares!`;
        } else {
            dom.modalTitle.textContent    = '🤝 Empate!';
            dom.modalSubtitle.textContent = 'Os dois jogadores encontraram o mesmo número de pares.';
        }

        dom.modalScores.textContent = '';
        game.players.forEach(player => {
            const isWinner = winner && winner.id === player.id;

            const div = document.createElement('div');
            div.className = 'final-score-item' + (isWinner ? ' winner' : '');

            const pName  = document.createElement('p');
            pName.className   = 'final-score-name';
            pName.textContent = player.name;

            const pScore = document.createElement('p');
            pScore.className   = 'final-score-val';
            pScore.textContent = `${player.score} par${player.score !== 1 ? 'es' : ''}`;

            div.append(pName, pScore);
            dom.modalScores.appendChild(div);
        });

        dom.gameOverModal.classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', boot);

}());
