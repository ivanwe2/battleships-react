import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Game.css";

const BOARD_SIZE = 10;
const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

const SHIP_TYPES = [
  { type: "carrier", size: 5, count: 1 },
  { type: "cruiser", size: 4, count: 1 },
  { type: "battleship", size: 3, count: 1 },
  { type: "destroyer", size: 2, count: 1 },
];

const Game = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { player, opponent, gameId } = location.state || {
    player: "Player",
    opponent: "Unknown",
  };

  const [messages, setMessages] = useState([]);
  const [ws, setWs] = useState(null);
  const [gamePhase, setGamePhase] = useState("lobby");
  const [activePlayer, setActivePlayer] = useState(1);
  const [playerShips, setPlayerShips] = useState([]);
  const [opponentShips, setOpponentShips] = useState([]);
  const [playerBoard, setPlayerBoard] = useState(createEmptyBoard());
  const [opponentBoard, setOpponentBoard] = useState(createEmptyBoard());
  const [playerAttacks, setPlayerAttacks] = useState([]);
  const [opponentAttacks, setOpponentAttacks] = useState([]);
  const [orientation, setOrientation] = useState("horizontal");
  const [selectedShipType, setSelectedShipType] = useState(null);
  const [placedShipsCount, setPlacedShipsCount] = useState({
    carrier: 0,
    cruiser: 0,
    battleship: 0,
    destroyer: 0,
  });
  const [timer, setTimer] = useState(60);
  const [hoverCoordinates, setHoverCoordinates] = useState(null);
  const [placementValid, setPlacementValid] = useState(false);

  const checkIfHit = (ships, row, col) =>
    ships.some((ship) => ship.occupied.includes(row * BOARD_SIZE + col));

  const checkIfAllShipsSunk = (ships, attacks) =>
    ships.every((ship) =>
      ship.occupied.every((cell) =>
        attacks.map((a) => a.row * BOARD_SIZE + a.col).includes(cell)
      )
    );

  const switchTurn = () => {
    setActivePlayer((p) => (p === 1 ? 2 : 1));
    setTimer(60);
  };

  const handleOpponentAttack = useCallback(
    ({ row, col }) => {
      const isHit = checkIfHit(playerShips, row, col);
      const newBoard = [...playerBoard];
      newBoard[row] = [...newBoard[row]];
      newBoard[row][col] = isHit ? "hit" : "miss";
      setPlayerBoard(newBoard);
      setOpponentAttacks((p) => [...p, { row, col }]);
      setMessages((p) => [
        ...p,
        `${opponent} attacked ${row},${col} - ${isHit ? "HIT" : "Miss"}`,
      ]);

      if (
        checkIfAllShipsSunk(playerShips, [...opponentAttacks, { row, col }])
      ) {
        setGamePhase("gameOver");
        setMessages((p) => [...p, `${opponent} wins!`]);
      } else switchTurn();
    },
    [playerShips, opponent, opponentAttacks, playerBoard]
  );

  const handleSocketMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "ATTACK":
          handleOpponentAttack(data.position);
          break;
        case "SHIP_PLACEMENT":
          setOpponentShips(data.ships);
          break;
        case "GAME_START":
          setGamePhase("battle");
          break;
        case "GAME_OVER":
          setGamePhase("gameOver");
          setMessages((p) => [...p, `Game over! ${data.winner} wins!`]);
          break;
        default:
          console.log("Unknown message type:", data.type);
      }
    },
    [handleOpponentAttack]
  );

  useEffect(() => {
    // Only setup WebSocket if we're in a real game
    if (gameId) {
      const wsUrl =
        process.env.REACT_APP_WS_SERVER_URL || "ws://localhost:8080";
      try {
        const socket = new WebSocket(wsUrl);
        setWs(socket);

        socket.onopen = () => {
          setMessages((prev) => [...prev, "Connected to game server"]);
          // Send join game message
          if (gameId) {
            socket.send(
              JSON.stringify({
                type: "JOIN_GAME",
                gameId,
                player,
              })
            );
          }
        };

        socket.onmessage = (event) => {
          try {
            handleSocketMessage(JSON.parse(event.data));
          } catch (e) {
            console.error("Error parsing WebSocket message", e);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setMessages((prev) => [
            ...prev,
            "Connection error. Playing in offline mode.",
          ]);
        };

        socket.onclose = () => console.log("WebSocket closed");

        return () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        setMessages((prev) => [
          ...prev,
          "Failed to connect. Playing in offline mode.",
        ]);
      }
    } else {
      // Offline/local mode
      setMessages((prev) => [...prev, "Playing in offline mode"]);
    }
  }, [gameId, player, handleSocketMessage]);

  useEffect(() => {
    if (gamePhase === "battle") {
      const interval = setInterval(() => {
        setTimer((prev) => (prev <= 1 ? (switchTurn(), 60) : prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gamePhase, activePlayer]);

  const handleFinishLobby = () => {
    setMessages((p) => [...p, "You are ready. Waiting for opponent..."]);
    setTimeout(() => {
      setGamePhase("placement");
      setMessages((p) => [
        ...p,
        "Both players are ready. Start placing ships!",
      ]);
    }, 1500);
  };

  // Calculate if placement would be valid
  const calculatePlacementValidity = (
    board,
    row,
    col,
    shipSize,
    shipOrientation
  ) => {
    if (!shipSize) return false;

    // Check if ship would go off the board
    if (shipOrientation === "horizontal" && col + shipSize > BOARD_SIZE) {
      return false;
    }
    if (shipOrientation === "vertical" && row + shipSize > BOARD_SIZE) {
      return false;
    }

    // Check for collisions with other ships including buffer zone
    for (let i = 0; i < shipSize; i++) {
      const r = shipOrientation === "horizontal" ? row : row + i;
      const c = shipOrientation === "vertical" ? col : col + i;

      // Check the cell itself
      if (board[r][c]) {
        return false;
      }

      // Check buffer zone (surrounding cells)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < BOARD_SIZE &&
            nc >= 0 &&
            nc < BOARD_SIZE &&
            board[nr][nc] === "ship"
          ) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleCellHover = (row, col) => {
    if (!selectedShipType) return;

    const shipSize = SHIP_TYPES.find(
      (ship) => ship.type === selectedShipType
    )?.size;
    if (!shipSize) return;

    setHoverCoordinates({ row, col });
    setPlacementValid(
      calculatePlacementValidity(playerBoard, row, col, shipSize, orientation)
    );
  };

  const handleCellClick = (row, col) => {
    if (
      !selectedShipType ||
      placedShipsCount[selectedShipType] >=
        SHIP_TYPES.find((ship) => ship.type === selectedShipType).count
    ) {
      return;
    }

    const shipSize = SHIP_TYPES.find(
      (ship) => ship.type === selectedShipType
    ).size;

    // Validate placement
    if (
      !calculatePlacementValidity(playerBoard, row, col, shipSize, orientation)
    ) {
      setMessages((prev) => [
        ...prev,
        `Cannot place ship here. Check boundaries and other ships.`,
      ]);
      return;
    }

    // Place the ship
    const occupied = [];
    const newBoard = JSON.parse(JSON.stringify(playerBoard));

    for (let i = 0; i < shipSize; i++) {
      const r = orientation === "horizontal" ? row : row + i;
      const c = orientation === "vertical" ? col : col + i;
      newBoard[r][c] = "ship";
      occupied.push(r * BOARD_SIZE + c);
    }

    setPlayerBoard(newBoard);
    setPlacedShipsCount((prev) => ({
      ...prev,
      [selectedShipType]: prev[selectedShipType] + 1,
    }));

    const newShip = {
      type: selectedShipType,
      size: shipSize,
      occupied,
    };

    setPlayerShips((prev) => [...prev, newShip]);
    setMessages((prev) => [
      ...prev,
      `Placed ${selectedShipType} at position [${row},${col}]`,
    ]);
    setSelectedShipType(null);
  };

  const handleFinishPlacement = () => {
    // Check if all ships have been placed
    const allShipsPlaced = SHIP_TYPES.every(
      (ship) => placedShipsCount[ship.type] >= ship.count
    );

    if (!allShipsPlaced) {
      setMessages((prev) => [
        ...prev,
        "Please place all your ships before continuing",
      ]);
      return;
    }

    // Send ship placement to server if connected
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "SHIP_PLACEMENT",
          ships: playerShips,
          gameId,
        })
      );
    }

    setMessages((prev) => [
      ...prev,
      "Ships placement completed. Waiting for opponent...",
    ]);

    // For demo/testing purposes, automatically move to battle phase after a delay
    setTimeout(() => {
      setGamePhase("battle");
      setMessages((prev) => [
        ...prev,
        "Battle phase started! Your turn to attack.",
      ]);
    }, 2000);
  };

  const handleAttack = (row, col) => {
    if (gamePhase !== "battle" || activePlayer !== 1) return;

    // Check if cell was already attacked
    if (
      opponentBoard[row][col] === "hit" ||
      opponentBoard[row][col] === "miss"
    ) {
      setMessages((prev) => [...prev, "You already attacked this position"]);
      return;
    }

    // Send attack to server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "ATTACK",
          position: { row, col },
          gameId,
        })
      );
    }

    // For offline/demo mode: simulate opponent's ships
    const isHit = Math.random() < 0.4; // 40% chance of hit for demo

    const newBoard = [...opponentBoard];
    newBoard[row] = [...newBoard[row]];
    newBoard[row][col] = isHit ? "hit" : "miss";
    setOpponentBoard(newBoard);
    setPlayerAttacks((prev) => [...prev, { row, col }]);
    setMessages((prev) => [
      ...prev,
      `You attacked ${row},${col} - ${isHit ? "HIT!" : "Miss"}`,
    ]);

    // For demo purposes, switch turn immediately
    switchTurn();

    // For demo/testing: simulate opponent's attack after a delay
    setTimeout(() => {
      if (gamePhase === "battle") {
        const attackRow = Math.floor(Math.random() * BOARD_SIZE);
        const attackCol = Math.floor(Math.random() * BOARD_SIZE);
        handleOpponentAttack({ row: attackRow, col: attackCol });
      }
    }, 1500);
  };

  const renderBoard = (board, isPlayerBoard) => (
    <div className="board">
      {board.map((row, rIdx) => (
        <div key={rIdx} className="board-row">
          {row.map((cell, cIdx) => {
            const cellClass = ["board-cell"];

            // Base cell styling
            if (cell === "ship" && isPlayerBoard) cellClass.push("ship-cell");
            if (cell === "hit") cellClass.push("hit-cell");
            if (cell === "miss") cellClass.push("miss-cell");

            // Hover effect for placement
            if (
              isPlayerBoard &&
              gamePhase === "placement" &&
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
                onClick={() => {
                  if (isPlayerBoard && gamePhase === "placement") {
                    handleCellClick(rIdx, cIdx);
                  } else if (
                    !isPlayerBoard &&
                    gamePhase === "battle" &&
                    activePlayer === 1
                  ) {
                    handleAttack(rIdx, cIdx);
                  }
                }}
                onMouseEnter={() => {
                  if (isPlayerBoard && gamePhase === "placement") {
                    handleCellHover(rIdx, cIdx);
                  }
                }}
                onMouseLeave={() => {
                  if (isPlayerBoard && gamePhase === "placement") {
                    setHoverCoordinates(null);
                  }
                }}
              >
                {cell === "hit" && "💥"}
                {cell === "miss" && "•"}
              </div>
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
          onClick={handleFinishPlacement}
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

  const renderBattleControls = () => (
    <div className="battle-controls">
      <div className="turn-info">
        <span>{activePlayer === 1 ? "Your turn" : `${opponent}'s turn`}</span>
        <span>Time left: {timer}s</span>
      </div>
    </div>
  );

  return (
    <div className="game-container">
      <h1>Battleship Game</h1>
      <p>
        Player: {player} vs {opponent}
      </p>

      {gamePhase === "lobby" && (
        <div className="waiting-screen">
          <h2>Lobby</h2>
          <p>Click when ready:</p>
          <button onClick={handleFinishLobby}>I'm Ready</button>
        </div>
      )}

      {gamePhase === "placement" && (
        <div className="placement-phase">
          <h2>Place Your Ships</h2>
          {renderPlacementControls()}
          {renderBoard(playerBoard, true)}
        </div>
      )}

      {gamePhase === "battle" && (
        <div>
          <h2>Battle Phase</h2>
          {renderBattleControls()}
          <div className="boards-container">
            <div className="player-board">
              <h3>Your Board</h3>
              {renderBoard(playerBoard, true)}
            </div>
            <div className="opponent-board">
              <h3>{opponent}'s Board</h3>
              {renderBoard(opponentBoard, false)}
            </div>
          </div>
        </div>
      )}

      {gamePhase === "gameOver" && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={() => navigate("/lobby")}>Back to Lobby</button>
        </div>
      )}

      <div className="messages">
        <h2>Battle Log</h2>
        <ul>
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Game;
