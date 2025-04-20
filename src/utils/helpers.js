import { BOARD_SIZE, CELL_STATUS } from './constants';

/**
 * Creates a new empty game board
 * @returns {Array<Array<null>>} A 2D array representing the game board
 */
export const createEmptyBoard = () => {
  return Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));
};

/**
 * Creates a deep copy of a 2D board array
 * @param {Array<Array<any>>} board - The board to copy
 * @returns {Array<Array<any>>} A deep copy of the board
 */
export const deepCopyBoard = (board) => {
  return board.map(row => [...row]);
};

/**
 * Validates if a position is within the board boundaries
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} True if the position is valid
 */
export const isValidPosition = (row, col) => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

/**
 * Formats a position object as a readable string
 * @param {Object} position - The position object
 * @param {number} position.row - Row index
 * @param {number} position.col - Column index
 * @returns {string} Formatted position (e.g., "A5")
 */
export const formatPosition = (position) => {
  const letters = 'ABCDEFGHIJ';
  return `${letters[position.row]}${position.col + 1}`;
};

/**
 * Generates a unique game ID based on player names and timestamp
 * @param {string} player1 - First player name
 * @param {string} player2 - Second player name
 * @returns {string} A unique game ID
 */
export const generateGameId = (player1, player2) => {
  const timestamp = Date.now();
  return `game-${player1}-${player2}-${timestamp}`;
};

/**
 * Debounces a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} The debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};