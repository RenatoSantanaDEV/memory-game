import socket from '../socket';

export default function GameOverModal({ gameState, roomCode }) {
  const { players, winner } = gameState;

  function handleRestart() {
    socket.emit('restart-game', { roomCode });
  }

  const title = winner ? `${winner.name} venceu!` : 'Empate!';
  const subtitle = winner
    ? `Parabéns por encontrar mais pares!`
    : 'Os dois jogadores ficaram empatados.';

  return (
    <div className="modal-overlay">
      <div className="modal">
        <p className="modal-title">{winner ? '🏆' : '🤝'} {title}</p>
        <p className="modal-subtitle">{subtitle}</p>
        <div className="modal-scores">
          {players.map((p) => {
            const isWinner = winner && winner.id === p.id;
            return (
              <div key={p.id} className={`final-score-item${isWinner ? ' winner' : ''}`}>
                <p className="final-score-name">{p.name}</p>
                <p className="final-score-val">{p.score}</p>
              </div>
            );
          })}
        </div>
        <button className="start-btn" onClick={handleRestart}>
          Jogar Novamente
        </button>
      </div>
    </div>
  );
}
