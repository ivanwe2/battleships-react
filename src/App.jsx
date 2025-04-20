import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import Home from './Pages/Home/Home';
import Lobby from './Pages/Lobby/Lobby';
import Game from './Pages/Game/Game';
import websocketService from './api/websocketService';
import './Assets/Styles/App.css';

function App() {
  // Connect to WebSocket on app initialization
  useEffect(() => {
    websocketService.connect();
    
    // Cleanup WebSocket on app unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  return (
    <Provider store={store}>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game" element={
            <Game />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Provider>
  );
}

export default App;