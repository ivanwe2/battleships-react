import React from "react";
import "./ShipPlacement.css";

const BOARD_SIZE = 10;
const SHIP_TYPES = [
  { type: "carrier", size: 5, count: 1 },
  { type: "cruiser", size: 4, count: 1 },
  { type: "battleship", size: 3, count: 1 },
  { type: "destroyer", size: 2, count: 1 },
];

const ShipPlacement = ({
  playerBoard,
  selectedShipType,
  setSelectedShipType,
  placedShipsCount,
  orientation,
  setOrientation,
  hoverCoordinates,
  setHoverCoordinates,
  placementValid,
  setPlacementValid,
  onCellClick,
  onFinishPlacement,
  calculatePlacementValidity,
}) => {
  const handleCellHover = (row, col) => {
    if (selectedShipType) {
      const shipSize = SHIP_TYPES.find(
        (ship) => ship.type === selectedShipType
      )?.size;
      if (!shipSize) return;

      setHoverCoordinates({ row, col });
      setPlacementValid(
        calculatePlacementValidity(playerBoard, row, col, shipSize, orientation)
      );
    }
  };

  const renderBoard = () => (
    <div className="board">
      {playerBoard.map((row, rIdx) => (
        <div key={rIdx} className="board-row">
          {row.map((cell, cIdx) => {
            const cellClass = ["board-cell"];

            if (cell === "ship") cellClass.push("ship-cell");

            if (
              selectedShipType &&
              hoverCoordinates &&
              hoverCoordinates.row === rIdx &&
              hoverCoordinates.col === cIdx
            ) {
              cellClass.push(
                placementValid ? "valid-placement" : "invalid-placement"
              );
            }

            return (
              <div
                key={cIdx}
                className={cellClass.join(" ")}
                onClick={() => onCellClick(rIdx, cIdx)}
                onMouseEnter={() => handleCellHover(rIdx, cIdx)}
                onMouseLeave={() => setHoverCoordinates(null)}
              ></div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderPlacementControls = () => (
    <div className="placement-controls">
      <h3>Select Ship Type</h3>
      <div className="ship-selector">
        {SHIP_TYPES.map((ship) => {
          const isPlaced = placedShipsCount[ship.type] >= ship.count;
          return (
            <button
              key={ship.type}
              className={`ship-button ${
                selectedShipType === ship.type ? "selected" : ""
              } ${isPlaced ? "disabled" : ""}`}
              onClick={() => !isPlaced && setSelectedShipType(ship.type)}
              disabled={isPlaced}
            >
              {ship.type} ({ship.size}){isPlaced ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      <div className="placement-actions">
        <button
          onClick={() =>
            setOrientation((o) =>
              o === "horizontal" ? "vertical" : "horizontal"
            )
          }
        >
          Rotate ({orientation})
        </button>
        <button
          className="finish-button"
          onClick={onFinishPlacement}
          disabled={
            !SHIP_TYPES.every(
              (ship) => placedShipsCount[ship.type] >= ship.count
            )
          }
        >
          Finish Placement
        </button>
      </div>
    </div>
  );

  return (
    <div className="placement-phase">
      <h2>Place Your Ships</h2>
      {renderPlacementControls()}
      {renderBoard()}
    </div>
  );
};

export default ShipPlacement;
