import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../Assets/Styles/Game.css';

const BOARD_SIZE = 10;

const Game = () => {
  const location = useLocation();
  const { player, opponent, gameId } = location.state || { opponent: 'Unknown' };
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(Array(BOARD_SIZE).fill(null)));
  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);

  const handleAttack = useCallback((position) => {
    const newBoard = [...board];
    newBoard[position.row][position.col] = 'X';
    setBoard(newBoard);
    setMessages((prevMessages) => [...prevMessages, `Attacked at ${position.row}, ${position.col}`]);
  }, [board]);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_SERVER_URL;
    const socket = new WebSocket(wsUrl);
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ATTACK') {
        handleAttack(data.position);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      socket.close();
    };
  }, [handleAttack]);

  const sendAttack = (row, col) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ATTACK', player, gameId, position: { row, col } }));
    }
  };

  return (
    <div className="game-container">
      <h1>Game Page</h1>
      <p>Playing against: {opponent}</p>
      <div className="board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className="board-cell"
                onClick={() => sendAttack(rowIndex, colIndex)}
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="messages">
        <h2>Messages</h2>
        <ul>
          {messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Game;