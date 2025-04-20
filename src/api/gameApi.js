import websocketService from './websocketService';

export const registerPlayer = (username) => {
  return websocketService.send({
    type: 'REGISTER',
    username
  });
};

export const logoutPlayerApi = (username) => {
  return websocketService.send({
    type: 'LOGOUT',
    username
  });
};

export const sendInvite = (from, to) => {
  return websocketService.send({
    type: 'INVITE',
    from,
    to
  });
};

export const acceptInvite = (from, to) => {
  return websocketService.send({
    type: 'ACCEPT_INVITE',
    from,
    to
  });
};

export const sendAttack = (player, gameId, position) => {
  return websocketService.send({
    type: 'ATTACK',
    player,
    gameId,
    position
  });
};