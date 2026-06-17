import { useState } from 'react';
import '../styles/lobby.css';
import socket from '../socket';

export default function LobbyPage({ error, onClearError }) {
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onClearError();

    const name = playerName.trim();
    let valid = true;

    if (!name) {
      setNameInvalid(true);
      valid = false;
    } else {
      setNameInvalid(false);
    }

    if (mode === 'join') {
      const code = roomCodeInput.trim().toUpperCase();
      if (!code) {
        setCodeInvalid(true);
        valid = false;
      } else {
        setCodeInvalid(false);
      }
      if (!valid) return;
      socket.emit('join-room', { roomCode: code, playerName: name });
    } else {
      if (!valid) return;
      socket.emit('create-room', { playerName: name });
    }
  }

  function switchMode(m) {
    setMode(m);
    onClearError();
    setNameInvalid(false);
    setCodeInvalid(false);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', background: 'var(--felt)', backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(21,42,28,0.9) 0%,transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(29,58,38,0.7) 0%,transparent 60%)' }}>
      <div className="page-wrapper">
        <div className="hero-title">
          <span className="card-suits">♠ ♥ ♦ ♣</span>
          <h1>Jogo da Memória</h1>
          <p className="tagline">Multiplayer — máquinas diferentes</p>
        </div>

        <div className="setup-container">
          <div className="mode-tabs">
            <button
              type="button"
              className={`mode-tab${mode === 'create' ? ' active' : ''}`}
              onClick={() => switchMode('create')}
            >
              Criar Sala
            </button>
            <button
              type="button"
              className={`mode-tab${mode === 'join' ? ' active' : ''}`}
              onClick={() => switchMode('join')}
            >
              Entrar na Sala
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Seu nome</label>
              <input
                className={`name-input${nameInvalid ? ' invalid' : ''}`}
                type="text"
                placeholder="Digite seu nome..."
                value={playerName}
                onChange={(e) => { setPlayerName(e.target.value); setNameInvalid(false); onClearError(); }}
                maxLength={20}
                autoFocus
              />
            </div>

            {mode === 'join' && (
              <div className="form-group">
                <label className="form-label">Código da sala</label>
                <input
                  className={`code-input${codeInvalid ? ' invalid' : ''}`}
                  type="text"
                  placeholder="ABCDE"
                  value={roomCodeInput}
                  onChange={(e) => { setRoomCodeInput(e.target.value.toUpperCase()); setCodeInvalid(false); onClearError(); }}
                  maxLength={5}
                />
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="start-btn">
              {mode === 'create' ? 'Criar Sala' : 'Entrar na Sala'}
            </button>
          </form>
        </div>

        <div className="rules-card">
          <h3>Como Jogar</h3>
          <ul className="rules-list">
            <li>Crie uma sala e compartilhe o código com seu oponente.</li>
            <li>Vire duas cartas por vez tentando encontrar pares.</li>
            <li>Acertou? Você ganha um ponto e joga de novo.</li>
            <li>Errou? As cartas voltam e é a vez do adversário.</li>
            <li>Quem encontrar mais pares ao fim ganha!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
