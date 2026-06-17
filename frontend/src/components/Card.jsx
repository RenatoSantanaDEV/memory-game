export default function Card({ card, onClick, isMyTurn, isLocked, isMismatch }) {
  const isClickable = isMyTurn && !card.isFlipped && !card.isMatched && !isLocked;

  const className = [
    'card',
    card.isFlipped  ? 'flipped'         : '',
    card.isMatched  ? 'matched'         : '',
    isMismatch      ? 'mismatch'        : '',
    !isClickable    ? 'not-interactive' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      onClick={() => isClickable && onClick(card.id)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && isClickable && onClick(card.id)}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={
        card.isFlipped || card.isMatched
          ? `Carta: ${card.symbol}`
          : 'Carta virada para baixo'
      }
    >
      <div className="card-inner">
        <div className="card-face-down">
          <span className="card-corner card-corner-tl">◆</span>
          <span className="card-question">?</span>
          <span className="card-corner card-corner-br">◆</span>
        </div>
        <div className="card-face-up">{card.symbol}</div>
      </div>
    </div>
  );
}
