// src/utils/constants.js
export const BOARD_SIZE = 10;

export const GAME_STATUS = {
  IDLE: 'idle',
  IN_PROGRESS: 'in-progress',
  FINISHED: 'finished'
};

export const CELL_STATUS = {
  EMPTY: null,
  HIT: 'hit',
  MISS: 'miss',
  ATTACKED: 'attacked',
  SHIP: 'ship'
};

export const TURN = {
  PLAYER: 'player',
  OPPONENT: 'opponent'
};

export const MESSAGE_TYPES = {
  REGISTER: 'REGISTER',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_ERROR: 'REGISTER_ERROR',
  LOGOUT: 'LOGOUT',
  SET_PLAYERS: 'SET_PLAYERS',
  INVITE: 'INVITE',
  ACCEPT_INVITE: 'ACCEPT_INVITE',
  START_GAME: 'START_GAME',
  ATTACK: 'ATTACK',
  GAME_OVER: 'GAME_OVER',
  GAME_MESSAGE: 'GAME_MESSAGE',
  ERROR: 'ERROR'
};

export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};