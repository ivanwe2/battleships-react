import React from "react";
import '../Assets/Styles/Board.css'; 

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
    </div>
  );
};

export default Board;