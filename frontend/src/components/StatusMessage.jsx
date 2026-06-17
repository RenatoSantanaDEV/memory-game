export default function StatusMessage({ gameState, mySocketId }) {
  const { players, currentPlayerIndex, isLocked, flippedCardIds, phase } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === mySocketId;

  let text = '';

  if (phase === 'over') {
    text = '';
  } else if (isLocked && flippedCardIds.length === 2) {
    text = 'Não foi desta vez... virando de volta.';
  } else if (isMyTurn) {
    text = 'Sua vez!';
  } else if (currentPlayer) {
    text = `Vez de ${currentPlayer.name}`;
  }

  return (
    <p className="status-msg" key={text}>
      {text}
    </p>
  );
}
