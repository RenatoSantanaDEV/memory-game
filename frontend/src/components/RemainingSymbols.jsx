export default function RemainingSymbols({ remainingSymbols }) {
  return (
    <div className="panel-section">
      <h3 className="panel-title">Restantes</h3>
      <ul className="remaining-list">
        {remainingSymbols.map((symbol) => (
          <li key={symbol} className="remaining-item">
            <span className="remaining-symbol">{symbol}</span>
            <span className="remaining-count">×2</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
