import React from 'react';
import PropTypes from 'prop-types';
import '../../Pages/Game/Game.css';

const MessageLog = ({ messages }) => {
  const messagesEndRef = React.useRef(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-log">
      <h2>Battle Log</h2>
      <div className="message-container">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet. Start the battle!</p>
        ) : (
          <ul>
            {messages.map((message, index) => (
              <li key={index} className="message-item">
                {message}
              </li>
            ))}
            <div ref={messagesEndRef} />
          </ul>
        )}
      </div>
    </div>
  );
};

MessageLog.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default MessageLog;