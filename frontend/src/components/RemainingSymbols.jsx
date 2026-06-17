export default function RemainingSymbols({ remainingSymbols }) {
  return (
    <div className="panel-section">
      <h3 className="panel-title">Restantes</h3>
      <div className="remaining-grid">
        {remainingSymbols.map((symbol) => (
          <div key={symbol} className="remaining-item">
            <span className="remaining-symbol">{symbol}</span>
            <span className="remaining-count">×2</span>
          </div>
        ))}
      </div>
    </div>
  );
}
