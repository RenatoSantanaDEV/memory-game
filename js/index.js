/* ============================================================
   INDEX.JS — Landing page logic
   ============================================================ */

'use strict';

(function () {
    const startBtn      = document.getElementById('startBtn');
    const p1Input       = document.getElementById('player1Name');
    const p2Input       = document.getElementById('player2Name');
    const errorMsg      = document.getElementById('errorMsg');

    /**
     * Highlights the input that failed validation.
     * @param {HTMLInputElement} input
     */
    function markInvalid(input) {
        input.classList.add('invalid');
        input.focus();
    }

    /**
     * Removes the invalid highlight from an input.
     * @param {HTMLInputElement} input
     */
    function clearInvalid(input) {
        input.classList.remove('invalid');
    }

    /* Clear error styling when the user starts typing again */
    p1Input.addEventListener('input', () => clearInvalid(p1Input));
    p2Input.addEventListener('input', () => clearInvalid(p2Input));

    /**
     * Validates names and navigates to game.html passing them as
     * URL query parameters so game.js can read them.
     */
    function startGame() {
        const name1 = p1Input.value.trim();
        const name2 = p2Input.value.trim();

        errorMsg.textContent = '';

        if (!name1) {
            errorMsg.textContent = 'Por favor, insira o nome do Jogador 1.';
            markInvalid(p1Input);
            return;
        }

        if (!name2) {
            errorMsg.textContent = 'Por favor, insira o nome do Jogador 2.';
            markInvalid(p2Input);
            return;
        }

        if (name1.toLowerCase() === name2.toLowerCase()) {
            errorMsg.textContent = 'Os jogadores precisam ter nomes diferentes.';
            markInvalid(p2Input);
            return;
        }

        /* Navigate to game page with names as query params */
        const params = new URLSearchParams({ p1: name1, p2: name2 });
        window.location.href = 'game.html?' + params.toString();
    }

    startBtn.addEventListener('click', startGame);

    /* Allow pressing Enter in either field to start */
    p1Input.addEventListener('keydown', (e) => { if (e.key === 'Enter') startGame(); });
    p2Input.addEventListener('keydown', (e) => { if (e.key === 'Enter') startGame(); });
}());
