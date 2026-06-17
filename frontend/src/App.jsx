import { useState, useEffect } from 'react';
import socket from './socket';
import LobbyPage from './components/LobbyPage';
import WaitingPage from './components/WaitingPage';
import GamePage from './components/GamePage';
import AbandonedScreen from './components/AbandonedScreen';

// Garante que cada aba tem um ID único persistente durante a sessão
// sessionStorage sobrevive a F5, mas não a fechar e reabrir a aba
if (!sessionStorage.getItem('tabId')) {
  sessionStorage.setItem('tabId', Math.random().toString(36).slice(2, 10));
}

// Máquina de estados: 'lobby' | 'waiting' | 'game' | 'abandoned'
export default function App() {
  const [page, setPage] = useState('lobby');
  const [gameState, setGameState] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [error, setError] = useState(null);
  const [abandonedBy, setAbandonedBy] = useState(null); // nome de quem saiu

  useEffect(() => {
    // Flag de closure: distingue erro de rejoin automático de erro de ação do usuário
    let isRejoinPending = false;

    socket.on('connect', () => {
      setMySocketId(socket.id);
      const savedRoom  = localStorage.getItem('roomCode');
      const savedIndex = localStorage.getItem('playerIndex');
      const savedTabId = localStorage.getItem('tabId');
      const myTabId    = sessionStorage.getItem('tabId');
      if (savedRoom && savedIndex != null && myTabId && myTabId === savedTabId) {
        isRejoinPending = true;
        socket.emit('rejoin-room', {
          roomCode: savedRoom,
          playerIndex: parseInt(savedIndex, 10),
        });
      }
    });

    socket.on('room-created', ({ roomCode, yourSocketId, gameState }) => {
      setMySocketId(yourSocketId);
      setRoomCode(roomCode);
      setGameState(gameState);
      setError(null);
      const myIdx = gameState.players.findIndex(p => p.id === yourSocketId);
      const tabId = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('tabId', tabId);
      localStorage.setItem('tabId', tabId);
      localStorage.setItem('roomCode', roomCode);
      if (myIdx !== -1) localStorage.setItem('playerIndex', String(myIdx));
      setPage('waiting');
    });

    socket.on('player-joined', ({ yourSocketId, gameState }) => {
      setMySocketId(yourSocketId);
      setRoomCode(gameState.roomCode);
      setGameState(gameState);
      setError(null);
      const myIdx = gameState.players.findIndex(p => p.id === yourSocketId);
      const tabId = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('tabId', tabId);
      localStorage.setItem('tabId', tabId);
      localStorage.setItem('roomCode', gameState.roomCode);
      if (myIdx !== -1) localStorage.setItem('playerIndex', String(myIdx));
      setPage('waiting');
    });

    socket.on('game-started', ({ gameState }) => {
      setGameState(gameState);
      setPage('game');
    });

    socket.on('rejoined', ({ yourSocketId, gameState }) => {
      isRejoinPending = false;
      setMySocketId(yourSocketId);
      setRoomCode(gameState.roomCode);
      setGameState(gameState);
      setError(null);
      if (gameState.phase === 'playing' || gameState.phase === 'over') {
        setPage('game');
      } else {
        setPage('waiting');
      }
    });

    socket.on('game-state-update', ({ gameState }) => {
      setGameState(gameState);
      setRoomCode(gameState.roomCode);
    });

    socket.on('player-disconnected', ({ gameState }) => {
      setGameState(gameState);
    });

    // Oponente saiu intencionalmente
    socket.on('player-left', ({ playerName }) => {
      localStorage.removeItem('roomCode');
      localStorage.removeItem('playerIndex');
      localStorage.removeItem('tabId');
      sessionStorage.removeItem('tabId');
      setAbandonedBy(playerName);
      setPage('abandoned');
    });

    // Confirmação: eu saí com sucesso
    socket.on('left-room', () => {
      localStorage.removeItem('roomCode');
      localStorage.removeItem('playerIndex');
      localStorage.removeItem('tabId');
      sessionStorage.removeItem('tabId');
      setGameState(null);
      setRoomCode(null);
      setAbandonedBy(null);
      setPage('lobby');
    });

    socket.on('error', ({ message }) => {
      if (isRejoinPending) {
        isRejoinPending = false;
        localStorage.removeItem('roomCode');
        localStorage.removeItem('playerIndex');
        localStorage.removeItem('tabId');
        sessionStorage.removeItem('tabId');
        return;
      }
      setError(message);
    });

    return () => {
      socket.off('connect');
      socket.off('room-created');
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('rejoined');
      socket.off('game-state-update');
      socket.off('player-disconnected');
      socket.off('player-left');
      socket.off('left-room');
      socket.off('error');
    };
  }, []);

  const myPlayerIndex = gameState
    ? gameState.players.findIndex(p => p.id === mySocketId)
    : -1;

  function handleClearError() {
    setError(null);
  }

  function handleBackToLobby() {
    localStorage.removeItem('roomCode');
    localStorage.removeItem('playerIndex');
    localStorage.removeItem('tabId');
    sessionStorage.removeItem('tabId');
    setAbandonedBy(null);
    setGameState(null);
    setRoomCode(null);
    setPage('lobby');
  }

  if (page === 'lobby') {
    return <LobbyPage error={error} onClearError={handleClearError} />;
  }
  if (page === 'waiting') {
    return (
      <WaitingPage
        roomCode={roomCode}
        gameState={gameState}
        mySocketId={mySocketId}
      />
    );
  }
  if (page === 'abandoned') {
    return <AbandonedScreen playerName={abandonedBy} onBackToLobby={handleBackToLobby} />;
  }
  return (
    <GamePage
      gameState={gameState}
      mySocketId={mySocketId}
      myPlayerIndex={myPlayerIndex}
      roomCode={roomCode}
    />
  );
}
