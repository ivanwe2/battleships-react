import React, { useState } from 'react';
import '../Assets/Styles/App.css';
import { Link, Route, Routes } from 'react-router-dom';
import Lobby from '../Pages/Lobby';

function App() {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="App">
        <Routes>
            <Route path="/lobby" element={<Lobby></Lobby>}></Route>
        </Routes>
      <header 
        className="App-header" 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
      >
        <h1 className={`App-title ${isHovered ? 'hovered' : ''}`}>Welcome to Battleships!</h1>
        {isHovered && <Link to="/lobby" className="start-button">
          To Battle
        </Link>}
      </header>
    </div>
  );
}

export default App;