import { configureStore } from '@reduxjs/toolkit';
import playersReducer from './slices/playersSlice';
import gameReducer from './slices/gameSlice';
import websocketReducer from './slices/webSocketSlice';

export const store = configureStore({
  reducer: {
    players: playersReducer,
    game: gameReducer,
    websocket: websocketReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['websocket/setSocket'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.socket'],
        // Ignore these paths in the state
        ignoredPaths: ['websocket.socket'],
      },
    })
});

export default store;