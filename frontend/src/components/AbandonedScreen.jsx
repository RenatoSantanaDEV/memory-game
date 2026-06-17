export default function AbandonedScreen({ playerName, onBackToLobby }) {
  return (
    <div className="abandoned-screen">
      <div className="abandoned-card-wrap">
        <div className="abandoned-card">?</div>
      </div>

      <p className="abandoned-title">
        <span className="abandoned-name">{playerName}</span> saiu da partida
      </p>

      <p className="abandoned-subtitle">
        O adversário abandonou o jogo. Que tal encontrar um novo oponente?
      </p>

      <button className="abandoned-btn" onClick={onBackToLobby}>
        Voltar ao Lobby
      </button>
    </div>
  );
}
