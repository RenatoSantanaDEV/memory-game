import socket from '../socket';

export default function GameOverModal({ gameState, roomCode, mySocketId, timeElapsed }) {
  const { players, winner, restartVoteCount, restartVotedIds } = gameState;

  const iHaveVoted = restartVotedIds?.includes(mySocketId);
  const opponentVoted = restartVoteCount > 0 && !iHaveVoted;
  const waitingForOpponent = iHaveVoted && restartVoteCount < 2;

  let result = 'tie';
  if (winner) {
    result = winner.id === mySocketId ? 'winner' : 'loser';
  }

  const minutes = String(Math.floor(timeElapsed / 60)).padStart(2, '0');
  const seconds = String(timeElapsed % 60).padStart(2, '0');

  const RESULT_CONFIG = {
    winner: {
      emoji: '🏆',
      title: 'Você Venceu!',
      subtitle: 'Parabéns! Você encontrou mais pares.',
      modalClass: 'result-winner',
      titleClass: 'title-winner',
    },
    loser: {
      emoji: '😔',
      title: `${winner?.name} Venceu`,
      subtitle: 'Não foi desta vez. Tente uma revanche!',
      modalClass: 'result-loser',
      titleClass: 'title-loser',
    },
    tie: {
      emoji: '🤝',
      title: 'Empate!',
      subtitle: 'Os dois jogadores ficaram empatados.',
      modalClass: 'result-tie',
      titleClass: '',
    },
  };

  const cfg = RESULT_CONFIG[result];

  function handleVote() {
    socket.emit('vote-restart', { roomCode });
  }

  return (
    <div className="modal-overlay">
      <div className={`modal ${cfg.modalClass}`}>
        <p className={`modal-title ${cfg.titleClass}`}>
          {cfg.emoji} {cfg.title}
        </p>
        <p className="modal-subtitle">{cfg.subtitle}</p>

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

        <p className="modal-timer">
          Tempo total: <span>{minutes}:{seconds}</span>
        </p>

        <div className="vote-section">
          <div className="vote-dots">
            {players.map((p) => (
              <div
                key={p.id}
                className={`vote-dot${restartVotedIds?.includes(p.id) ? ' voted' : ''}`}
                title={
                  restartVotedIds?.includes(p.id)
                    ? `${p.name} quer jogar novamente`
                    : `${p.name} ainda não votou`
                }
              />
            ))}
          </div>

          {waitingForOpponent ? (
            <p className="vote-status">
              Aguardando {players.find(p => p.id !== mySocketId)?.name}...
            </p>
          ) : opponentVoted ? (
            <p className="vote-status">
              {players.find(p => restartVotedIds?.includes(p.id) && p.id !== mySocketId)?.name} quer jogar novamente!
            </p>
          ) : null}

          {!iHaveVoted && (
            <button className="start-btn" onClick={handleVote}>
              Jogar Novamente
            </button>
          )}

          {iHaveVoted && (
            <p className="vote-status" style={{ color: 'var(--match-color)' }}>
              ✓ Você confirmou a revanche
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
