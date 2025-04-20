import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
  error: null
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setConnectionStatus: (state, action) => {
      state.status = action.payload;
      if (state.status !== 'error') {
        state.error = null;
      }
    },
    setConnectionError: (state, action) => {
      state.error = action.payload;
      state.status = 'error';
    },
    resetConnection: (state) => {
      state.status = 'disconnected';
      state.error = null;
    }
  }
});

export const { 
  setConnectionStatus, 
  setConnectionError, 
  resetConnection 
} = websocketSlice.actions;

export default websocketSlice.reducer;