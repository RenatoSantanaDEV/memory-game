export default function StatusMessage({ gameState }) {
  const { players, currentPlayerIndex, phase } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  if (phase === 'over' || !currentPlayer) return null;

  const isP2 = currentPlayerIndex === 1;

  return (
    <div className="status-badge" key={currentPlayerIndex}>
      VEZ DE{' '}
      <span className={`status-player-name${isP2 ? ' p2' : ''}`}>
        {currentPlayer.name}
      </span>
    </div>
  );
}
