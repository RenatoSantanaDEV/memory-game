export default function GameFooter({ timeElapsed, gameState, soundEnabled, onSoundToggle, onLeave, onRestart }) {
  const { players, matchHistory, cards } = gameState;

  const totalAttempts = players.reduce((sum, p) => sum + p.attempts, 0);
  const totalPairs = cards ? cards.length / 2 : 10;
  const pairsFound = matchHistory ? matchHistory.length : 0;

  const minutes = String(Math.floor(timeElapsed / 60)).padStart(2, '0');
  const seconds = String(timeElapsed % 60).padStart(2, '0');

  return (
    <footer className="game-footer">
      <div className="footer-left">
        <button className="btn btn-leave" onClick={onLeave}>
          SAIR ↪
        </button>
        <button
          className={`btn btn-sound${soundEnabled ? '' : ' muted'}`}
          onClick={onSoundToggle}
          aria-label={soundEnabled ? 'Desligar som' : 'Ligar som'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="footer-center">
        <div className="footer-stat">
          <span className="footer-stat-label">Tentativas</span>
          <span className="footer-stat-value">{totalAttempts}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-label">Pares Encontrados</span>
          <span className="footer-stat-value">{pairsFound}/{totalPairs}</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-label">Tempo</span>
          <span className="footer-stat-value">⏱ {minutes}:{seconds}</span>
        </div>
      </div>

      <div className="footer-right">
        <button className="btn btn-restart" onClick={onRestart}>
          ↺ Reiniciar
        </button>
        <button className="btn btn-newgame" onClick={onRestart}>
          ▶ Novo Jogo
        </button>
      </div>
    </footer>
  );
}
