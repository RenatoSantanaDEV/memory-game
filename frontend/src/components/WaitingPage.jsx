import '../styles/lobby.css';
import '../styles/game.css';
import socket from '../socket';

export default function WaitingPage({ roomCode, gameState, mySocketId }) {
  const myPlayer = gameState?.players.find(p => p.id === mySocketId);

  function copyCode() {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  }

  function handleLeave() {
    socket.emit('leave-room', { roomCode });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', background: 'var(--felt)', backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(21,42,28,0.9) 0%,transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(29,58,38,0.7) 0%,transparent 60%)' }}>
      <div className="page-wrapper">
        <div className="hero-title">
          <span className="card-suits">♠ ♥ ♦ ♣</span>
          <h1>Jogo da Memória</h1>
        </div>

        <div className="setup-container">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Olá, <strong style={{ color: 'var(--text-bright)' }}>{myPlayer?.name}</strong>! Compartilhe o código com seu oponente:
          </p>

          <div
            style={{
              fontSize: '2.8rem',
              fontWeight: 700,
              letterSpacing: '10px',
              color: 'var(--gold-light)',
              textShadow: '0 0 20px rgba(201,162,39,0.5)',
              fontFamily: 'var(--font-main)',
              cursor: 'pointer',
              padding: '16px 24px',
              background: 'rgba(201,162,39,0.07)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              textAlign: 'center',
              width: '100%',
              userSelect: 'all',
            }}
            onClick={copyCode}
            title="Clique para copiar"
          >
            {roomCode}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Clique no código para copiar
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span style={{ fontSize: '1.4rem', animation: 'suitFloat 1.5s ease-in-out infinite' }}>⏳</span>
            Aguardando segundo jogador...
          </div>

          {gameState?.players.length === 2 && (
            <p style={{ color: 'var(--match-color)', fontSize: '0.9rem' }}>
              Jogadores conectados! Iniciando...
            </p>
          )}

          <button className="leave-btn" onClick={handleLeave} style={{ marginTop: '8px' }}>
            Cancelar e Sair
          </button>
        </div>
      </div>
    </div>
  );
}
