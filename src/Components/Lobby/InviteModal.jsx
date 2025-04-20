// src/components/lobby/InviteModal.jsx
import React from 'react';
import PropTypes from 'prop-types';

const InviteModal = ({ inviter, onAccept, onDecline }) => {
  return (
    <div className="invite-modal">
      <div className="invite-content">
        <h3>Game Invitation</h3>
        <p>
          <strong>{inviter}</strong> has invited you to play Battleships!
        </p>
        <div className="invite-actions">
          <button 
            onClick={onAccept}
            className="primary"
            aria-label="Accept invitation"
          >
            Accept
          </button>
          <button 
            onClick={onDecline}
            className="secondary"
            aria-label="Decline invitation"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

InviteModal.propTypes = {
  inviter: PropTypes.string.isRequired,
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired
};

export default InviteModal;