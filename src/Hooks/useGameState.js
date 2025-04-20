// src/hooks/useGameState.js
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  makeAttack, 
  receiveAttack, 
  startGame,
  endGame, 
  addMessage,
  resetGame
} from '../redux/slices/gameSlice';
import { sendAttack } from '../api/gameApi';
import { isValidPosition, formatPosition } from '../utils/helpers';
import { GAME_STATUS, TURN } from '../utils/constants';

export const useGameState = (gameId) => {
  const dispatch = useDispatch();
  const game = useSelector(state => state.game);
  const currentPlayer = useSelector(state => state.players.currentPlayer);
  
  const { 
    board, 
    opponentBoard, 
    messages, 
    gameStatus, 
    turn, 
    opponent,
    winner 
  } = game;

  // Initialize a new game
  const initializeGame = useCallback((opponent, newGameId) => {
    dispatch(startGame({ 
      gameId: newGameId || gameId, 
      opponent 
    }));
    dispatch(addMessage(`Game started against ${opponent}`));
  }, [dispatch, gameId]);

  // Handle player's attack
  const attackPosition = useCallback((row, col) => {
    // Validate turn and position
    if (
      gameStatus !== GAME_STATUS.IN_PROGRESS || 
      turn !== TURN.PLAYER ||
      !isValidPosition(row, col) ||
      opponentBoard[row][col] !== null
    ) {
      return false;
    }
    
    // Update local state
    dispatch(makeAttack({ row, col }));
    
    // Send attack to server
    sendAttack(currentPlayer, gameId, { row, col });
    
    // Add message
    dispatch(addMessage(`You attacked ${formatPosition({ row, col })}`));
    
    return true;
  }, [gameStatus, turn, opponentBoard, dispatch, currentPlayer, gameId]);

  // Process an incoming attack from opponent
  const processIncomingAttack = useCallback((position, hit) => {
    const { row, col } = position;
    
    if (!isValidPosition(row, col)) {
      console.error('Invalid attack position received');
      return false;
    }
    
    dispatch(receiveAttack({ row, col, hit }));
    dispatch(addMessage(
      `Opponent attacked ${formatPosition(position)} - ${hit ? 'HIT!' : 'Miss'}`
    ));
    
    return true;
  }, [dispatch]);

  // End the current game
  const finishGame = useCallback((winningPlayer) => {
    const isPlayerWinner = winningPlayer === currentPlayer;
    dispatch(endGame({ winner: isPlayerWinner ? 'player' : 'opponent' }));
    dispatch(addMessage(
      isPlayerWinner ? 'Congratulations! You won!' : 'Game over. Opponent won.'
    ));
  }, [currentPlayer, dispatch]);

  // Reset the game state
  const resetGameState = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  return {
    // Game state
    board,
    opponentBoard,
    messages,
    gameStatus,
    turn,
    opponent,
    winner,
    
    // Actions
    initializeGame,
    attackPosition,
    processIncomingAttack,
    finishGame,
    resetGameState,
    
    // Computed values
    isPlayerTurn: turn === TURN.PLAYER,
    isGameActive: gameStatus === GAME_STATUS.IN_PROGRESS,
    isGameOver: gameStatus === GAME_STATUS.FINISHED
  };
};