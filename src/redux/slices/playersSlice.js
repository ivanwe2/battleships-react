import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  players: [],
  currentPlayer: null,
  isLoggedIn: false,
  pending: false,
  error: null
};

export const playersSlice = createSlice({
  name: 'players',
  initialState,
  reducers: {
    registerPlayerStart: (state) => {
      state.pending = true;
      state.error = null;
    },
    registerPlayerSuccess: (state, action) => {
      state.currentPlayer = action.payload;
      state.isLoggedIn = true;
      state.pending = false;
      // Don't add to players list here, server will send SET_PLAYERS
    },
    registerPlayerFailure: (state, action) => {
      state.pending = false;
      state.error = action.payload;
    },
    logoutPlayerStart: (state) => {
      state.pending = true;
    },
    logoutPlayerSuccess: (state) => {
      state.currentPlayer = null;
      state.isLoggedIn = false;
      state.pending = false;
    },
    logoutPlayerFailure: (state, action) => {
      state.pending = false;
      state.error = action.payload;
    },
    setPlayers: (state, action) => {
      state.players = action.payload;
    },
    clearPlayersError: (state) => {
      state.error = null;
    }
  }
});

export const {
  registerPlayerStart,
  registerPlayerSuccess,
  registerPlayerFailure,
  logoutPlayerStart,
  logoutPlayerSuccess,
  logoutPlayerFailure,
  setPlayers,
  clearPlayersError
} = playersSlice.actions;

export default playersSlice.reducer;