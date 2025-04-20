// src/components/lobby/PlayersList.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const PlayersList = ({ players, currentPlayer, onInvite }) => {
  const [inviteSent, setInviteSent] = useState({});

  const handleInvite = (player) => {
    onInvite(player);
    setInviteSent(prev => ({ ...prev, [player]: true }));
    
    // Reset the invitation status after a while
    setTimeout(() => {
      setInviteSent(prev => ({ ...prev, [player]: false }));
    }, 10000);
  };

  if (!players || players.length === 0) {
    return <p>No players online</p>;
  }

  return (
    <ul className="players-list">
      {players.map((player) => (
        <li 
          key={player} 
          className={player === currentPlayer ? 'player-self' : ''}
        >
          {player === currentPlayer ? `${player} (You)` : player}
          
          {player !== currentPlayer && (
            <button
              className={`invite-btn ${inviteSent[player] ? 'invite-sent' : ''}`}
              onClick={() => handleInvite(player)}
              disabled={inviteSent[player]}
            >
              {inviteSent[player] ? 'Invitation Sent' : 'Invite'}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

PlayersList.propTypes = {
  players: PropTypes.arrayOf(PropTypes.string).isRequired,
  currentPlayer: PropTypes.string.isRequired,
  onInvite: PropTypes.func.isRequired
};

export default PlayersList;