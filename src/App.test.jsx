import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import App from './App';

jest.mock('./Pages/Home/Home', () => () => <div data-testid="home-page">Home Component</div>);
jest.mock('./Pages/Lobby/Lobby', () => () => <div data-testid="lobby-page">Lobby Component</div>);
jest.mock('./Pages/Game/Game', () => () => <div data-testid="game-page">Game Component</div>);

const renderWithProviders = (ui, { route = '/' } = {}) => {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </Provider>
  );
};

describe('App Component', () => {
  test('renders Home component when path is "/"', () => {
    renderWithProviders(<App />, { route: '/' });
    
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('lobby-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('game-page')).not.toBeInTheDocument();
  });

  test('renders Lobby component when path is "/lobby"', () => {
    renderWithProviders(<App />, { route: '/lobby' });
    
    expect(screen.getByTestId('lobby-page')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('game-page')).not.toBeInTheDocument();
  });

  test('renders Game component when path is "/game"', () => {
    renderWithProviders(<App />, { route: '/game' });
    
    expect(screen.getByTestId('game-page')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lobby-page')).not.toBeInTheDocument();
  });
});