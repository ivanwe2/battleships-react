import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Lobby from '../Pages/Lobby';
import Home from '../Pages/Home';
import Game from '../Pages/Game';
import '../Assets/Styles/app.css';

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