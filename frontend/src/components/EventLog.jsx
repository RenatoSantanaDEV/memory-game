export default function EventLog({ eventLog }) {
  // Últimos 12 eventos em ordem reversa
  const recent = [...eventLog].slice(-12).reverse();

  return (
    <div className="panel-section">
      <h3 className="panel-title">Log</h3>
      <ol className="game-log">
        {recent.map((entry) => {
          const isMatch = entry.message.startsWith('✓');
          const isMiss = entry.message.startsWith('✗');
          const className = [
            'log-item',
            isMatch ? 'log-match' : '',
            isMiss ? 'log-miss' : '',
          ].filter(Boolean).join(' ');
          return (
            <li key={entry.id} className={className}>
              {entry.message}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
