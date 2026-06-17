export default function Scoreboard({ players, currentPlayerIndex }) {
  return (
    <div className="panel-section">
      <h3 className="panel-title">Placar</h3>
      <table className="score-table">
        <thead>
          <tr>
            <th>Jogador</th>
            <th>Pares</th>
            <th>Tent.</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id} className={i === currentPlayerIndex ? 'active-row' : ''}>
              <td className={i === 0 ? 'p1-name' : 'p2-name'}>
                {p.name}
                {!p.isConnected && ' (offline)'}
              </td>
              <td className="score-val">{p.score}</td>
              <td>{p.attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
