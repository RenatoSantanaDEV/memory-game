export default function Card({ card, onClick, isMyTurn, isLocked }) {
  const isClickable = isMyTurn && !card.isFlipped && !card.isMatched && !isLocked;

  const className = [
    'card',
    card.isFlipped ? 'flipped' : '',
    card.isMatched ? 'matched' : '',
    !isClickable ? 'not-interactive' : '',
  ].filter(Boolean).join(' ');

  function handleClick() {
    if (isClickable) onClick(card.id);
  }

  function handleKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) onClick(card.id);
  }

  return (
    <div
      className={className}
      onClick={handleClick}
      onKeyDown={handleKey}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={card.isFlipped || card.isMatched ? `Carta: ${card.symbol}` : 'Carta virada para baixo'}
    >
      <div className="card-inner">
        <div className="card-face-down">?</div>
        <div className="card-face-up">{card.symbol}</div>
      </div>
    </div>
  );
}
