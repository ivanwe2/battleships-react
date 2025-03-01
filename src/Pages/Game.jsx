import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../Assets/Styles/Game.css';
import PlayerBoard from './GameComponents/PlayerBoard';
import OpponentBoard from './GameComponents/OpponentBoard';
import ShipPlacement from './GameComponents/ShipPlacement';
import GameStatus from './GameComponents/GameStatus';
import ChatBox from './GameComponents/ChatBox';

// Constants for game setup
const BOARD_SIZE = 10;
const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
];

const Game = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { player, opponent, gameId } = location.state || { opponent: 'Unknown' };
  
  // Reference to WebSocket
  const wsRef = useRef(null);
  
  // Game states
  const [gamePhase, setGamePhase] = useState('placement'); // 'placement', 'battle', 'gameOver'
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState(null);
  
  // Board states
  const [playerBoard, setPlayerBoard] = useState(
    Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null))
  );
  const [opponentBoard, setOpponentBoard] = useState(
    Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null))
  );
  
  // Ship states
  const [playerShips, setPlayerShips] = useState([]);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  
  // Chat messages
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Initialize WebSocket connection
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_SERVER_URL;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      // Join the game room
      socket.send(JSON.stringify({ 
        type: 'JOIN_GAME', 
        gameId, 
        player 
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleSocketMessage(data);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage('System', 'Connection error. Please try again.');
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      addMessage('System', 'Connection closed.');
    };

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'LEAVE_GAME', gameId, player }));
        socket.close();
      }
    };
  }, [gameId, player]);

  // Handle incoming socket messages
  const handleSocketMessage = (data) => {
    switch (data.type) {
      case 'GAME_JOINED':
        addMessage('System', `${data.player} joined the game.`);
        break;
      
      case 'GAME_LEFT':
        addMessage('System', `${data.player} left the game.`);
        break;
      
      case 'SHIPS_PLACED':
        if (data.player !== player) {
          addMessage('System', `${opponent} has placed all ships.`);
          if (gamePhase === 'battle') {
            setIsMyTurn(true);
            addMessage('System', "Your turn to attack!");
          }
        }
        break;
      
      case 'GAME_READY':
        setGamePhase('battle');
        setIsMyTurn(data.firstPlayer === player);
        addMessage('System', 'Game started! ' + (data.firstPlayer === player 
          ? 'Your turn first!' 
          : `${opponent} goes first!`));
        break;
      
      case 'ATTACK':
        if (data.attacker !== player) {
          const { row, col } = data.position;
          const result = processAttackOnPlayerBoard(row, col);
          wsRef.current.send(JSON.stringify({
            type: 'ATTACK_RESULT',
            gameId,
            attacker: data.attacker,
            defender: player,
            position: data.position,
            hit: result.hit,
            shipDestroyed: result.shipDestroyed
          }));
        }
        break;
      
      case 'ATTACK_RESULT':
        if (data.attacker === player) {
          updateOpponentBoard(data.position, data.hit, data.shipDestroyed);
          if (data.hit) {
            addMessage('Game', data.shipDestroyed 
              ? `You destroyed opponent's ${data.shipDestroyed}!` 
              : 'Hit!');
          } else {
            addMessage('Game', 'Miss!');
            setIsMyTurn(false);
          }
        } else {
          setIsMyTurn(true);
          addMessage('Game', 'Your turn to attack!');
        }
        break;
      
      case 'CHAT':
        if (data.from !== player) {
          addMessage(data.from, data.message);
        }
        break;
      
      case 'GAME_OVER':
        setGamePhase('gameOver');
        setWinner(data.winner);
        addMessage('System', `Game over! ${data.winner} wins!`);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Process an attack on the player's board
  const processAttackOnPlayerBoard = (row, col) => {
    const newBoard = [...playerBoard];
    
    // Check if there's a ship at this position
    const shipIndex = playerShips.findIndex(ship => 
      ship.positions.some(pos => pos.row === row && pos.col === col)
    );
    
    if (shipIndex !== -1) {
      // It's a hit
      newBoard[row][col] = 'hit';
      setPlayerBoard(newBoard);
      
      // Update ship hit status
      const newShips = [...playerShips];
      const ship = newShips[shipIndex];
      
      // Mark position as hit
      const posIndex = ship.positions.findIndex(pos => pos.row === row && pos.col === col);
      ship.positions[posIndex].hit = true;
      
      // Check if ship is destroyed
      const isDestroyed = ship.positions.every(pos => pos.hit);
      
      if (isDestroyed) {
        ship.destroyed = true;
        
        // Check if all ships are destroyed
        const allDestroyed = newShips.every(s => s.destroyed);
        if (allDestroyed) {
          // Game over, opponent wins
          wsRef.current.send(JSON.stringify({
            type: 'GAME_OVER',
            gameId,
            winner: opponent
          }));
        }
        
        setPlayerShips(newShips);
        return { hit: true, shipDestroyed: ship.name };
      }
      
      setPlayerShips(newShips);
      return { hit: true, shipDestroyed: null };
    } else {
      // It's a miss
      newBoard[row][col] = 'miss';
      setPlayerBoard(newBoard);
      return { hit: false, shipDestroyed: null };
    }
  };

  // Update opponent's board based on attack result
  const updateOpponentBoard = (position, hit, shipDestroyed) => {
    const { row, col } = position;
    const newBoard = [...opponentBoard];
    
    newBoard[row][col] = hit ? 'hit' : 'miss';
    setOpponentBoard(newBoard);
    
    if (shipDestroyed) {
      // If a ship was destroyed, we could mark adjacent cells or update UI
      console.log(`Destroyed opponent's ${shipDestroyed}`);
    }
  };

  // Handle player's attack on opponent's board
  const handleAttack = (row, col) => {
    if (gamePhase !== 'battle' || !isMyTurn || opponentBoard[row][col] !== null) {
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'ATTACK',
      gameId,
      attacker: player,
      defender: opponent,
      position: { row, col }
    }));
  };

  // Add a chat or system message
  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text, time: new Date().toLocaleTimeString() }]);
  };

  // Send a chat message
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'CHAT',
      gameId,
      from: player,
      message: newMessage
    }));
    
    addMessage(player, newMessage);
    setNewMessage('');
  };

  // Place a ship on the player's board
  const placeShip = (startRow, startCol) => {
    if (currentShipIndex >= SHIPS.length) return;
    
    const ship = SHIPS[currentShipIndex];
    const shipPositions = [];
    
    // Check if ship placement is valid
    for (let i = 0; i < ship.size; i++) {
      const row = isHorizontal ? startRow : startRow + i;
      const col = isHorizontal ? startCol + i : startCol;
      
      // Check if out of bounds
      if (row >= BOARD_SIZE || col >= BOARD_SIZE) {
        return false;
      }
      
      // Check if overlapping with another ship
      if (playerBoard[row][col] !== null) {
        return false;
      }
      
      shipPositions.push({ row, col, hit: false });
    }
    
    // Place the ship on the board
    const newBoard = [...playerBoard];
    shipPositions.forEach(pos => {
      newBoard[pos.row][pos.col] = 'ship';
    });
    
    // Add the ship to player's ships
    const newShips = [...playerShips];
    newShips.push({
      id: currentShipIndex,
      name: ship.name,
      size: ship.size,
      positions: shipPositions,
      destroyed: false
    });
    
    setPlayerBoard(newBoard);
    setPlayerShips(newShips);
    setCurrentShipIndex(prev => prev + 1);
    
    // If all ships placed, ready to start game
    if (currentShipIndex === SHIPS.length - 1) {
      wsRef.current.send(JSON.stringify({
        type: 'SHIPS_PLACED',
        gameId,
        player
      }));
      addMessage('System', 'All ships placed. Waiting for opponent...');
    }
    
    return true;
  };

  // Rotate the current ship
  const rotateShip = () => {
    setIsHorizontal(!isHorizontal);
  };

  // Reset ship placement
  const resetPlacement = () => {
    setPlayerBoard(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
    setPlayerShips([]);
    setCurrentShipIndex(0);
  };

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>Battleships</h1>
        <GameStatus 
          gamePhase={gamePhase} 
          isMyTurn={isMyTurn} 
          player={player} 
          opponent={opponent}
          winner={winner}
        />
      </header>
      
      <div className="game-content">
        {gamePhase === 'placement' ? (
          <ShipPlacement
            board={playerBoard}
            placeShip={placeShip}
            rotateShip={rotateShip}
            resetPlacement={resetPlacement}
            currentShip={currentShipIndex < SHIPS.length ? SHIPS[currentShipIndex] : null}
            isHorizontal={isHorizontal}
            boardSize={BOARD_SIZE}
          />
        ) : (
          <div className="boards-container">
            <div className="board-wrapper">
              <h2>Your Board</h2>
              <PlayerBoard 
                board={playerBoard} 
                ships={playerShips}
                boardSize={BOARD_SIZE}
              />
            </div>
            
            <div className="board-wrapper">
              <h2>Opponent's Board</h2>
              <OpponentBoard 
                board={opponentBoard}
                handleAttack={handleAttack}
                isMyTurn={isMyTurn}
                gamePhase={gamePhase}
                boardSize={BOARD_SIZE}
              />
            </div>
          </div>
        )}
        
        <ChatBox 
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={sendMessage}
        />
      </div>
      
      {gamePhase === 'gameOver' && (
        <div className="game-over-actions">
          <button onClick={() => navigate('/lobby')}>
            Return to Lobby
          </button>
          <button onClick={() => {
            setGamePhase('placement');
            resetPlacement();
            setOpponentBoard(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)));
            setMessages([]);
            setWinner(null);
          }}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Game;