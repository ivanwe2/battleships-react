import React, { useState, useEffect } from "react";
import "../Assets/Styles/Board.css";
import carrier from "../Assets/Images/ships/carrier.png";
import cruiser from "../Assets/Images/ships/cruiser.png";
import battleship from "../Assets/Images/ships/battleship.png";
import destroyer from "../Assets/Images/ships/destroyer.png";

const SHIP_TYPES = [
  { type: "carrier", size: 5, count: 1, image: carrier },
  { type: "cruiser", size: 4, count: 1, image: cruiser },
  { type: "battleship", size: 3, count: 1, image: battleship },
  { type: "destroyer", size: 2, count: 1, image: destroyer },
];

const Board = () => {
  // Фази на играта: placementPhase – поставяне на корабите, isBattleStarted – биткова фаза.
  const [placementPhase, setPlacementPhase] = useState(true);
  const [isBattleStarted, setIsBattleStarted] = useState(false);

  // За поставяне: временно съхранение на поставените кораби.
  const [tempShips, setTempShips] = useState([]);
  // За двама играчи – след фазата на поставяне.
  const [player1Ships, setPlayer1Ships] = useState([]);
  const [player2Ships, setPlayer2Ships] = useState([]);

  const [placedShipsCount, setPlacedShipsCount] = useState({
    carrier: 0,
    cruiser: 0,
    battleship: 0,
    destroyer: 0,
  });

  const [attacks1, setAttacks1] = useState([]);
  const [attacks2, setAttacks2] = useState([]);

  const [activePlayer, setActivePlayer] = useState(1);
  const [timer, setTimer] = useState(60);

  // Състояние за специалната муниция: "none", "airplane" или "bomb".
  const [specialMode, setSpecialMode] = useState("none");

  // Муниции за двама играчи.
  const [player1Munitions, setPlayer1Munitions] = useState({
    airplane: 2,
    bomb: 2,
  });
  const [player2Munitions, setPlayer2Munitions] = useState({
    airplane: 2,
    bomb: 2,
  });

  // Настройки за корабите.
  const [orientation, setOrientation] = useState("horizontal");

  // Таймерът стартира, когато битката е започнала.
  useEffect(() => {
    if (isBattleStarted) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            switchTurn();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isBattleStarted, activePlayer]);

  const switchTurn = () => {
    setActivePlayer((prev) => (prev === 1 ? 2 : 1));
    setTimer(60);
    setSpecialMode("none"); // Ресетваме специалната муниция при смяна.
  };

  const handleRotate = () => {
    setOrientation((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
  };

  // Drag start за корабите (само при фазата на поставяне).
  const handleDragStart = (e, shipType, shipSize) => {
    if (!placementPhase) return;
    e.dataTransfer.setData("shipType", shipType);
    e.dataTransfer.setData("shipSize", shipSize);
    e.dataTransfer.setData("orientation", orientation);
  };

  // за специална муниция – самолет или бомба.
  const handleSpecialDragStart = (e, type) => {
    if (!isBattleStarted) return;
    e.dataTransfer.setData("special", type);
  };
  const calculateBufferZone = (occupiedCells) => {
    const buffer = new Set();
    occupiedCells.forEach((cell) => {
      const row = Math.floor(cell / 10);
      const col = cell % 10;
      for (let r = Math.max(0, row - 1); r <= Math.min(9, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(9, col + 1); c++) {
          const neighbor = r * 10 + c;
          if (!occupiedCells.includes(neighbor)) {
            buffer.add(neighbor);
          }
        }
      }
    });
    return Array.from(buffer);
  };
  // При поставяне – изчисляваме кои клетки заема корабът.
  const handleDrop = (e, cellIndex) => {
    if (!placementPhase) return;
    const shipType = e.dataTransfer.getData("shipType");
    const shipSize = parseInt(e.dataTransfer.getData("shipSize"));
    const shipOrientation = e.dataTransfer.getData("orientation");

    const shipConfig = SHIP_TYPES.find((s) => s.type === shipType);

    if (placedShipsCount[shipType] >= shipConfig.count) {
      alert(`You can only place ${shipConfig.count} ${shipType}(s)`);
      return;
    }

    if (shipOrientation === "horizontal") {
      if ((cellIndex % 10) + shipSize > 10) {
        alert("Ship goes beyond board boundaries!");
        return;
      }
    } else {
      if (Math.floor(cellIndex / 10) + shipSize > 10) {
        alert("Ship goes beyond board boundaries!");
        return;
      }
    }

    const occupied = [];
    for (let i = 0; i < shipSize; i++) {
      occupied.push(
        shipOrientation === "horizontal" ? cellIndex + i : cellIndex + i * 10
      );
    }
    const bufferZone = calculateBufferZone(occupied);
    // Проверка за припокриване с вече поставени кораби
    const allOccupied = [
      ...tempShips.flatMap((s) => [...s.occupied, ...s.bufferZone]),
    ];
    const isOverlapping = occupied.some((cell) => allOccupied.includes(cell));

    if (isOverlapping) {
      alert("Ships cannot overlap or be adjacent!");
      return;
    }

    const newShip = {
      shipType,
      shipSize,
      shipOrientation,
      cellIndex,
      occupied,
      bufferZone,
      image: shipConfig.image,
    };

    setTempShips((prev) => [...prev, newShip]);
    setPlacedShipsCount((prev) => ({
      ...prev,
      [shipType]: prev[shipType] + 1,
    }));
  };

  // Завършване на фазата на поставяне – първо за Player 1, после за Player 2.
  const handlePlacementDone = () => {
    const allShipsPlaced = SHIP_TYPES.every(
      (ship) => placedShipsCount[ship.type] >= ship.count
    );

    if (!allShipsPlaced) {
      alert("You must place all ships before continuing!");
      return;
    }
    if (activePlayer === 1) {
      setPlayer1Ships(tempShips);
      setTempShips([]);
      setPlacedShipsCount({
        carrier: 0,
        cruiser: 0,
        battleship: 0,
        destroyer: 0,
      });
      setActivePlayer(2);
    } else {
      setPlayer2Ships(tempShips);
      setTempShips([]);
      setPlacedShipsCount({
        carrier: 0,
        cruiser: 0,
        battleship: 0,
        destroyer: 0,
      });
      setPlacementPhase(false);
      setActivePlayer(1);
    }
  };

  // Стартиране на битката.
  const handleStartBattle = () => {
    setIsBattleStarted(true);
    setTimer(60);
  };

  // Обработка на нормална атака – при клик върху клетка.
  const handleAttack = (index) => {
    if (!isBattleStarted) return;
    if (activePlayer === 1) {
      if (!attacks1.includes(index)) {
        setAttacks1((prev) => [...prev, index]);
        switchTurn();
      }
    } else {
      if (!attacks2.includes(index)) {
        setAttacks2((prev) => [...prev, index]);
        switchTurn();
      }
    }
  };

  // Обработка на drop за специална муниция върху вражеската дъска.
  const handleSpecialDrop = (e, cellIndex) => {
    e.preventDefault();
    if (!isBattleStarted) return;
    const special = e.dataTransfer.getData("special");
    if (!special) return;

    if (special === "airplane") {
      // Самолетът поражда 4 клетки: целевата, клетката вдясно, отдолу и диагонално вдясно-отдолу (ако са валидни).
      let targets = [cellIndex];
      if (cellIndex % 10 < 9) targets.push(cellIndex + 1);
      if (cellIndex + 10 < 100) targets.push(cellIndex + 10);
      if (cellIndex % 10 < 9 && cellIndex + 11 < 100)
        targets.push(cellIndex + 11);

      if (activePlayer === 1) {
        let newAttacks = [...attacks1];
        targets.forEach((t) => {
          if (!newAttacks.includes(t)) newAttacks.push(t);
        });
        setAttacks1(newAttacks);
        setPlayer1Munitions((prev) => ({
          ...prev,
          airplane: prev.airplane - 1,
        }));
      } else {
        let newAttacks = [...attacks2];
        targets.forEach((t) => {
          if (!newAttacks.includes(t)) newAttacks.push(t);
        });
        setAttacks2(newAttacks);
        setPlayer2Munitions((prev) => ({
          ...prev,
          airplane: prev.airplane - 1,
        }));
      }
      switchTurn();
    } else if (special === "bomb") {
      // Бомбата поражда 2 клетки: целевата и клетката вдясно (ако е налична).
      let targets = [cellIndex];
      if (cellIndex % 10 < 9) targets.push(cellIndex + 1);

      if (activePlayer === 1) {
        let newAttacks = [...attacks1];
        targets.forEach((t) => {
          if (!newAttacks.includes(t)) newAttacks.push(t);
        });
        setAttacks1(newAttacks);
        setPlayer1Munitions((prev) => ({ ...prev, bomb: prev.bomb - 1 }));
      } else {
        let newAttacks = [...attacks2];
        targets.forEach((t) => {
          if (!newAttacks.includes(t)) newAttacks.push(t);
        });
        setAttacks2(newAttacks);
        setPlayer2Munitions((prev) => ({ ...prev, bomb: prev.bomb - 1 }));
      }
      switchTurn();
    }
  };

  // Функция за рендиране на мрежата (grid) – в зависимост от режима:
  // mode: "placement", "player", "opponent"
  ///////
  const handleRemoveLastShip = () => {
    if (tempShips.length === 0) return;

    const lastShip = tempShips[tempShips.length - 1];
    setTempShips((prev) => prev.slice(0, -1));
    setPlacedShipsCount((prev) => ({
      ...prev,
      [lastShip.shipType]: prev[lastShip.shipType] - 1,
    }));
  };

  const renderGrid = (mode) => {
    return (
      <div className="grid">
        {Array.from({ length: 100 }).map((_, i) => {
          let bg = "transparent";
          let shipImage = null;
          let shipOrientation = "horizontal";
          let shipPartStyle = {};
          let ship = null;
          let isBufferZone = false;

          if (placementPhase && mode === "placement") {
            ship = tempShips.find((s) => s.occupied.includes(i));
            isBufferZone = tempShips.some((s) => s.bufferZone.includes(i));

            if (ship) {
              bg = "rgba(0, 255, 0, 0.3)";
              shipImage = ship.image;
              shipOrientation = ship.shipOrientation;

              const shipIndex = ship.occupied.indexOf(i);
              const cellSize = 30; // Размер на клетката в пиксели

              if (shipOrientation === "horizontal") {
                shipPartStyle = {
                  position: "absolute",
                  width: `${ship.shipSize * cellSize}px`,
                  height: `${cellSize}px`,
                  left: `-${shipIndex * cellSize}px`,
                  objectFit: "cover",
                };
              } else {
                shipPartStyle = {
                  position: "absolute",
                  width: `${cellSize}px`,
                  height: `${ship.shipSize * cellSize}px`,
                  top: `-${shipIndex * cellSize}px`,
                  objectFit: "cover",
                };
              }
            } else if (isBufferZone) {
              bg = "rgba(255, 255, 0, 0.1)";
            }
          }

          return (
            <div
              key={i}
              className="cell"
              onDragOver={(e) => {
                if (
                  (isBattleStarted && mode === "opponent") ||
                  (!isBattleStarted && placementPhase)
                ) {
                  e.preventDefault();
                }
              }}
              onDrop={(e) => {
                if (!isBattleStarted && placementPhase) {
                  handleDrop(e, i);
                } else if (isBattleStarted && mode === "opponent") {
                  handleSpecialDrop(e, i);
                }
              }}
              onClick={(e) => {
                if (
                  isBattleStarted &&
                  mode === "opponent" &&
                  !e.defaultPrevented
                ) {
                  handleAttack(i);
                }
              }}
              style={{
                backgroundColor: bg,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {shipImage && (
                <img
                  src={shipImage}
                  alt="ship"
                  style={{
                    ...shipPartStyle,
                    transform:
                      shipOrientation === "vertical" ? "rotate(90deg)" : "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Проверка дали всички кораби са поставени за бутона Done Placement
  const allShipsPlaced = SHIP_TYPES.every(
    (ship) => placedShipsCount[ship.type] >= ship.count
  );

  return (
    <div className="board-container">
      {placementPhase ? (
        <div className="placement-wrapper">
          <div className="grid-container">
            <h3 style={{ color: "white" }}>
              Player {activePlayer} - Place your ships
            </h3>
            {renderGrid("placement")}
          </div>
          <div className="panel">
            {SHIP_TYPES.map((ship) => (
              <img
                key={ship.type}
                src={ship.image}
                alt={ship.type}
                className="ship"
                draggable
                onDragStart={(e) => handleDragStart(e, ship.type, ship.size)}
                style={{
                  transform:
                    orientation === "vertical" ? "rotate(90deg)" : "none",
                  opacity: placedShipsCount[ship.type] >= ship.count ? 0.5 : 1,
                  cursor:
                    placedShipsCount[ship.type] >= ship.count
                      ? "not-allowed"
                      : "grab",
                }}
              />
            ))}
            <button className="rotate-button" onClick={handleRotate}>
              Rotate Ships
            </button>
            <button
              className="remove-button"
              onClick={handleRemoveLastShip}
              disabled={tempShips.length === 0}
            >
              Remove Last Ship
            </button>
            <button
              className="start-button"
              onClick={handlePlacementDone}
              disabled={!allShipsPlaced}
            >
              Done Placement
            </button>
          </div>
        </div>
      ) : (
        <div>
          {!isBattleStarted ? (
            <button className="start-button" onClick={handleStartBattle}>
              Start Battle
            </button>
          ) : (
            <div>
              <h3 style={{ color: "white" }}>Player {activePlayer}'s Turn</h3>
              <p style={{ color: "white" }}>Time Left: {timer}s</p>

              {/* 🚀 ЕТО ДОБАВЕНИЯТ РЕД */}
              <p style={{ color: "white", fontWeight: "bold" }}>
                It's Player {activePlayer}'s turn!
              </p>

              <div className="boards-wrapper">
                <div>
                  <h3 style={{ color: "white" }}>Your Board</h3>
                  {renderGrid("player")}
                </div>
                <div>
                  <h3 style={{ color: "white" }}>Enemy Board</h3>
                  {renderGrid("opponent")}
                </div>
              </div>
              <div className="munitions-panel">
                <div>
                  <img
                    src="path/to/airplane.png"
                    alt="Airplane"
                    className="munition"
                    draggable
                    onDragStart={(e) => handleSpecialDragStart(e, "airplane")}
                  />
                  <span style={{ color: "white" }}>
                    Airplane:{" "}
                    {activePlayer === 1
                      ? player1Munitions.airplane
                      : player2Munitions.airplane}
                  </span>
                </div>
                <div>
                  <img
                    src="path/to/bomb.png"
                    alt="Bomb"
                    className="munition"
                    draggable
                    onDragStart={(e) => handleSpecialDragStart(e, "bomb")}
                  />
                  <span style={{ color: "white" }}>
                    Bomb:{" "}
                    {activePlayer === 1
                      ? player1Munitions.bomb
                      : player2Munitions.bomb}
                  </span>
                </div>
                <p style={{ color: "white" }}>Special Mode: {specialMode}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Board;
