import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Game.css';

const BOARD_SIZE = 10;
const createEmptyBoard = () => Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

const SHIP_TYPES = [
  { type: "carrier", size: 5, count: 1 },
  { type: "cruiser", size: 4, count: 1 },
  { type: "battleship", size: 3, count: 1 },
  { type: "destroyer", size: 2, count: 1 },
];

const Game = () => {
  const location = useLocation();
  const { player, opponent, gameId } = location.state || { opponent: 'Unknown' };

  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [gamePhase, setGamePhase] = useState('lobby');
  const [activePlayer, setActivePlayer] = useState(1);
  const [playerShips, setPlayerShips] = useState([]);
  const [opponentShips, setOpponentShips] = useState([]);
  const [playerBoard, setPlayerBoard] = useState(createEmptyBoard());
  const [opponentBoard, setOpponentBoard] = useState(createEmptyBoard());
  const [playerAttacks, setPlayerAttacks] = useState([]);
  const [opponentAttacks, setOpponentAttacks] = useState([]);
  const [orientation, setOrientation] = useState('horizontal');
  const [selectedShipType, setSelectedShipType] = useState(null);
  const [placedShipsCount, setPlacedShipsCount] = useState({
    carrier: 0, cruiser: 0, battleship: 0, destroyer: 0
  });
  const [timer, setTimer] = useState(60);

  const checkIfHit = (ships, row, col) =>
    ships.some(ship => ship.occupied.includes(row * BOARD_SIZE + col));

  const checkIfAllShipsSunk = (ships, attacks) =>
    ships.every(ship =>
      ship.occupied.every(cell =>
        attacks.map(a => a.row * BOARD_SIZE + a.col).includes(cell)
      )
    );

  const switchTurn = () => {
    setActivePlayer(p => (p === 1 ? 2 : 1));
    setTimer(60);
  };

  const handleOpponentAttack = useCallback(({ row, col }) => {
    const isHit = checkIfHit(playerShips, row, col);
    const newBoard = [...playerBoard];
    newBoard[row] = [...newBoard[row]];
    newBoard[row][col] = isHit ? 'hit' : 'miss';
    setPlayerBoard(newBoard);
    setOpponentAttacks(p => [...p, { row, col }]);
    setMessages(p => [...p, `${opponent} attacked ${row},${col} - ${isHit ? 'HIT' : 'Miss'}`]);

    if (checkIfAllShipsSunk(playerShips, [...opponentAttacks, { row, col }])) {
      setGamePhase('gameOver');
      setMessages(p => [...p, `${opponent} wins!`]);
    } else switchTurn();
  }, [playerShips, opponent, opponentAttacks, playerBoard]);

  const handleSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'ATTACK': handleOpponentAttack(data.position); break;
      case 'SHIP_PLACEMENT': setOpponentShips(data.ships); break;
      case 'GAME_START': setGamePhase('battle'); break;
      case 'GAME_OVER': setGamePhase('gameOver'); setMessages(p => [...p, `Game over! ${data.winner} wins!`]); break;
      default: console.log('Unknown message type:', data.type);
    }
  }, [handleOpponentAttack]);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_SERVER_URL;
    const socket = new WebSocket(wsUrl);
    setWs(socket);
    socket.onmessage = event => handleSocketMessage(JSON.parse(event.data));
    socket.onerror = error => console.error('WebSocket error:', error);
    socket.onclose = () => console.log('WebSocket closed');
    return () => socket.close();
  }, [handleSocketMessage]);

  useEffect(() => {
    if (gamePhase === 'battle') {
      const interval = setInterval(() => {
        setTimer(prev => (prev <= 1 ? (switchTurn(), 60) : prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gamePhase, activePlayer]);

  const handleFinishLobby = () => {
    setMessages(p => [...p, 'You are ready. Waiting for opponent...']);
    setTimeout(() => {
      setGamePhase('placement');
      setMessages(p => [...p, 'Both players are ready. Start placing ships!']);
    }, 1500);
  };

  const handleCellClick = (row, col) => {
    if (!selectedShipType || placedShipsCount[selectedShipType] >= SHIP_TYPES.find(ship => ship.type === selectedShipType).count) return;

    const shipSize = SHIP_TYPES.find(ship => ship.type === selectedShipType).size;
    const shipCells = [];
    let canPlace = true;

    for (let i = 0; i < shipSize; i++) {
      const r = orientation === 'horizontal' ? row : row + i;
      const c = orientation === 'vertical' ? col : col + i;
      if (r >= BOARD_SIZE || c >= BOARD_SIZE || playerBoard[r][c]) {
        canPlace = false;
        break;
      }
      shipCells.push(r * BOARD_SIZE + c);
    }

    if (canPlace) {
      const newBoard = [...playerBoard];
      for (let i = 0; i < shipSize; i++) {
        const r = orientation === 'horizontal' ? row : row + i;
        const c = orientation === 'vertical' ? col : col + i;
        newBoard[r][c] = 'ship';
      }
      setPlayerBoard(newBoard);
      setPlacedShipsCount(prev => ({ ...prev, [selectedShipType]: prev[selectedShipType] + 1 }));
      const newShip = { type: selectedShipType, size: shipSize, occupied: shipCells };
      setPlayerShips(prev => [...prev, newShip]);
      setSelectedShipType(null);
    }
  };

  const renderBoard = (board, isPlayerBoard) => (
    <div className="board">
      {board.map((row, rIdx) => (
        <div key={rIdx} className="board-row">
          {row.map((cell, cIdx) => {
            const cellClass = ["board-cell"];
            if (cell === 'ship' && isPlayerBoard) cellClass.push("ship-cell");
            if (cell === 'hit') cellClass.push("hit-cell");
            if (cell === 'miss') cellClass.push("miss-cell");
            return (
              <div
                key={cIdx}
                className={cellClass.join(' ')}
                onClick={() => isPlayerBoard && handleCellClick(rIdx, cIdx)}
              ></div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderPlacementControls = () => (
    <div className="placement-controls">
      <h3>Select Ship Type</h3>
      <div className="ship-selector">
        {SHIP_TYPES.map(ship => (
          <button
            key={ship.type}
            className={`ship-button ${selectedShipType === ship.type ? 'selected' : ''} ${orientation}`}
            onClick={() => setSelectedShipType(ship.type)}
          >
            {ship.type}
          </button>
        ))}
      </div>
      <div className="placement-actions">
        <button onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}>
          Rotate ({orientation})
        </button>
        <button
          className="finish-button"
          onClick={() => setMessages(p => [...p, 'Finish placement clicked'])}
        >
          Finish Placement
        </button>
      </div>
    </div>
  );

  return (
    <div className="game-container">
      <h1>Battleship Game</h1>
      <p>Player: {player} vs {opponent}</p>

      {gamePhase === 'lobby' && (
        <div className="waiting-screen">
          <h2>Lobby</h2>
          <p>Click when ready:</p>
          <button onClick={handleFinishLobby}>I'm Ready</button>
        </div>
      )}

      {gamePhase === 'placement' && (
        <div className="placement-phase">
          <h2>Place Your Ships</h2>
          {renderPlacementControls()}
          {renderBoard(playerBoard, true)}
        </div>
      )}

      {gamePhase === 'battle' && (
        <div>
          <h2>Battle Phase</h2>
        </div>
      )}

      {gamePhase === 'gameOver' && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}

      <div className="messages">
        <h2>Battle Log</h2>
        <ul>
          {messages.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default Game;
