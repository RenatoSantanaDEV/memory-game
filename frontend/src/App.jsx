import { useState, useEffect } from 'react';
import socket from './socket';
import LobbyPage from './components/LobbyPage';
import WaitingPage from './components/WaitingPage';
import GamePage from './components/GamePage';

// Máquina de estados: 'lobby' | 'waiting' | 'game'
export default function App() {
  const [page, setPage] = useState('lobby');
  const [gameState, setGameState] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reconexão: se há dados de sessão salvos, tenta rejoin automático
    socket.on('connect', () => {
      setMySocketId(socket.id);
      const savedRoom = sessionStorage.getItem('roomCode');
      const savedIndex = sessionStorage.getItem('playerIndex');
      if (savedRoom && savedIndex != null) {
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
      sessionStorage.setItem('roomCode', roomCode);
      const myIdx = gameState.players.findIndex(p => p.id === yourSocketId);
      if (myIdx !== -1) sessionStorage.setItem('playerIndex', String(myIdx));
      setPage('waiting');
    });

    socket.on('player-joined', ({ yourSocketId, gameState }) => {
      setMySocketId(yourSocketId);
      setRoomCode(gameState.roomCode);
      setGameState(gameState);
      setError(null);
      const myIdx = gameState.players.findIndex(p => p.id === yourSocketId);
      sessionStorage.setItem('roomCode', gameState.roomCode);
      if (myIdx !== -1) sessionStorage.setItem('playerIndex', String(myIdx));
      setPage('waiting');
    });

    socket.on('game-started', ({ gameState }) => {
      setGameState(gameState);
      setPage('game');
    });

    socket.on('rejoined', ({ yourSocketId, gameState }) => {
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

    socket.on('error', ({ message }) => {
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
      socket.off('error');
    };
  }, []);

  const myPlayerIndex = gameState
    ? gameState.players.findIndex(p => p.id === mySocketId)
    : -1;

  function handleClearError() {
    setError(null);
  }

  if (page === 'lobby') {
    return <LobbyPage error={error} onClearError={handleClearError} />;
  }
  if (page === 'waiting') {
    return <WaitingPage roomCode={roomCode} gameState={gameState} mySocketId={mySocketId} />;
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
