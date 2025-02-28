import React,{useState} from "react";
import '../Assets/Styles/Board.css'; 
import carrier from '../Assets/Images/ships/carrier.png'; // Импорт на изображенията
import cruiser from '../Assets/Images/ships/cruiser.png';
import battleship from '../Assets/Images/ships/battleship.png';
import destroyer from '../Assets/Images/ships/destroyer.png'

const Board = ({username}) => {

const[orientation, setOrientation]=useState("horizontal"); //Oriantation state
//func for rotating ships
const handleRotate=()=>{
  setOrientation((prev)=>(prev==="horizontal" ? "vertical": "horizontal"));

};
const handleDragStart =(e, shipType, shipSize)=>{
  e.dataTransfer.setData("shipType", shipType);
  e.dataTransfer.setData("shipSize", shipSize);
  e.dataTransfer.setData("orientation", orientation);

};
const handleDrop=(e, cellIndex)=>{
  const shipType=e.dataTransfer.getData("shipType");
  const shipSize=parseInt(e.dataTransfer.getData("shipSize"));
  const shipOrientation=e.dataTransfer.getData("orientation");
  console.log(`Placed ${shipType}(size: ${shipSize}, orientation: ${shipOrientation}) at cell ${cellIndex}`);
};

  // 10x10 клетки
const cells=Array.from({length: 100 },(_, index)=>(
  <div key={index} className="cell" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=> handleDrop (e,index)}> </div>));


const ships = [
    { type: "carrier", size: 5, image: carrier },
    { type: "cruiser", size: 4, image: cruiser },
    { type: "battleship", size: 3, image: battleship },
    { type: "destroyer", size: 2, image: destroyer },
  ];

  return (
    <div className="board-container">
        {/*<h2>{username}, place your ships!</h2>  */}
        <h2> Place your ships!</h2>
        <div className="board">{cells}</div>
        
      <div className="ships-container">
        {ships.map((ship)=>(
          <img
          key={ship.type}
          src={ship.image}
          alt={ship.type}
          className="ship"
          draggable
          onDragStart={(e)=>handleDragStart(e, ship.type, ship.size)}
          style={{
            transform:orientation==="vertical" ? "rotate(90deg)":"none",
          }}/>
        ))}
      <button className="rotate-button" onClick={handleRotate}>
        Rotate Ships
      </button>
      </div>
    </div>
  );
};

export default Board;