import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Game.css';

const BOARD_SIZE = 10;
const SHIP_TYPES = [
  { type: "carrier", size: 5, count: 1 },
  { type: "cruiser", size: 4, count: 1 },
  { type: "battleship", size: 3, count: 1 },
  { type: "destroyer", size: 2, count: 1 },
];

const Game = () => {
  const location = useLocation();
  const { player, opponent, gameId } = location.state || { opponent: 'Unknown' };
  
  // Original Game.jsx state
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill(null)));
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  
  // Board.jsx state (gameplay mechanics)
  const [gamePhase, setGamePhase] = useState('placement'); // 'placement', 'battle', 'gameOver'
  const [activePlayer, setActivePlayer] = useState(1);
  const [playerShips, setPlayerShips] = useState([]);
  const [opponentShips, setOpponentShips] = useState([]);
  const [playerBoard, setPlayerBoard] = useState(Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill(null)));
  const [opponentBoard, setOpponentBoard] = useState(Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill(null)));
  const [playerAttacks, setPlayerAttacks] = useState([]);
  const [opponentAttacks, setOpponentAttacks] = useState([]);
  const [orientation, setOrientation] = useState('horizontal');
  const [selectedShipType, setSelectedShipType] = useState(null);
  const [placedShipsCount, setPlacedShipsCount] = useState({
    carrier: 0,
    cruiser: 0,
    battleship: 0,
    destroyer: 0,
  });
  const [timer, setTimer] = useState(60);
  const [playerMunitions, setPlayerMunitions] = useState({
    airplane: 2,
    bomb: 2,
  });
  const [specialMode, setSpecialMode] = useState('none');

  // Handle WebSocket connection and messages
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_SERVER_URL;
    const socket = new WebSocket(wsUrl);
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleSocketMessage(data);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      socket.close();
    };
  }, []);

  // Timer for turns
  useEffect(() => {
    if (gamePhase === 'battle') {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            switchTurn();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gamePhase, activePlayer]);

  const handleSocketMessage = (data) => {
    switch (data.type) {
      case 'ATTACK':
        handleOpponentAttack(data.position);
        break;
      case 'SHIP_PLACEMENT':
        setOpponentShips(data.ships);
        break;
      case 'GAME_START':
        setGamePhase('battle');
        break;
      case 'SPECIAL_ATTACK':
        handleSpecialAttack(data.position, data.specialType);
        break;
      case 'GAME_OVER':
        setGamePhase('gameOver');
        setMessages(prev => [...prev, `Game over! ${data.winner} wins!`]);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const handleAttack = useCallback((position) => {
    const { row, col } = position;
    
    // Check if this cell has already been attacked
    if (playerAttacks.some(attack => attack.row === row && attack.col === col)) {
      return;
    }

    // Record the attack
    const newAttack = { row, col };
    setPlayerAttacks(prev => [...prev, newAttack]);

    // Check if hit any opponent ship
    const isHit = checkIfHit(opponentShips, row, col);
    
    // Update opponent board
    const newOpponentBoard = [...opponentBoard];
    newOpponentBoard[row] = [...newOpponentBoard[row]];
    newOpponentBoard[row][col] = isHit ? 'hit' : 'miss';
    setOpponentBoard(newOpponentBoard);

    // Add message
    setMessages(prev => [...prev, `You attacked at ${row}, ${col} - ${isHit ? 'HIT!' : 'Miss'}`]);

    // Send attack to server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'ATTACK', 
        player, 
        gameId, 
        position: { row, col },
        result: isHit ? 'hit' : 'miss'
      }));
    }

    // Check if game is over
    if (checkIfAllShipsSunk(opponentShips, playerAttacks)) {
      setGamePhase('gameOver');
      setMessages(prev => [...prev, `You win!`]);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'GAME_OVER',
          player,
          gameId,
          winner: player
        }));
      }
    } else {
      switchTurn();
    }
  }, [playerAttacks, opponentBoard, opponentShips, ws, player, gameId]);

  const handleOpponentAttack = (position) => {
    const { row, col } = position;
    
    // Record the attack
    const newAttack = { row, col };
    setOpponentAttacks(prev => [...prev, newAttack]);

    // Check if hit any player ship
    const isHit = checkIfHit(playerShips, row, col);
    
    // Update player board
    const newPlayerBoard = [...playerBoard];
    newPlayerBoard[row] = [...newPlayerBoard[row]];
    newPlayerBoard[row][col] = isHit ? 'hit' : 'miss';
    setPlayerBoard(newPlayerBoard);

    // Add message
    setMessages(prev => [...prev, `${opponent} attacked at ${row}, ${col} - ${isHit ? 'HIT!' : 'Miss'}`]);

    // Check if game is over
    if (checkIfAllShipsSunk(playerShips, opponentAttacks)) {
      setGamePhase('gameOver');
      setMessages(prev => [...prev, `${opponent} wins!`]);
    } else {
      switchTurn();
    }
  };

  const calculateBufferZone = (occupiedCells) => {
    const buffer = new Set();
    occupiedCells.forEach(cell => {
      const row = Math.floor(cell / 10);
      const col = cell % 10;
      
      for (let r = Math.max(0, row - 1); r <= Math.min(9, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(9, col + 1); c++) {
          const neighbor = r * 10 + c;
          if (!occupiedCells.includes(neighbor)) {
            buffer.add(neighbor);
          }
        }
      }
    });
    
    return Array.from(buffer);
  };

  const handleShipPlacement = (row, col) => {
    if (!selectedShipType || gamePhase !== 'placement') return;
    
    const shipConfig = SHIP_TYPES.find(s => s.type === selectedShipType);
    const shipSize = shipConfig.size;
    
    if (placedShipsCount[selectedShipType] >= shipConfig.count) {
      setMessages(prev => [...prev, `You can only place ${shipConfig.count} ${selectedShipType}(s)`]);
      return;
    }

    let occupied = [];
    // Check if ship placement is valid
    if (orientation === 'horizontal') {
      if ((col + shipSize) > BOARD_SIZE) {
        setMessages(prev => [...prev, "Ship goes beyond board boundaries!"]);
        return;
      }
      
      for (let i = 0; i < shipSize; i++) {
        occupied.push((row * BOARD_SIZE) + (col + i));
      }
    } else {
      if ((row + shipSize) > BOARD_SIZE) {
        setMessages(prev => [...prev, "Ship goes beyond board boundaries!"]);
        return;
      }
      
      for (let i = 0; i < shipSize; i++) {
        occupied.push(((row + i) * BOARD_SIZE) + col);
      }
    }

    // Check if overlapping with other ships or buffer zones
    const bufferZone = calculateBufferZone(occupied);
    const allOccupied = playerShips.flatMap(ship => [...ship.occupied, ...ship.bufferZone]);
    const isOverlapping = occupied.some(cell => allOccupied.includes(cell));
    
    if (isOverlapping) {
      setMessages(prev => [...prev, "Ships cannot overlap or be adjacent!"]);
      return;
    }

    // Add the ship
    const newShip = {
      type: selectedShipType,
      size: shipSize,
      orientation,
      startRow: row,
      startCol: col,
      occupied,
      bufferZone,
      hits: []
    };

    // Update player board
    const newPlayerBoard = [...playerBoard];
    occupied.forEach(cellIndex => {
      const r = Math.floor(cellIndex / BOARD_SIZE);
      const c = cellIndex % BOARD_SIZE;
      if (!newPlayerBoard[r]) newPlayerBoard[r] = Array(BOARD_SIZE).fill(null);
      newPlayerBoard[r][c] = 'ship';
    });
    
    setPlayerBoard(newPlayerBoard);
    setPlayerShips(prev => [...prev, newShip]);
    setPlacedShipsCount(prev => ({
      ...prev,
      [selectedShipType]: prev[selectedShipType] + 1
    }));
  };

  const handleRotate = () => {
    setOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
  };

  const handleRemoveLastShip = () => {
    if (playerShips.length === 0) return;

    const lastShip = playerShips[playerShips.length - 1];
    
    // Update player board
    const newPlayerBoard = [...playerBoard];
    lastShip.occupied.forEach(cellIndex => {
      const row = Math.floor(cellIndex / BOARD_SIZE);
      const col = cellIndex % BOARD_SIZE;
      newPlayerBoard[row][col] = null;
    });
    
    setPlayerBoard(newPlayerBoard);
    setPlayerShips(prev => prev.slice(0, -1));
    setPlacedShipsCount(prev => ({
      ...prev,
      [lastShip.type]: prev[lastShip.type] - 1
    }));
  };

  const handleFinishPlacement = () => {
    // Check if all ships are placed
    const allShipsPlaced = SHIP_TYPES.every(ship => placedShipsCount[ship.type] >= ship.count);
    
    if (!allShipsPlaced) {
      setMessages(prev => [...prev, "You must place all ships before continuing!"]);
      return;
    }

    // Send ships placement to server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SHIP_PLACEMENT',
        player,
        gameId,
        ships: playerShips
      }));
    }

    setMessages(prev => [...prev, "Waiting for opponent to place ships..."]);
    
    // In a real multiplayer game, wait for server to signal game start
    // For now, simulate opponent ship placement
    setTimeout(() => {
      setGamePhase('battle');
      setMessages(prev => [...prev, "Game started! Your turn."]);
    }, 2000);
  };

  const handleSpecialMode = (mode) => {
    if (gamePhase !== 'battle' || playerMunitions[mode] <= 0) return;
    
    setSpecialMode(mode);
    setMessages(prev => [...prev, `Selected special attack: ${mode}`]);
  };

  const handleSpecialAttack = (position, specialType) => {
    const { row, col } = position;
    let targets = [];
    
    if (specialType === 'airplane') {
      // Airplane attacks a 2x2 grid
      targets = [
        { row, col },
        { row, col: col + 1 },
        { row: row + 1, col },
        { row: row + 1, col: col + 1 }
      ].filter(pos => pos.row < BOARD_SIZE && pos.col < BOARD_SIZE);
    } else if (specialType === 'bomb') {
      // Bomb attacks current cell and one to the right
      targets = [
        { row, col },
        { row, col: col + 1 }
      ].filter(pos => pos.col < BOARD_SIZE);
    }
    
    // Process each target
    targets.forEach(target => {
      if (!playerAttacks.some(attack => attack.row === target.row && attack.col === target.col)) {
        // Record the attack
        setPlayerAttacks(prev => [...prev, target]);
        
        // Check if hit
        const isHit = checkIfHit(opponentShips, target.row, target.col);
        
        // Update opponent board
        const newOpponentBoard = [...opponentBoard];
        if (!newOpponentBoard[target.row]) newOpponentBoard[target.row] = Array(BOARD_SIZE).fill(null);
        newOpponentBoard[target.row][target.col] = isHit ? 'hit' : 'miss';
        setOpponentBoard(newOpponentBoard);
      }
    });
    
    // Use up the special attack
    setPlayerMunitions(prev => ({
      ...prev,
      [specialType]: prev[specialType] - 1
    }));
    
    setSpecialMode('none');
    
    // Send to server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SPECIAL_ATTACK',
        player,
        gameId,
        position,
        specialType
      }));
    }
    
    // Check if game over
    if (checkIfAllShipsSunk(opponentShips, playerAttacks)) {
      setGamePhase('gameOver');
      setMessages(prev => [...prev, `You win!`]);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'GAME_OVER',
          player,
          gameId,
          winner: player
        }));
      }
    } else {
      switchTurn();
    }
  };

  const switchTurn = () => {
    setActivePlayer(prev => prev === 1 ? 2 : 1);
    setTimer(60);
    setSpecialMode('none');
  };

  const checkIfHit = (ships, row, col) => {
    const cellIndex = (row * BOARD_SIZE) + col;
    return ships.some(ship => ship.occupied.includes(cellIndex));
  };

  const checkIfAllShipsSunk = (ships, attacks) => {
    // Convert attacks to cell indices
    const attackedCells = attacks.map(attack => (attack.row * BOARD_SIZE) + attack.col);
    
    // Check if all ship cells have been hit
    return ships.every(ship => 
      ship.occupied.every(cell => attackedCells.includes(cell))
    );
  };

  const sendAttack = (row, col) => {
    if (gamePhase !== 'battle' || activePlayer !== 1) return;
    
    handleAttack({ row, col });
  };

  const sendSpecialAttack = (row, col) => {
    if (gamePhase !== 'battle' || activePlayer !== 1 || specialMode === 'none') return;
    
    handleSpecialAttack({ row, col }, specialMode);
  };

  const renderCell = (row, col, board, isPlayerBoard) => {
    const cellValue = board?.[row]?.[col];
    let cellClass = "board-cell";
    
    if (cellValue === 'ship' && isPlayerBoard) {
      cellClass += " ship-cell";
    } else if (cellValue === 'hit') {
      cellClass += " hit-cell";
    } else if (cellValue === 'miss') {
      cellClass += " miss-cell";
    }
    
    return (
      <button
        key={`${row}-${col}`}
        className={cellClass}
        onClick={() => {
          if (gamePhase === 'placement' && isPlayerBoard) {
            handleShipPlacement(row, col);
          } else if (gamePhase === 'battle' && !isPlayerBoard) {
            if (specialMode !== 'none') {
              sendSpecialAttack(row, col);
            } else {
              sendAttack(row, col);
            }
          }
        }}
      >
        {cellValue === 'hit' ? 'X' : 
         cellValue === 'miss' ? 'O' : ''}
      </button>
    );
  };

  const renderBoard = (board, isPlayerBoard) => {
    return (
      <div className="board">
        {Array(BOARD_SIZE).fill().map((_, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {Array(BOARD_SIZE).fill().map((_, colIndex) => (
              renderCell(rowIndex, colIndex, board, isPlayerBoard)
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderPlacementControls = () => {
    const allShipsPlaced = SHIP_TYPES.every(ship => placedShipsCount[ship.type] >= ship.count);
    
    return (
      <div className="placement-controls">
        <h3>Select Ship Type</h3>
        <div className="ship-selector">
          {SHIP_TYPES.map(ship => (
            <button
              key={ship.type}
              className={`ship-button ${selectedShipType === ship.type ? 'selected' : ''} ${placedShipsCount[ship.type] >= ship.count ? 'disabled' : ''}`}
              onClick={() => setSelectedShipType(ship.type)}
              disabled={placedShipsCount[ship.type] >= ship.count}
            >
              {ship.type} ({ship.size})
            </button>
          ))}
        </div>
        <div className="placement-actions">
          <button onClick={handleRotate}>
            Rotate ({orientation})
          </button>
          <button 
            onClick={handleRemoveLastShip}
            disabled={playerShips.length === 0}
          >
            Remove Last Ship
          </button>
          <button 
            onClick={handleFinishPlacement}
            disabled={!allShipsPlaced}
            className="finish-button"
          >
            Finish Placement
          </button>
        </div>
      </div>
    );
  };

  const renderBattleControls = () => {
    return (
      <div className="battle-controls">
        <h3>Special Attacks</h3>
        <div className="special-attacks">
          <button 
            className={`special-button ${specialMode === 'airplane' ? 'selected' : ''}`}
            onClick={() => handleSpecialMode('airplane')}
            disabled={playerMunitions.airplane <= 0}
          >
            Airplane ({playerMunitions.airplane})
          </button>
          <button 
            className={`special-button ${specialMode === 'bomb' ? 'selected' : ''}`}
            onClick={() => handleSpecialMode('bomb')}
            disabled={playerMunitions.bomb <= 0}
          >
            Bomb ({playerMunitions.bomb})
          </button>
          {specialMode !== 'none' && (
            <button onClick={() => setSpecialMode('none')}>
              Cancel
            </button>
          )}
        </div>
        <div className="turn-info">
          <p>Turn: {activePlayer === 1 ? player : opponent}</p>
          <p>Time left: {timer}s</p>
        </div>
      </div>
    );
  };

  const renderGameOver = () => {
    return (
      <div className="game-over">
        <h2>Game Over</h2>
        <button onClick={() => window.location.reload()}>
          Play Again
        </button>
      </div>
    );
  };

  return (
    <div className="game-container">
      <h1>Battleship Game</h1>
      <p>Playing against: {opponent}</p>
      
      {gamePhase === 'placement' && (
        <div className="placement-phase">
          <h2>Place Your Ships</h2>
          {renderPlacementControls()}
          {renderBoard(playerBoard, true)}
        </div>
      )}
      
      {gamePhase === 'battle' && (
        <div className="battle-phase">
          <h2>Battle!</h2>
          {renderBattleControls()}
          <div className="boards-container">
            <div className="player-board">
              <h3>Your Board</h3>
              {renderBoard(playerBoard, true)}
            </div>
            <div className="opponent-board">
              <h3>Opponent's Board</h3>
              {renderBoard(opponentBoard, false)}
            </div>
          </div>
        </div>
      )}
      
      {gamePhase === 'gameOver' && renderGameOver()}
      
      <div className="messages">
        <h2>Battle Log</h2>
        <ul>
          {messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Game;
