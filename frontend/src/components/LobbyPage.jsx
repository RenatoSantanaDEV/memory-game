import { useState } from 'react';
import '../styles/lobby.css';
import socket from '../socket';

const RULES = [
  { icon: '👥', text: 'Crie uma sala e compartilhe o código com seu oponente.' },
  { icon: '🃏', text: 'Vire duas cartas por vez tentando encontrar pares.' },
  { icon: '⭐', text: 'Acertou? Você ganha um ponto e joga de novo.' },
  { icon: '✗',  text: 'Errou? As cartas voltam e é a vez do adversário.' },
  { icon: '🏆', text: 'Quem encontrar mais pares ao fim ganha!' },
];

export default function LobbyPage({ error, onClearError }) {
  const [mode, setMode] = useState('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = playerName.trim().length > 0 && (mode === 'create' || roomCodeInput.trim().length > 0);

  function handleSubmit(e) {
    e.preventDefault();
    onClearError();

    const name = playerName.trim();
    let valid = true;

    if (!name) { setNameInvalid(true); valid = false; }
    else         { setNameInvalid(false); }

    if (mode === 'join') {
      const code = roomCodeInput.trim().toUpperCase();
      if (!code) { setCodeInvalid(true); valid = false; }
      else         { setCodeInvalid(false); }
      if (!valid) return;
      setIsLoading(true);
      socket.emit('join-room', { roomCode: code, playerName: name });
    } else {
      if (!valid) return;
      setIsLoading(true);
      socket.emit('create-room', { playerName: name });
    }
  }

  function switchMode(m) {
    setMode(m);
    setIsLoading(false);
    onClearError();
    setNameInvalid(false);
    setCodeInvalid(false);
  }

  // Reset loading on server error
  if (error && isLoading) setIsLoading(false);

  return (
    <div className="lobby-page">
      {/* Background decorative elements */}
      <div className="lobby-bg-left"  aria-hidden="true">♠</div>
      <div className="lobby-bg-right" aria-hidden="true">♣</div>
      <div className="lobby-spotlight" aria-hidden="true" />

      {/* Floating decorative cards (visible on wide screens) */}
      <div className="lobby-deco" aria-hidden="true">
        <div className="deco-card deco-card-gold">♠</div>
        <div className="deco-card deco-card-blue">?</div>
      </div>

      <div className="lobby-wrapper">

        {/* ── HERO ── */}
        <header className="lobby-hero">
          <div className="lobby-suits" aria-hidden="true">
            <span className="suit-s">♠</span>
            <span className="suit-h">♥</span>
            <span className="suit-d">♦</span>
            <span className="suit-c">♣</span>
          </div>

          <h1 className="lobby-title">Jogo da Memória</h1>

          <div className="lobby-divider" aria-hidden="true">
            <span className="lobby-divider-gem">◆</span>
          </div>

          <p className="lobby-tagline">Multiplayer — máquinas diferentes</p>
        </header>

        {/* ── MAIN PANEL ── */}
        <main className="lobby-panel">

          {/* Tabs */}
          <div className="lobby-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'create'}
              className={`lobby-tab${mode === 'create' ? ' active' : ''}`}
              onClick={() => switchMode('create')}
            >
              Criar Sala
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'join'}
              className={`lobby-tab${mode === 'join' ? ' active' : ''}`}
              onClick={() => switchMode('join')}
            >
              Entrar na Sala
            </button>
          </div>

          {/* Form */}
          <form className="lobby-form" onSubmit={handleSubmit}>

            {/* Name field */}
            <div className="lobby-field">
              <label className="lobby-label" htmlFor="lobby-name">Seu Nome</label>
              <div className="lobby-input-wrap">
                <span className="lobby-input-icon" aria-hidden="true">👤</span>
                <input
                  id="lobby-name"
                  className={`lobby-input name-input${nameInvalid ? ' invalid' : ''}`}
                  type="text"
                  placeholder="Digite seu nome..."
                  value={playerName}
                  onChange={e => {
                    setPlayerName(e.target.value);
                    setNameInvalid(false);
                    onClearError();
                  }}
                  maxLength={20}
                  autoFocus
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Room code field (join mode only) */}
            {mode === 'join' && (
              <div className="lobby-field">
                <label className="lobby-label" htmlFor="lobby-code">Código da Sala</label>
                <input
                  id="lobby-code"
                  className={`code-input${codeInvalid ? ' invalid' : ''}`}
                  type="text"
                  placeholder="Ex: MFWXX"
                  value={roomCodeInput}
                  onChange={e => {
                    setRoomCodeInput(e.target.value.toUpperCase());
                    setCodeInvalid(false);
                    onClearError();
                  }}
                  maxLength={5}
                  autoComplete="off"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="lobby-error" role="alert">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="lobby-btn"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="lobby-spinner" />
                  {mode === 'create' ? 'Criando...' : 'Entrando...'}
                </>
              ) : mode === 'create' ? (
                <>👑 Criar Sala</>
              ) : (
                <>→ Entrar na Sala</>
              )}
            </button>

            {/* Hint text */}
            {mode === 'create' && (
              <p className="lobby-hint">
                <span className="lobby-hint-icon" aria-hidden="true">🛡</span>
                Ao criar uma sala, você receberá um código para compartilhar com seu oponente.
              </p>
            )}
          </form>
        </main>

        {/* ── RULES CARD ── */}
        <div className="lobby-rules">
          <h3 className="lobby-rules-title">Como Jogar</h3>
          <ul className="lobby-rules-list">
            {RULES.map((rule, i) => (
              <li key={i}>{rule.text}</li>
            ))}
          </ul>
        </div>

        {/* ── FOOTER BAR ── */}
        <footer className="lobby-footer">
          <div className="lobby-footer-item">
            <span className="lobby-footer-icon" aria-hidden="true">🛡</span>
            <strong>Seguro</strong>
            Salas privadas
          </div>
          <div className="lobby-footer-item">
            <span className="lobby-footer-icon" aria-hidden="true">⚡</span>
            <strong>Rápido</strong>
            Partidas em tempo real
          </div>
          <div className="lobby-footer-item">
            <span className="lobby-footer-icon" aria-hidden="true">👥</span>
            <strong>Multiplayer</strong>
            Jogue com amigos
          </div>
        </footer>

      </div>
    </div>
  );
}
