import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../Assets/Styles/home.css';

function Home() {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <header 
      className="home-header" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <h1 className={`home-title ${isHovered ? 'hovered' : ''}`}>Welcome to Battleships!</h1>
      {isHovered && <Link to="/lobby" className="start-button">
        To Battle
      </Link>}
    </header>
  );
}

export default Home;