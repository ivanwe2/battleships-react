import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Home from './Home';

const HomeWithRouter = () => (
  <BrowserRouter>
    <Home />
  </BrowserRouter>
);

describe('Home Component', () => {
  test('renders welcome message', () => {
    render(<HomeWithRouter />);
    
    const welcomeMessage = screen.getByText('Welcome to Battleships!');
    expect(welcomeMessage).toBeInTheDocument();
  });

  test('does not show "To Battle" link initially', () => {
    render(<HomeWithRouter />);
    
    const battleButton = screen.queryByText('To Battle');
    expect(battleButton).not.toBeInTheDocument();
  });

  test('shows "To Battle" link on hover', () => {
    render(<HomeWithRouter />);
    
    const header = screen.getByRole('banner');
    
    fireEvent.mouseEnter(header);
    
    const battleButton = screen.getByText('To Battle');
    expect(battleButton).toBeInTheDocument();
    expect(battleButton).toHaveAttribute('href', '/lobby');
  });

  test('hides "To Battle" link when no longer hovering', () => {
    render(<HomeWithRouter />);
    
    const header = screen.getByRole('banner');
    
    fireEvent.mouseEnter(header);
    
    const battleButton = screen.getByText('To Battle');
    expect(battleButton).toBeInTheDocument();
    
    fireEvent.mouseLeave(header);
    
    const buttonAfterLeave = screen.queryByText('To Battle');
    expect(buttonAfterLeave).not.toBeInTheDocument();
  });

  test('applies "hovered" class on mouse enter', () => {
    render(<HomeWithRouter />);
    
    const title = screen.getByText('Welcome to Battleships!');
    
    expect(title).toHaveClass('home-title');
    expect(title).not.toHaveClass('hovered');
    
    fireEvent.mouseEnter(screen.getByRole('banner'));
    
    expect(title).toHaveClass('home-title');
    expect(title).toHaveClass('hovered');
  });
});