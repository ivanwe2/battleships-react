import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShipPlacement from "../ShipPlacement/ShipPlacement";
import BattleGame from "../BattleGame/BattleGame";
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

const SPECIAL_ATTACKS = [
  {
    type: "bomb",
    name: "Area Bomb",
    description: "Attacks a 2x2 area",
    pattern: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    icon: "💣",
    maxUses: 2,
    cooldown: 0,
  },
  {
    type: "torpedo",
    name: "Torpedo Line",
    description: "Attacks entire row",
    pattern: "horizontal_line",
    icon: "🚀",
    maxUses: 1,
    cooldown: 0,
  },
  {
    type: "sonar",
    name: "Sonar Pulse",
    description: "Reveals 3x3 area without attacking",
    pattern: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    icon: "📡",
    maxUses: 2,
    cooldown: 0,
  },
  {
    type: "missile",
    name: "Cruise Missile",
    description: "Cross-shaped explosion",
    pattern: [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    icon: "🚁",
    maxUses: 1,
    cooldown: 0,
  },
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
  const [gamePhase, setGamePhase] = useState("placement"); // Start with placement phase
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

  const [selectedSpecialAttack, setSelectedSpecialAttack] = useState(null);
  const [specialAttackUses, setSpecialAttackUses] = useState(
    SPECIAL_ATTACKS.reduce((acc, attack) => {
      acc[attack.type] = attack.maxUses;
      return acc;
    }, {})
  );
  const [specialAttackCooldowns, setSpecialAttackCooldowns] = useState({});
  const [sonarRevealed, setSonarRevealed] = useState(new Set());
  const [attackPreview, setAttackPreview] = useState([]);

  // Helper functions
  const checkIfHit = (ships, row, col) =>
    ships.some((ship) => ship.occupied.includes(row * BOARD_SIZE + col));

  const checkIfAllShipsSunk = (ships, attacks) =>
    ships.every((ship) =>
      ship.occupied.every((cell) =>
        attacks.map((a) => a.row * BOARD_SIZE + a.col).includes(cell)
      )
    );

  const calculatePlacementValidity = (
    board,
    row,
    col,
    shipSize,
    orientation
  ) => {
    if (orientation === "horizontal") {
      if (col + shipSize > BOARD_SIZE) return false;
      for (let i = 0; i < shipSize; i++) {
        if (board[row][col + i] === "ship") return false;
      }
    } else {
      if (row + shipSize > BOARD_SIZE) return false;
      for (let i = 0; i < shipSize; i++) {
        if (board[row + i][col] === "ship") return false;
      }
    }
    return true;
  };

  const switchTurn = () => {
    setActivePlayer((p) => (p === 1 ? 2 : 1));
    setTimer(60);

    setSpecialAttackCooldowns((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key] > 0) updated[key]--;
      });
      return updated;
    });
  };

  const calculateSpecialAttackCells = (row, col, attackType) => {
    const attack = SPECIAL_ATTACKS.find((a) => a.type === attackType);
    if (!attack) return [];

    const cells = [];

    if (attack.pattern === "horizontal_line") {
      for (let c = 0; c < BOARD_SIZE; c++) {
        cells.push({ row, col: c });
      }
    } else if (Array.isArray(attack.pattern)) {
      attack.pattern.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        if (
          newRow >= 0 &&
          newRow < BOARD_SIZE &&
          newCol >= 0 &&
          newCol < BOARD_SIZE
        ) {
          cells.push({ row: newRow, col: newCol });
        }
      });
    }

    return cells;
  };

  // Ship placement handlers
  const handleCellClick = (row, col) => {
    if (!selectedShipType) return;

    const shipSize = SHIP_TYPES.find(
      (ship) => ship.type === selectedShipType
    )?.size;
    if (!shipSize) return;

    if (
      calculatePlacementValidity(playerBoard, row, col, shipSize, orientation)
    ) {
      const newBoard = [...playerBoard];
      const occupied = [];

      if (orientation === "horizontal") {
        for (let i = 0; i < shipSize; i++) {
          newBoard[row][col + i] = "ship";
          occupied.push(row * BOARD_SIZE + (col + i));
        }
      } else {
        for (let i = 0; i < shipSize; i++) {
          newBoard[row + i][col] = "ship";
          occupied.push((row + i) * BOARD_SIZE + col);
        }
      }

      setPlayerBoard(newBoard);
      setPlayerShips((prev) => [
        ...prev,
        {
          type: selectedShipType,
          occupied,
        },
      ]);
      setPlacedShipsCount((prev) => ({
        ...prev,
        [selectedShipType]: prev[selectedShipType] + 1,
      }));
      setSelectedShipType(null);
    }
  };

  const handleFinishPlacement = () => {
    if (SHIP_TYPES.every((ship) => placedShipsCount[ship.type] >= ship.count)) {
      setGamePhase("battle");
      setMessages((prev) => [
        ...prev,
        "Ship placement complete! Battle phase started.",
      ]);

      // Send ship placement to opponent if WebSocket is connected
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "SHIP_PLACEMENT",
            ships: playerShips,
          })
        );
      }
    }
  };

  // Battle handlers
  const handleSpecialAttackHover = (row, col) => {
    if (!selectedSpecialAttack) {
      setAttackPreview([]);
      return;
    }

    const cells = calculateSpecialAttackCells(row, col, selectedSpecialAttack);
    setAttackPreview(cells);
  };

  const handleClearPreview = () => {
    setAttackPreview([]);
  };

  const handleAttack = (row, col) => {
    if (activePlayer !== 1 || gamePhase !== "battle") return;

    let attackType = "normal";
    let affectedCells = [{ row, col }];

    if (selectedSpecialAttack) {
      attackType = selectedSpecialAttack;
      affectedCells = calculateSpecialAttackCells(
        row,
        col,
        selectedSpecialAttack
      );

      // Use up the special attack
      setSpecialAttackUses((prev) => ({
        ...prev,
        [selectedSpecialAttack]: prev[selectedSpecialAttack] - 1,
      }));

      // Set cooldown
      const attack = SPECIAL_ATTACKS.find(
        (a) => a.type === selectedSpecialAttack
      );
      if (attack && attack.cooldown > 0) {
        setSpecialAttackCooldowns((prev) => ({
          ...prev,
          [selectedSpecialAttack]: attack.cooldown,
        }));
      }

      setSelectedSpecialAttack(null);
    }

    const newBoard = [...opponentBoard];
    let hitCount = 0;

    affectedCells.forEach(({ row: r, col: c }) => {
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        const isHit = checkIfHit(opponentShips, r, c);
        newBoard[r] = [...newBoard[r]];

        if (attackType === "sonar") {
          setSonarRevealed((prev) => new Set([...prev, `${r}-${c}`]));
        } else {
          newBoard[r][c] =
            newBoard[r][c] === "hit" ? "hit" : isHit ? "hit" : "miss";
          if (isHit) hitCount++;
        }
      }
    });

    setOpponentBoard(newBoard);
    setPlayerAttacks((prev) => [...prev, { row, col, attackType }]);

    const attackName =
      SPECIAL_ATTACKS.find((a) => a.type === attackType)?.name ||
      "normal attack";
    if (attackType === "sonar") {
      setMessages((prev) => [
        ...prev,
        `You used ${attackName} at ${row},${col} - Area revealed!`,
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        `You used ${attackName} at ${row},${col} - ${hitCount} hits!`,
      ]);
    }

    // Send attack to opponent
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (attackType === "normal") {
        ws.send(
          JSON.stringify({
            type: "ATTACK",
            position: { row, col },
          })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "SPECIAL_ATTACK",
            position: { row, col },
            attackType,
          })
        );
      }
    }

    const allAttacks = [...playerAttacks, ...affectedCells];
    if (checkIfAllShipsSunk(opponentShips, allAttacks)) {
      setGamePhase("gameOver");
      setMessages((prev) => [...prev, "You win!"]);
    } else {
      switchTurn();
    }

    setAttackPreview([]);
  };

  const handleOpponentAttack = useCallback(
    ({ row, col, attackType = "normal" }) => {
      let affectedCells = [{ row, col }];

      if (attackType !== "normal") {
        affectedCells = calculateSpecialAttackCells(row, col, attackType);
      }

      const newBoard = [...playerBoard];
      let hitCount = 0;

      affectedCells.forEach(({ row: r, col: c }) => {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          const isHit = checkIfHit(playerShips, r, c);
          newBoard[r] = [...newBoard[r]];

          if (attackType === "sonar") {
            setSonarRevealed((prev) => new Set([...prev, `${r}-${c}`]));
          } else {
            newBoard[r][c] =
              newBoard[r][c] === "hit" ? "hit" : isHit ? "hit" : "miss";
            if (isHit) hitCount++;
          }
        }
      });

      setPlayerBoard(newBoard);
      setOpponentAttacks((prev) => [...prev, { row, col, attackType }]);

      const attackName =
        SPECIAL_ATTACKS.find((a) => a.type === attackType)?.name ||
        "normal attack";
      if (attackType === "sonar") {
        setMessages((prev) => [
          ...prev,
          `${opponent} used ${attackName} at ${row},${col} - Area revealed!`,
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          `${opponent} used ${attackName} at ${row},${col} - ${hitCount} hits!`,
        ]);
      }

      const allAttacks = [...opponentAttacks, ...affectedCells];
      if (checkIfAllShipsSunk(playerShips, allAttacks)) {
        setGamePhase("gameOver");
        setMessages((prev) => [...prev, `${opponent} wins!`]);
      } else {
        switchTurn();
      }
    },
    [playerShips, opponent, opponentAttacks, playerBoard]
  );

  // WebSocket message handler
  const handleSocketMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "ATTACK":
          handleOpponentAttack(data.position);
          break;
        case "SPECIAL_ATTACK":
          handleOpponentAttack({
            ...data.position,
            attackType: data.attackType,
          });
          break;
        case "SHIP_PLACEMENT":
          setOpponentShips(data.ships);
          break;
        case "GAME_START":
          setGamePhase("battle");
          break;
        case "GAME_OVER":
          setGamePhase("gameOver");
          setMessages((prev) => [...prev, `Game over! ${data.winner} wins!`]);
          break;
        default:
          console.log("Unknown message type:", data.type);
      }
    },
    [handleOpponentAttack]
  );

  // WebSocket setup
  useEffect(() => {
    if (gameId) {
      const wsUrl =
        process.env.REACT_APP_WS_SERVER_URL || "ws://localhost:8080";
      try {
        const socket = new WebSocket(wsUrl);
        setWs(socket);

        socket.onopen = () => {
          setMessages((prev) => [...prev, "Connected to game server"]);
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

        socket.onclose = () => {
          setMessages((prev) => [...prev, "Disconnected from server"]);
        };

        return () => {
          socket.close();
        };
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
        setMessages((prev) => [
          ...prev,
          "Failed to connect. Playing in offline mode.",
        ]);
      }
    }
  }, [gameId, player, handleSocketMessage]);

  // Timer effect
  useEffect(() => {
    if (gamePhase === "battle" && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    } else if (timer === 0 && gamePhase === "battle") {
      switchTurn();
    }
  }, [timer, gamePhase]);

  const handleNewGame = () => {
    navigate("/lobby");
  };

  if (gamePhase === "gameOver") {
    return (
      <div className="game-container">
        <div className="game-over">
          <h2>Game Over!</h2>
          <button onClick={handleNewGame}>New Game</button>
        </div>
        <div className="messages">
          <h2>Game Log</h2>
          <ul>
            {messages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      {gamePhase === "placement" && (
        <ShipPlacement
          playerBoard={playerBoard}
          selectedShipType={selectedShipType}
          setSelectedShipType={setSelectedShipType}
          placedShipsCount={placedShipsCount}
          orientation={orientation}
          setOrientation={setOrientation}
          hoverCoordinates={hoverCoordinates}
          setHoverCoordinates={setHoverCoordinates}
          placementValid={placementValid}
          setPlacementValid={setPlacementValid}
          onCellClick={handleCellClick}
          onFinishPlacement={handleFinishPlacement}
          calculatePlacementValidity={calculatePlacementValidity}
        />
      )}

      {gamePhase === "battle" && (
        <BattleGame
          playerBoard={playerBoard}
          opponentBoard={opponentBoard}
          activePlayer={activePlayer}
          opponent={opponent}
          timer={timer}
          selectedSpecialAttack={selectedSpecialAttack}
          setSelectedSpecialAttack={setSelectedSpecialAttack}
          specialAttackUses={specialAttackUses}
          specialAttackCooldowns={specialAttackCooldowns}
          sonarRevealed={sonarRevealed}
          attackPreview={attackPreview}
          onAttack={handleAttack}
          onSpecialAttackHover={handleSpecialAttackHover}
          onClearPreview={handleClearPreview}
        />
      )}

      <div className="messages">
        <h2>Game Log</h2>
        <ul>
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Game;
