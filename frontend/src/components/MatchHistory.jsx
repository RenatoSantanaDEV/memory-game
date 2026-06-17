export default function MatchHistory({ matchHistory }) {
  const recent = [...matchHistory].slice(-10).reverse();

  return (
    <div className="panel-section">
      <h3 className="panel-title">Histórico</h3>
      {recent.length === 0 ? (
        <div className="history-empty">♠</div>
      ) : (
        <table className="match-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>Par</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((entry) => (
              <tr
                key={entry.matchNumber}
                className={entry.playerIndex === 0 ? 'match-row-p1' : 'match-row-p2'}
              >
                <td>{entry.matchNumber}</td>
                <td>{entry.playerName}</td>
                <td className="symbol-cell">{entry.symbol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
