import React from 'react';
import '../Assets/Styles/App.css';
import { Route, Routes, useLocation } from 'react-router-dom';
import Lobby from '../Pages/Lobby';
import Home from '../Pages/Home';
import Board from '../Pages/Board';

function App() {
  const location = useLocation();
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route
          path="/board"
          element={<Board username={location.state?.username} />}
        />
      </Routes>
    </div>
  );
}

export default App;
