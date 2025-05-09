import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Lobby from './Pages/Lobby/Lobby';
import Home from './Pages/Home/Home';
import Game from './Pages/Game/Game';
import './Assets/Styles/App.css';

function App() {
  return (
    <div className="container">
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby" element={<Lobby></Lobby>}></Route>
            <Route path="/game" element={<Game></Game>}></Route>
        </Routes>
    </div>
  );
}

export default App;