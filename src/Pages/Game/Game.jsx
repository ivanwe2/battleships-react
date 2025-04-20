import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../Hooks/useWebSocket';
import { sendAttack } from '../../api/gameApi';
import { 
  makeAttack, 
  receiveAttack, 
  startGame, 
  endGame, 
  addMessage 
} from '../../redux/slices/gameSlice';
import Board from '../../Components/Game/Board';
import MessageLog from '../../Components/Game/MessageLog';
import './Game.css';

const Game = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { player, opponent, gameId } = location.state || {};
  
  const { 
    board, 
    opponentBoard, 
    messages, 
    gameStatus, 
    turn, 
    winner 
  } = useSelector(state => state.game);
  
  const currentPlayer = useSelector(state => state.players.currentPlayer);

  // If we don't have required data, redirect to lobby
  useEffect(() => {
    if (!player || !opponent || !gameId) {
      navigate('/lobby');
    } else {
      // Initialize the game in Redux
      dispatch(startGame({ gameId, opponent }));
    }
  }, [player, opponent, gameId, dispatch, navigate]);

  // WebSocket message handlers
  const messageHandlers = {
    ATTACK: (data) => {
      const { position, hit } = data;
      dispatch(receiveAttack({ 
        row: position.row, 
        col: position.col,
        hit: hit || false
      }));
    },
    GAME_OVER: (data) => {
      dispatch(endGame({ winner: data.winner }));
    },
    GAME_MESSAGE: (data) => {
      dispatch(addMessage(data.message));
    },
    ERROR: (data) => {
      dispatch(addMessage(`Error: ${data.message}`));
    }
  };

  // Initialize WebSocket
  const { isConnected } = useWebSocket(messageHandlers);

  // Handle player's attack
  const handleCellClick = useCallback((row, col) => {
    if (gameStatus !== 'in-progress' || turn !== 'player' || !isConnected) return;
    
    // Update local state
    dispatch(makeAttack({ row, col }));
    
    // Send attack to server
    sendAttack(currentPlayer, gameId, { row, col });
  }, [gameStatus, turn, isConnected, dispatch, currentPlayer, gameId]);

  // Determine if game board should be disabled
  const isBoardDisabled = gameStatus !== 'in-progress' || turn !== 'player';

  if (!player || !opponent) {
    return <div>Loading...</div>;
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Battleships</h1>
        <div className="game-status">
          {gameStatus === 'in-progress' ? (
            <p>Playing against: <strong>{opponent}</strong> - {turn === 'player' ? "Your turn" : "Opponent's turn"}</p>
          ) : gameStatus === 'finished' ? (
            <p className="game-over">{winner === 'player' ? 'You won!' : 'Opponent won!'}</p>
          ) : (
            <p>Game starting...</p>
          )}
        </div>
      </div>

      <div className="game-content">
        <div className="boards-container">
          <div className="board-section">
            <h2>Your Fleet</h2>
            <Board 
              board={board} 
              onCellClick={() => {}} 
              isDisabled={true} 
            />
          </div>

          <div className="board-section">
            <h2>Enemy Waters</h2>
            <Board 
              board={opponentBoard} 
              onCellClick={handleCellClick} 
              isDisabled={isBoardDisabled} 
            />
          </div>
        </div>

        <MessageLog messages={messages} />
      </div>
    </div>
  );
};

export default Game;