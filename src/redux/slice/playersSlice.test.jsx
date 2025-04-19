import { playerReducer, registerPlayer, logoutPlayer, setPlayers } from './playersSlice';

describe('playersSlice', () => {
  const initialState = {
    players: []
  };

  it('should handle registerPlayer', () => {
    const newPlayer = { id: 1, name: 'Player One' };
    const action = registerPlayer(newPlayer);
    const newState = playerReducer(initialState, action);

    expect(newState.players).toContain(newPlayer);
  });

  it('should handle logoutPlayer', () => {
    const playerToLogout = { id: 1, name: 'Player One' };
    const action = registerPlayer(playerToLogout);
    let state = playerReducer(initialState, action);

    const logoutAction = logoutPlayer(playerToLogout);
    state = playerReducer(state, logoutAction);

    expect(state.players).not.toContain(playerToLogout);
  });

  it('should handle setPlayers', () => {
    const playersList = [
      { id: 1, name: 'Player One' },
      { id: 2, name: 'Player Two' }
    ];
    const action = setPlayers(playersList);
    const newState = playerReducer(initialState, action);

    expect(newState.players).toEqual(playersList);
  });
});