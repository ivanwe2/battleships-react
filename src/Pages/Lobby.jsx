import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../Assets/Styles/Lobby.css';

function Lobby() {
  const [players, setPlayers] = useState([]);
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(false); 


  useEffect(() => {
    // web sockets here?
    setPlayers(['Player1', 'Player2', 'Player3']);
  ;
  // Show "Place ships" button after 3 seconds
    const timer = setTimeout(() => {   
      setIsButtonVisible(true); // Make the button visible
    }, 3000); // 3000 milliseconds = 3 seconds

    return () => clearTimeout(timer); // Cleanup timer on component unmount
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setPlayers([...players, username]);
      setIsLoggedIn(true);
    }
  };
  return (
    <div className="Lobby">
      <div className="Lobby-left">
        <h2>Register</h2>
        {!isLoggedIn ? (
          <form onSubmit={handleRegister}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
            <button type="submit">Register</button>
          </form>
        ) : (
          <p>Welcome, {username}!</p>
        )}
      </div>
      <div className="Lobby-right">
        <h2>Online Players</h2>
        <ul>
          {players.map((player, index) => (
            <li key={index}>{player}</li>
          ))}

        </ul>
      </div>
  {/* Conditionally render the "Place ships" button */}
  {isButtonVisible && (
        <Link to="/board" className={`button-1 ${isButtonVisible ? 'visible' : ''}`}>
          Place ships
        </Link>)}
    </div>
  );
}

export default Lobby;