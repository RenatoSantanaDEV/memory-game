import { useEffect, useState } from 'react';
import '../styles/game.css';
import socket from '../socket';
import Card from './Card';
import Scoreboard from './Scoreboard';
import TurnIndicator from './TurnIndicator';
import MatchHistory from './MatchHistory';
import EventLog from './EventLog';
import RemainingSymbols from './RemainingSymbols';
import StatusMessage from './StatusMessage';
import GameOverModal from './GameOverModal';
import GameFooter from './GameFooter';
import SettingsModal from './SettingsModal';

export default function GamePage({ gameState, mySocketId, myPlayerIndex, roomCode }) {
  const { cards, players, currentPlayerIndex, isLocked, flippedCardIds, phase } = gameState;

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const isMyTurn = players[currentPlayerIndex]?.id === mySocketId;

  // Timer — stops when game ends
  useEffect(() => {
    if (phase === 'over') return;
    const id = setInterval(() => setTimeElapsed(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Reset timer when a new game starts (matchHistory empties and eventLog resets)
  useEffect(() => {
    if (gameState.matchHistory.length === 0 && gameState.eventLog.length <= 1) {
      setTimeElapsed(0);
    }
  }, [gameState.matchHistory.length, gameState.eventLog.length]);

  // After mismatch delay, the active client unlocks the board
  useEffect(() => {
    const noMatchPending = isLocked && flippedCardIds.length === 2;
    if (!noMatchPending || !isMyTurn) return;
    const timer = setTimeout(() => {
      socket.emit('resolve-no-match', { roomCode });
    }, 1100);
    return () => clearTimeout(timer);
  }, [isLocked, flippedCardIds.length, isMyTurn, roomCode]);

  function handleCardClick(cardId) {
    if (!isMyTurn || isLocked) return;
    socket.emit('flip-card', { roomCode, cardId });
  }

  function handleLeave() {
    socket.emit('leave-room', { roomCode });
  }

  function handleRestart() {
    socket.emit('vote-restart', { roomCode });
  }

  const opponent = players.find((_, i) => i !== myPlayerIndex);
  const opponentDisconnected = opponent && !opponent.isConnected;

  const mismatchCardIds = (isLocked && flippedCardIds.length === 2) ? flippedCardIds : [];

  return (
    <div className={`game-page-wrapper${animationsEnabled ? '' : ' animations-disabled'}`}>
      {opponentDisconnected && (
        <div className="disconnected-banner">
          {opponent.name} desconectou. Aguardando reconexão...
        </div>
      )}

      <header className="game-header">
        <div className="header-suits">
          <span className="suit-club">♣</span>
          <span className="suit-diam">♦</span>
          <span className="suit-heart">♥</span>
          <span className="suit-spade">♠</span>
        </div>

        <h1 className="header-title">Jogo da Memória</h1>

        <div className="header-right">
          <div className="room-badge">
            SALA: <strong>{roomCode}</strong>
          </div>
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Configurações"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="game-layout">
        <aside className="panel panel-left">
          <Scoreboard players={players} currentPlayerIndex={currentPlayerIndex} />
          <TurnIndicator players={players} currentPlayerIndex={currentPlayerIndex} />
          <MatchHistory matchHistory={gameState.matchHistory} />
        </aside>

        <section className="panel-center">
          <div className="game-board">
            {cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={handleCardClick}
                isMyTurn={isMyTurn}
                isLocked={isLocked}
                isMismatch={mismatchCardIds.includes(card.id)}
              />
            ))}
          </div>
          <StatusMessage gameState={gameState} mySocketId={mySocketId} />
        </section>

        <aside className="panel panel-right">
          <EventLog eventLog={gameState.eventLog} />
          <RemainingSymbols remainingSymbols={gameState.remainingSymbols} />
        </aside>
      </main>

      <GameFooter
        timeElapsed={timeElapsed}
        gameState={gameState}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(s => !s)}
        onLeave={handleLeave}
        onRestart={handleRestart}
      />

      {phase === 'over' && (
        <GameOverModal
          gameState={gameState}
          roomCode={roomCode}
          mySocketId={mySocketId}
          timeElapsed={timeElapsed}
        />
      )}

      {showSettings && (
        <SettingsModal
          soundEnabled={soundEnabled}
          animationsEnabled={animationsEnabled}
          onSoundToggle={() => setSoundEnabled(s => !s)}
          onAnimationsToggle={() => setAnimationsEnabled(a => !a)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
