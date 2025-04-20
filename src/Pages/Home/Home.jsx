// src/pages/Home/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetGame } from '../../redux/slices/gameSlice';
import { resetConnection } from '../../redux/slices/webSocketSlice';
import './Home.css';

function Home() {
  const [isHovered, setIsHovered] = useState(false);
  const [animate, setAnimate] = useState(false);
  const dispatch = useDispatch();

  // Add entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 300);
    
    // Clear any game or connection state when visiting home
    dispatch(resetGame());
    dispatch(resetConnection());
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <header 
      className={`home-header ${animate ? 'animate-in' : ''}`}
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      data-testid="home-header"
    >
      <h1 className={`home-title ${isHovered ? 'hovered' : ''}`}>
        Welcome to Battleships!
      </h1>
      
      {isHovered && (
        <Link 
          to="/lobby" 
          className="start-button"
          aria-label="Start game"
          data-testid="start-button"
        >
          To Battle
        </Link>
      )}
    </header>
  );
}

export default Home;