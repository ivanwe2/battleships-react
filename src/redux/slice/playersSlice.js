import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  players: []
};

export const playersSlice = createSlice({
  name: "players",
  initialState: initialState,
  reducers: {
    registerPlayer: (state, action) => {
      state.players.push(action.payload);
    },
    logoutPlayer: (state, action) => {
      state.players = state.players.filter(player => player !== action.payload);
    },
    setPlayers: (state, action) => {
      state.players = action.payload;
    }
  }
});

export const {
  registerPlayer,
  logoutPlayer,
  setPlayers
} = playersSlice.actions;

export const playerReducer = playersSlice.reducer;