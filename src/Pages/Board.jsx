import React from "react";
import '../Assets/Styles/Board.css'; 
import carrier from '../Assets/Images/ships/carrier.png'; // Импорт на изображенията
import cruiser from '../Assets/Images/ships/cruiser.png';
import battleship from '../Assets/Images/ships/battleship.png';
import destroyer from '../Assets/Images/ships/destroyer.png'

const Board = ({username}) => {
  // 10x10 клетки
  const cells = Array.from({ length: 100 }, (_, index) => (
    <div key={index} className="cell"></div>
  ));

  return (
    <div className="board-container">
        {/*<h2>{username}, place your ships!</h2>  */}
        <h2> Place your ships!</h2>
        <div className="board">{cells}</div>
        
      <div className="ships-container">
        <img src={carrier} alt="Carrier" className="ship" />
        <img src={cruiser} alt="Cruiser" className="ship" />
        <img src={battleship} alt="Battleship" className="ship" />
        <img src={destroyer} alt="Destroyer" className="ship" />
      </div>
    </div>
  );
};

export default Board;