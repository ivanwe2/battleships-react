// src/components/lobby/RegistrationForm.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const RegistrationForm = ({ onRegister, isPending, error, isConnected }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && isConnected) {
      onRegister(username);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        required
        disabled={isPending}
        aria-label="Username"
        minLength={3}
        maxLength={15}
      />
      <button 
        type="submit" 
        disabled={isPending || !isConnected || !username.trim()}
      >
        {isPending ? 'Registering...' : 'Register'}
      </button>
      
      {error && <p className="error-message">{error}</p>}
      
      {!isConnected && (
        <p className="connection-warning">
          Connecting to server...
        </p>
      )}
    </form>
  );
};

RegistrationForm.propTypes = {
  onRegister: PropTypes.func.isRequired,
  isPending: PropTypes.bool,
  error: PropTypes.string,
  isConnected: PropTypes.bool
};

RegistrationForm.defaultProps = {
  isPending: false,
  error: null,
  isConnected: false
};

export default RegistrationForm;