import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Game.css';

// Ship configuration
const SHIPS = [
  { id: 'carrier', name: 'Carrier', size: 5, color: '#444444' },
  { id: 'battleship', name: 'Battleship', size: 4, color: '#555555' },
  { id: 'cruiser', name: 'Cruiser', size: 3, color: '#666666' },
  { id: 'submarine', name: 'Submarine', size: 3, color: '#777777' },
  { id: 'destroyer', name: 'Destroyer', size: 2, color: '#888888' }
];

const BOARD_SIZE = 10;
const CELL_SIZE = 40;

const Game = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { player, opponent, gameId } = location.state || { opponent: 'Unknown', gameId: null };
  
  // Game states
  const [gamePhase, setGamePhase] = useState('placement'); // 'placement', 'battle', 'gameOver'
  const [playerBoard, setPlayerBoard] = useState(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
  const [opponentBoard, setOpponentBoard] = useState(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [shipOrientation, setShipOrientation] = useState('horizontal');
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [winner, setWinner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [gameReady, setGameReady] = useState(false);
  const [currentGameId, setCurrentGameId] = useState(gameId); // Track the current game ID separately
  
  // Add message to the message log
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, { text: message, time: new Date() }]);
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    // Use environment variable for WebSocket URL or fallback
    const wsUrl = process.env.REACT_APP_WS_SERVER_URL || 'ws://localhost:8080';
    const socket = new WebSocket(wsUrl);
    setWs(socket);
  
    socket.onopen = () => {
      addMessage('Connected to server');
      
      // Add a short delay to ensure the connection is fully established
      setTimeout(() => {
        // Only join the game if gameId exists
        if (gameId) {
          socket.send(JSON.stringify({ 
            type: 'JOIN_GAME', 
            gameId, 
            player,
            timestamp: new Date().getTime()
          }));
        } else {
          // If no gameId, create a new game instead
          socket.send(JSON.stringify({
            type: 'CREATE_GAME',
            player
          }));
        }
      }, 1000); // Increased delay for reliability
    };
  
    socket.onmessage = handleSocketMessage;
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage('Connection error');
    };
  
    socket.onclose = () => {
      addMessage('Disconnected from server');
      
      // You might want to implement reconnection logic here
      // For example:
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          addMessage('Attempting to reconnect...');
          navigate('/game', { state: { player, opponent, gameId: currentGameId }});
        }
      }, 3000);
    };
  
    return () => {
      // Leave the game when component unmounts
      if (socket.readyState === WebSocket.OPEN && currentGameId) {
        socket.send(JSON.stringify({ type: 'LEAVE_GAME', gameId: currentGameId, player }));
      }
      socket.close();
    };
  }, [gameId, player, addMessage, navigate, opponent, currentGameId]);

  // Handle receiving an attack
  const handleIncomingAttack = useCallback((position) => {
    const { row, col } = position;
    const board = [...playerBoard];
    
    // Check if the attack hit a ship
    let hit = false;
    let shipDestroyed = null;
    
    placedShips.forEach(ship => {
      const shipCells = getShipCells(ship);
      const hitCell = shipCells.find(cell => cell.row === row && cell.col === col);
      
      if (hitCell) {
        hit = true;
        
        // Mark this part of the ship as hit
        const updatedShip = { 
          ...ship, 
          hits: ship.hits ? [...ship.hits, { row, col }] : [{ row, col }] 
        };
        
        // Check if ship is destroyed
        if (updatedShip.hits.length === ship.size) {
          shipDestroyed = ship.id;
        }
        
        // Update the ships array
        setPlacedShips(prev => 
          prev.map(s => s.id === ship.id ? updatedShip : s)
        );
      }
    });
    
    // Update the board
    board[row][col] = hit ? 'hit' : 'miss';
    setPlayerBoard(board);
    
    // Send result back to server
    ws.send(JSON.stringify({
      type: 'ATTACK_RESULT',
      gameId: currentGameId,
      attacker: opponent,
      defender: player,
      position,
      hit,
      shipDestroyed
    }));
    
    if (!hit) {
      setIsPlayerTurn(true);
      addMessage("Opponent missed! Your turn.");
    } else {
      addMessage(shipDestroyed ? 
        `Opponent sunk your ${shipDestroyed}!` : 
        "Opponent hit your ship!"
      );
    }
  }, [playerBoard, placedShips, ws, currentGameId, opponent, player, addMessage]);

  // Handle attack result
  const handleAttackResult = useCallback((data) => {
    const { position, hit, shipDestroyed } = data;
    const { row, col } = position;
    
    // Update opponent board
    const board = [...opponentBoard];
    board[row][col] = hit ? 'hit' : 'miss';
    setOpponentBoard(board);
    
    if (hit) {
      addMessage(shipDestroyed ? 
        `You sunk their ${shipDestroyed}!` : 
        "It's a hit! Fire again!"
      );
    } else {
      addMessage("You missed!");
      setIsPlayerTurn(false);
    }
  }, [opponentBoard, addMessage]);

  const handleSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);
    
      switch (data.type) {
        case 'GAME_CREATED':
          addMessage(`Game created with ID: ${data.gameId}`);
          // Update the gameId state
          setCurrentGameId(data.gameId);
          navigate('/game', { state: { player, opponent: 'Waiting for opponent', gameId: data.gameId }, replace: true });
          break;
          
        case 'GAME_JOINED':
          addMessage(`${data.player} joined the game`);
          break;
        
        case 'GAME_LEFT':
          addMessage(`${data.player} left the game`);
          break;
        
        case 'SHIPS_PLACED':
          addMessage(`${data.player} placed all ships`);
          break;
        
        case 'GAME_READY':
          setGamePhase('battle');
          setGameReady(true);
          setIsPlayerTurn(data.firstPlayer === player);
          addMessage(`Game started! ${data.firstPlayer} goes first`);
          break;
        
        case 'ATTACK':
          handleIncomingAttack(data.position);
          break;
        
        case 'ATTACK_RESULT':
          handleAttackResult(data);
          break;
        
        case 'GAME_OVER':
          setGamePhase('gameOver');
          setWinner(data.winner);
          addMessage(`Game over! ${data.winner} wins!`);
          break;
        
        case 'CHAT':
          addMessage(`${data.from}: ${data.message}`);
          break;
        
        case 'ERROR':
          addMessage(`Error: ${data.message}`);
          // If game not found, try to create a new game
          if (data.message === 'Game not found') {
            setTimeout(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'CREATE_GAME',
                  player
                }));
              }
            }, 1000);
          }
          break;
        
        case 'RECONNECTED':
          addMessage(`Reconnected to game against ${data.opponent}`);
          // Update the current game ID
          if (data.gameId && data.gameId !== currentGameId) {
            setCurrentGameId(data.gameId);
          }
          if (data.gamePhase === 'battle') {
            setGamePhase('battle');
            setGameReady(true);
          }
          break;
        
        case 'START_GAME':
          // This is received when a game is ready to start
          if (data.gameId && data.gameId !== currentGameId) {
            setCurrentGameId(data.gameId);
            navigate('/game', { state: { player, opponent: data.opponent, gameId: data.gameId }, replace: true });
          }
          addMessage(`Starting game against ${data.opponent}`);
          break;
        
        default:
          console.log(`Unhandled message type: ${data.type}`);
          break;
      }
    } catch (error) {
      console.error('Error processing websocket message:', error);
      addMessage('Error processing game data');
    }
  }, [player, addMessage, navigate, ws, handleIncomingAttack, handleAttackResult, currentGameId]);

  // Get all cells occupied by a ship
  const getShipCells = useCallback((ship) => {
    const cells = [];
    const { row, col, orientation, size } = ship;
    
    for (let i = 0; i < size; i++) {
      if (orientation === 'horizontal') {
        cells.push({ row, col: col + i });
      } else {
        cells.push({ row: row + i, col });
      }
    }
    
    return cells;
  }, []);

  // Check if a ship placement is valid
  const isValidPlacement = useCallback((ship, placementRow, placementCol, orientation) => {
    const size = ship.size;
    
    // Check if ship is within board boundaries
    if (orientation === 'horizontal') {
      if (placementCol + size > BOARD_SIZE) return false;
    } else {
      if (placementRow + size > BOARD_SIZE) return false;
    }
    
    // Check if ship overlaps with other ships
    for (let i = 0; i < size; i++) {
      const row = orientation === 'horizontal' ? placementRow : placementRow + i;
      const col = orientation === 'horizontal' ? placementCol + i : placementCol;
      
      // Check boundaries
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
      
      // Check for overlaps with placed ships
      if (playerBoard[row][col] !== null) return false;
      
      // Check for adjacency (diagonal is ok)
      const adjacentCells = [
        { r: row-1, c: col }, // up
        { r: row+1, c: col }, // down
        { r: row, c: col-1 }, // left
        { r: row, c: col+1 }  // right
      ];
      
      for (const cell of adjacentCells) {
        if (cell.r >= 0 && cell.r < BOARD_SIZE && cell.c >= 0 && cell.c < BOARD_SIZE) {
          if (playerBoard[cell.r][cell.c] !== null) return false;
        }
      }
    }
    
    return true;
  }, [playerBoard]);

  // Handle ship placement
  const placeShip = useCallback((shipId, row, col) => {
    if (gamePhase !== 'placement') return;
    
    const ship = SHIPS.find(s => s.id === shipId);
    if (!ship) return;
    
    if (!isValidPlacement(ship, row, col, shipOrientation)) {
      addMessage(`Cannot place ${ship.name} there!`);
      return;
    }
    
    // Create a new ship object
    const newShip = {
      ...ship,
      row,
      col,
      orientation: shipOrientation
    };
    
    // Add ship to placed ships
    setPlacedShips(prev => [...prev.filter(s => s.id !== shipId), newShip]);
    
    // Update board
    const newBoard = [...playerBoard];
    const cells = getShipCells(newShip);
    
    cells.forEach(cell => {
      newBoard[cell.row][cell.col] = shipId;
    });
    
    setPlayerBoard(newBoard);
    setSelectedShip(null);
    addMessage(`${ship.name} placed!`);
  }, [gamePhase, shipOrientation, isValidPlacement, playerBoard, getShipCells, addMessage]);

  // Handle cell click during ship placement
  const handleCellClick = useCallback((row, col, isOpponentBoard) => {
    if (isOpponentBoard) {
      // Handle attack
      if (gamePhase === 'battle' && isPlayerTurn && opponentBoard[row][col] === null) {
        ws.send(JSON.stringify({
          type: 'ATTACK',
          gameId: currentGameId,
          attacker: player,
          defender: opponent,
          position: { row, col }
        }));
      }
    } else {
      // Handle ship placement
      if (gamePhase === 'placement' && selectedShip) {
        placeShip(selectedShip, row, col);
      }
    }
  }, [gamePhase, isPlayerTurn, opponentBoard, ws, currentGameId, player, opponent, selectedShip, placeShip]);

  // Rotate ship orientation
  const rotateShip = useCallback(() => {
    setShipOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
    addMessage(`Ship orientation: ${shipOrientation === 'horizontal' ? 'vertical' : 'horizontal'}`);
  }, [shipOrientation, addMessage]);

  // Reset ships (during placement phase)
  const resetShips = useCallback(() => {
    setPlayerBoard(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
    setPlacedShips([]);
    setSelectedShip(null);
    addMessage('Placement reset');
  }, [addMessage]);

  // Submit ship placement
  const submitPlacement = useCallback(() => {
    if (placedShips.length !== SHIPS.length) {
      addMessage('Place all ships before starting!');
      return;
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SHIPS_PLACED',
        gameId: currentGameId,
        player,
        ships: placedShips
      }));
      
      addMessage('Ready for battle! Waiting for opponent...');
    } else {
      addMessage('Error: Connection lost. Please refresh the page.');
    }
  }, [placedShips, ws, currentGameId, player, addMessage]);

  // Render a single cell
  const renderCell = useCallback((row, col, isOpponentBoard = false) => {
    const board = isOpponentBoard ? opponentBoard : playerBoard;
    const cellValue = board[row][col];
    let cellClass = 'board-cell';
    let cellContent = null;
    
    if (isOpponentBoard) {
      if (cellValue === 'hit') {
        cellClass += ' hit';
        cellContent = '💥';
      } else if (cellValue === 'miss') {
        cellClass += ' miss';
        cellContent = '💦';
      } else {
        cellClass += ' enemy-cell';
      }
      
      // Highlight clickable cells during player's turn
      if (gamePhase === 'battle' && isPlayerTurn && cellValue === null) {
        cellClass += ' clickable';
      }
    } else {
      if (cellValue === 'hit') {
        cellClass += ' hit';
        cellContent = '💥';
      } else if (cellValue === 'miss') {
        cellClass += ' miss';
        cellContent = '💦';
      } else if (cellValue !== null) {
        // This is a ship cell
        const ship = SHIPS.find(s => s.id === cellValue);
        if (ship) {
          cellClass += ' ship-cell';
          cellClass += ` ${cellValue}-cell`;
        }
      } else if (gamePhase === 'placement' && selectedShip) {
        // Preview ship placement during selection
        const ship = SHIPS.find(s => s.id === selectedShip);
        if (ship) {
          const valid = isValidPlacement(ship, row, col, shipOrientation);
          
          // Check if this cell would be part of the selected ship
          const wouldBePartOfShip = shipOrientation === 'horizontal' 
            ? col < BOARD_SIZE - ship.size + 1 && Array.from({ length: ship.size }).some((_, i) => row === row && col + i === col)
            : row < BOARD_SIZE - ship.size + 1 && Array.from({ length: ship.size }).some((_, i) => row + i === row && col === col);
            
          if (wouldBePartOfShip) {
            cellClass += valid ? ' valid-placement' : ' invalid-placement';
          }
        }
      }
    }
    
    return (
      <div
        key={`${row}-${col}`}
        className={cellClass}
        onClick={() => handleCellClick(row, col, isOpponentBoard)}
      >
        {cellContent || ''}
        <span className="cell-coordinate">{String.fromCharCode(65 + col)}{row + 1}</span>
      </div>
    );
  }, [playerBoard, opponentBoard, gamePhase, isPlayerTurn, selectedShip, shipOrientation, isValidPlacement, handleCellClick]);

  // Render the game board
  const renderBoard = useCallback((isOpponentBoard = false) => {
    const rows = [];
    
    // Add column labels (A-J)
    const colLabels = (
      <div className="board-labels column-labels">
        <div className="board-label corner-label"></div>
        {Array(BOARD_SIZE).fill().map((_, i) => (
          <div key={i} className="board-label">{String.fromCharCode(65 + i)}</div>
        ))}
      </div>
    );
    
    // Create each row with row label (1-10)
    for (let i = 0; i < BOARD_SIZE; i++) {
      const cells = [];
      cells.push(<div key={`row-${i}`} className="board-label">{i + 1}</div>);
      
      for (let j = 0; j < BOARD_SIZE; j++) {
        cells.push(renderCell(i, j, isOpponentBoard));
      }
      
      rows.push(<div key={i} className="board-row">{cells}</div>);
    }
    
    return (
      <div className={`board-container ${isOpponentBoard ? 'opponent-board' : 'player-board'}`}>
        <h2>{isOpponentBoard ? `${opponent}'s Board` : 'Your Fleet'}</h2>
        <div className="board">
          {colLabels}
          {rows}
        </div>
      </div>
    );
  }, [renderCell, opponent]);

  // Render ship selection panel
  const renderShipSelection = useCallback(() => {
    if (gamePhase !== 'placement') return null;
    
    return (
      <div className="ship-selection">
        <h2>Place Your Ships</h2>
        <div className="ship-controls">
          <button onClick={rotateShip} className="rotate-button">
            Rotate Ship ({shipOrientation})
          </button>
          <button onClick={resetShips} className="reset-button">
            Reset Placement
          </button>
        </div>
        <div className="ships-list">
          {SHIPS.map(ship => {
            const isPlaced = placedShips.some(p => p.id === ship.id);
            return (
              <div 
                key={ship.id} 
                className={`ship-item ${isPlaced ? 'placed' : ''} ${selectedShip === ship.id ? 'selected' : ''}`}
                onClick={() => !isPlaced && setSelectedShip(ship.id)}
              >
                <div className="ship-preview" style={{ 
                  width: shipOrientation === 'horizontal' ? CELL_SIZE * ship.size : CELL_SIZE,
                  height: shipOrientation === 'vertical' ? CELL_SIZE * ship.size : CELL_SIZE,
                  backgroundColor: ship.color
                }}>
                  <div className="ship-name">{ship.name}</div>
                </div>
                <div className="ship-status">
                  {isPlaced ? '✓ Placed' : 'Select to place'}
                </div>
              </div>
            );
          })}
        </div>
        {placedShips.length === SHIPS.length && (
          <button 
            onClick={submitPlacement} 
            className="submit-button"
          >
            Ready for Battle!
          </button>
        )}
      </div>
    );
  }, [gamePhase, shipOrientation, selectedShip, placedShips, rotateShip, resetShips, submitPlacement]);

  // Render game status
  const renderGameStatus = useCallback(() => {
    let statusMessage = '';
    
    if (gamePhase === 'placement') {
      statusMessage = 'Place your ships on the board';
    } else if (gamePhase === 'battle') {
      statusMessage = isPlayerTurn ? 'Your turn to attack!' : 'Opponent is attacking...';
    } else if (gamePhase === 'gameOver') {
      statusMessage = winner === player ? 'Victory! You won the battle!' : 'Defeat! Better luck next time.';
    }
    
    return (
      <div className={`game-status ${gamePhase}`}>
        <h2 className="status-message">{statusMessage}</h2>
        {gamePhase === 'gameOver' && (
          <button onClick={() => navigate('/lobby')} className="return-button">
            Return to Lobby
          </button>
        )}
      </div>
    );
  }, [gamePhase, isPlayerTurn, winner, player, navigate]);

  // Render message log
  const renderMessages = useCallback(() => {
    return (
      <div className="messages-container">
        <h2>Battle Log</h2>
        <div className="messages-list">
          {messages.map((message, index) => (
            <div key={index} className="message-item">
              <span className="message-time">
                {message.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="message-text">{message.text}</span>
            </div>
          ))}
        </div>
        {currentGameId && (
          <div className="game-id">Game ID: {currentGameId}</div>
        )}
      </div>
    );
  }, [messages, currentGameId]);

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Battleships</h1>
        {renderGameStatus()}
      </div>
      
      <div className="game-content">
        <div className="boards-container">
          {renderBoard(false)}
          {gamePhase !== 'placement' && renderBoard(true)}
        </div>
        
        <div className="game-sidebar">
          {renderShipSelection()}
          {renderMessages()}
        </div>
      </div>
    </div>
  );
};

export default Game;