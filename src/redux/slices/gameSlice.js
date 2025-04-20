import { createSlice } from '@reduxjs/toolkit';

const BOARD_SIZE = 10;

const initialState = {
  board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)),
  opponentBoard: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null)),
  messages: [],
  gameId: null,
  opponent: null,
  gameStatus: 'idle', // 'idle', 'in-progress', 'finished'
  turn: null, // 'player', 'opponent'
  winner: null
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action) => {
      state.gameId = action.payload.gameId;
      state.opponent = action.payload.opponent;
      state.gameStatus = 'in-progress';
      state.turn = 'player'; // Assume player goes first
      state.winner = null;
      state.messages = [];
    },
    makeAttack: (state, action) => {
      const { row, col } = action.payload;
      state.opponentBoard[row][col] = 'attacked';
      state.turn = 'opponent';
      state.messages.push(`You attacked (${row}, ${col})`);
    },
    receiveAttack: (state, action) => {
      const { row, col, hit } = action.payload;
      state.board[row][col] = hit ? 'hit' : 'miss';
      state.turn = 'player';
      state.messages.push(`Opponent attacked (${row}, ${col}) - ${hit ? 'HIT!' : 'Miss'}`);
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    endGame: (state, action) => {
      state.gameStatus = 'finished';
      state.winner = action.payload.winner;
      state.messages.push(`Game over. ${action.payload.winner === 'player' ? 'You won!' : 'Opponent won!'}`);
    },
    resetGame: () => initialState
  }
});

export const {
  startGame,
  makeAttack,
  receiveAttack,
  addMessage,
  endGame,
  resetGame
} = gameSlice.actions;

export default gameSlice.reducer;