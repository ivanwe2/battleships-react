import React, { useState, useEffect } from 'react';
import '../Assets/Styles/Lobby.css';

function Lobby() {
  const [players, setPlayers] = useState([]);
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // web sockets here?
    setPlayers(['Player1', 'Player2', 'Player3']);
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
            <button type="submit">Register meow</button>
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
    </div>
  );
}

export default Lobby;