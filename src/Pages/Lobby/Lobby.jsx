// src/pages/Lobby/Lobby.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../Hooks/useWebSocket';
import { 
  registerPlayerStart, 
  registerPlayerSuccess, 
  registerPlayerFailure,
  logoutPlayerStart,
  logoutPlayerSuccess,
  setPlayers 
} from '../../redux/slices/playersSlice';
import { registerPlayer, logoutPlayerApi, sendInvite, acceptInvite } from '../../api/gameApi';
import './Lobby.css';

// Component imports would go here
// import PlayersList from '../../components/lobby/PlayersList';
// import RegistrationForm from '../../components/lobby/RegistrationForm';
// import InviteModal from '../../components/lobby/InviteModal';

function Lobby() {
  const [username, setUsername] = useState('');
  const [invite, setInvite] = useState(null);
  
  const { players, currentPlayer, isLoggedIn, pending, error } = useSelector(
    state => state.players
  );
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Define WebSocket message handlers
  const messageHandlers = {
    SET_PLAYERS: (data) => {
      dispatch(setPlayers(data.players));
    },
    INVITE: (data) => {
      setInvite(data.from);
    },
    START_GAME: (data) => {
      navigate('/game', {
        state: {
          player: currentPlayer,
          opponent: data.opponent,
          gameId: `${data.opponent}-${currentPlayer}`
        }
      });
    },
    REGISTER_SUCCESS: (data) => {
      dispatch(registerPlayerSuccess(username));
    },
    REGISTER_ERROR: (data) => {
      dispatch(registerPlayerFailure(data.message));
    }
  };

  const { isConnected, sendMessage } = useWebSocket(messageHandlers);

  // Handle logout before unload
  const handleLogout = useCallback(() => {
    if (isLoggedIn && currentPlayer) {
      dispatch(logoutPlayerStart());
      logoutPlayerApi(currentPlayer);
      dispatch(logoutPlayerSuccess());
    }
  }, [isLoggedIn, currentPlayer, dispatch]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleLogout);
    return () => {
      window.removeEventListener('beforeunload', handleLogout);
      handleLogout();
    };
  }, [handleLogout]);

  // Handle registration form submission
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !isConnected) return;

    dispatch(registerPlayerStart());
    const success = registerPlayer(username);
    
    if (!success) {
      dispatch(registerPlayerFailure('Failed to register. Please try again.'));
    }
  };

  // Handle sending invite to another player
  const handleInvite = (player) => {
    sendInvite(currentPlayer, player);
  };

  // Handle accepting an invite
  const handleAcceptInvite = () => {
    if (invite) {
      acceptInvite(invite, currentPlayer);
      navigate('/game', {
        state: {
          player: currentPlayer,
          opponent: invite,
          gameId: `${invite}-${currentPlayer}`
        }
      });
    }
  };

  // Handle declining an invite
  const handleDeclineInvite = () => {
    setInvite(null);
  };

  // For simplicity, rendering directly here - in production would use separated components
  return (
    <div className="lobby">
      <header className="lobby-header">
        <h1>Battleships Lobby</h1>
      </header>
      
      <main className="lobby-main">
        {/* Registration Panel */}
        <div className="lobby-panel">
          <h2>
            {isLoggedIn ? (
              <>Prepare for <span className="battle-text">battle</span>, {currentPlayer}!</>
            ) : (
              "Register"
            )}
          </h2>
          {!isLoggedIn && (
            <form onSubmit={handleRegister}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={pending}
              />
              <button type="submit" disabled={pending || !isConnected}>
                {pending ? 'Registering...' : 'Register'}
              </button>
              {error && <p className="error-message">{error}</p>}
              {!isConnected && (
                <p className="connection-warning">Connecting to server...</p>
              )}
            </form>
          )}
        </div>

        {/* Players List Panel */}
        <div className="lobby-panel">
          <h2>Online Players</h2>
          {isLoggedIn ? (
            <ul>
              {players.map((player, index) => (
                <li key={index} className={player === currentPlayer ? 'player-self' : ''}>
                  {player === currentPlayer ? 'You' : player}
                  {player !== currentPlayer && (
                    <button
                      className="invite-btn"
                      onClick={() => handleInvite(player)}
                    >
                      Invite
                    </button>
                  )}
                </li>
              ))}
              {players.length === 0 && <li>No other players online</li>}
            </ul>
          ) : (
            <p>Register to see online users!</p>
          )}
        </div>
      </main>

      {/* Invite Modal */}
      {invite && (
        <div className="invite-modal">
          <div className="invite-content">
            <p><strong>{invite}</strong> invited you to play!</p>
            <div className="invite-actions">
              <button onClick={handleAcceptInvite}>Accept</button>
              <button onClick={handleDeclineInvite} className="secondary">
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;