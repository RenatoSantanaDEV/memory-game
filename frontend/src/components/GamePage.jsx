import { useEffect } from 'react';
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

export default function GamePage({ gameState, mySocketId, myPlayerIndex, roomCode }) {
  const { cards, players, currentPlayerIndex, isLocked, flippedCardIds, phase } = gameState;

  const isMyTurn = players[currentPlayerIndex]?.id === mySocketId;

  // Após o delay de animação (1100ms), o cliente que errou avisa o servidor para destravar
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

  function handleRestart() {
    socket.emit('restart-game', { roomCode });
  }

  // Verifica se o oponente está desconectado
  const opponent = players.find((_, i) => i !== myPlayerIndex);
  const opponentDisconnected = opponent && !opponent.isConnected;

  return (
    <>
      {opponentDisconnected && (
        <div className="disconnected-banner">
          {opponent.name} desconectou. Aguardando reconexão...
        </div>
      )}

      <header className="game-header">
        <div className="header-left">
          <span className="header-suits">♠ ♥ ♦ ♣</span>
          <span className="header-title">Jogo da Memória</span>
        </div>
        {phase === 'over' && (
          <button className="restart-btn" onClick={handleRestart}>
            ↺ Nova Partida
          </button>
        )}
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

      {phase === 'over' && (
        <GameOverModal gameState={gameState} roomCode={roomCode} />
      )}
    </>
  );
}
