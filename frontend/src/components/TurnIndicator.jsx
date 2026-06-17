export default function TurnIndicator({ players, currentPlayerIndex }) {
  return (
    <div className="panel-section">
      <h3 className="panel-title">Vez</h3>
      <div className="turn-box">
        {players.map((p, i) => {
          const isActive = i === currentPlayerIndex;
          const colorClass = i === 0 ? 'turn-p1' : 'turn-p2';
          const suit = i === 0 ? '♠' : '♥';
          return (
            <div
              key={p.id}
              className={['turn-player', colorClass, isActive ? 'active-turn' : ''].filter(Boolean).join(' ')}
            >
              <span className="turn-suit">{suit}</span>
              {p.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
