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


const SPECIAL_ATTACKS = [
  {
    type: "bomb",
    name: "Area Bomb",
    description: "Attacks a 2x2 area",
    pattern: [[0,0], [0,1], [1,0], [1,1]],
    icon: "💣",
    maxUses: 2,
    cooldown: 0
  },
  {
    type: "torpedo",
    name: "Torpedo Line",
    description: "Attacks entire row",
    pattern: "horizontal_line",
    icon: "🚀",
    maxUses: 1,
    cooldown: 0
  },
  {
    type: "sonar",
    name: "Sonar Pulse",
    description: "Reveals 3x3 area without attacking",
    pattern: [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]],
    icon: "📡",
    maxUses: 2,
    cooldown: 0
  },
  {
    type: "missile",
    name: "Cruise Missile",
    description: "Cross-shaped explosion",
    pattern: [[0,0], [-1,0], [1,0], [0,-1], [0,1]],
    icon: "🚁",
    maxUses: 1,
    cooldown: 0
  }
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
  //const [opponentShips, setOpponentShips] = useState([]);
  const [playerBoard, setPlayerBoard] = useState(createEmptyBoard());
  const [opponentBoard, setOpponentBoard] = useState(createEmptyBoard());
  //const [playerAttacks, setPlayerAttacks] = useState([]);
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
    
    setSpecialAttackCooldowns(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key] > 0) updated[key]--;
      });
      return updated;
    });
  };

  const calculateSpecialAttackCells = (row, col, attackType) => {
    const attack = SPECIAL_ATTACKS.find(a => a.type === attackType);
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
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
          cells.push({ row: newRow, col: newCol });
        }
      });
    }

    return cells;
  };

  const handleSpecialAttackHover = (row, col) => {
    if (!selectedSpecialAttack) {
      setAttackPreview([]);
      return;
    }

    const cells = calculateSpecialAttackCells(row, col, selectedSpecialAttack);
    setAttackPreview(cells);
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
            setSonarRevealed(prev => new Set([...prev, `${r}-${c}`]));
          } else {
            newBoard[r][c] = newBoard[r][c] === "hit" ? "hit" : (isHit ? "hit" : "miss");
            if (isHit) hitCount++;
          }
        }
      });

      setPlayerBoard(newBoard);
      setOpponentAttacks((p) => [...p, { row, col, attackType }]);
      
      const attackName = SPECIAL_ATTACKS.find(a => a.type === attackType)?.name || "normal attack";
      if (attackType === "sonar") {
        setMessages((p) => [...p, `${opponent} used ${attackName} at ${row},${col} - Area revealed!`]);
      } else {
        setMessages((p) => [...p, `${opponent} used ${attackName} at ${row},${col} - ${hitCount} hits!`]);
      }

      const allAttacks = [...opponentAttacks, ...affectedCells];
      if (checkIfAllShipsSunk(playerShips, allAttacks)) {
        setGamePhase("gameOver");
        setMessages((p) => [...p, `${opponent} wins!`]);
      } else {
        switchTurn();
      }
    },
    [playerShips, opponent, opponentAttacks, playerBoard]
  );

  const handleSocketMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "ATTACK":
          handleOpponentAttack(data.position);
          break;
        case "SPECIAL_ATTACK":
          handleOpponentAttack({
            ...data.position,
            attackType: data.attackType
          });
          break;
        case "SHIP_PLACEMENT":
          //setOpponentShips(data.ships);
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

  const calculatePlacementValidity = (
    board,
    row,
    col,
    shipSize,
    shipOrientation
  ) => {
    if (!shipSize) return false;

    if (shipOrientation === "horizontal" && col + shipSize > BOARD_SIZE) {
      return false;
    }
    if (shipOrientation === "vertical" && row + shipSize > BOARD_SIZE) {
      return false;
    }

    for (let i = 0; i < shipSize; i++) {
      const r = shipOrientation === "horizontal" ? row : row + i;
      const c = shipOrientation === "vertical" ? col : col + i;

      if (board[r][c]) {
        return false;
      }

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
    if (gamePhase === "placement" && selectedShipType) {
      const shipSize = SHIP_TYPES.find(
        (ship) => ship.type === selectedShipType
      )?.size;
      if (!shipSize) return;

      setHoverCoordinates({ row, col });
      setPlacementValid(
        calculatePlacementValidity(playerBoard, row, col, shipSize, orientation)
      );
    } else if (gamePhase === "battle" && selectedSpecialAttack && activePlayer === 1) {
      handleSpecialAttackHover(row, col);
    }
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

    if (
      !calculatePlacementValidity(playerBoard, row, col, shipSize, orientation)
    ) {
      setMessages((prev) => [
        ...prev,
        `Cannot place ship here. Check boundaries and other ships.`,
      ]);
      return;
    }

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

    if (selectedSpecialAttack) {
      return handleSpecialAttack(row, col);
    }

    if (
      opponentBoard[row][col] === "hit" ||
      opponentBoard[row][col] === "miss"
    ) {
      setMessages((prev) => [...prev, "You already attacked this position"]);
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "ATTACK",
          position: { row, col },
          gameId,
        })
      );
    }

    const isHit = Math.random() < 0.4;

    const newBoard = [...opponentBoard];
    newBoard[row] = [...newBoard[row]];
    newBoard[row][col] = isHit ? "hit" : "miss";
    setOpponentBoard(newBoard);
    //setPlayerAttacks((prev) => [...prev, { row, col }]);
    setMessages((prev) => [
      ...prev,
      `You attacked ${row},${col} - ${isHit ? "HIT!" : "Miss"}`,
    ]);

    switchTurn();

    setTimeout(() => {
      if (gamePhase === "battle") {
        const attackRow = Math.floor(Math.random() * BOARD_SIZE);
        const attackCol = Math.floor(Math.random() * BOARD_SIZE);
        handleOpponentAttack({ row: attackRow, col: attackCol });
      }
    }, 1500);
  };

  const handleSpecialAttack = (row, col) => {
  if (activePlayer !== 1) return;
  const attack = SPECIAL_ATTACKS.find(a => a.type === selectedSpecialAttack);
  if (!attack) return;

    if (specialAttackUses[selectedSpecialAttack] <= 0) {
      setMessages((prev) => [...prev, `No ${attack.name} uses left!`]);
      return;
    }

    if (specialAttackCooldowns[selectedSpecialAttack] > 0) {
      setMessages((prev) => [...prev, `${attack.name} is on cooldown!`]);
      return;
    }

    const affectedCells = calculateSpecialAttackCells(row, col, selectedSpecialAttack);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "SPECIAL_ATTACK",
          attackType: selectedSpecialAttack,
          position: { row, col },
          gameId,
        })
      );
    }

    const newBoard = [...opponentBoard];
    let hitCount = 0;

    affectedCells.forEach(({ row: r, col: c }) => {
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        if (selectedSpecialAttack === "sonar") {
          const hasShip = Math.random() < 0.3; 
          setSonarRevealed(prev => new Set([...prev, `${r}-${c}`]));
          if (hasShip) {
            newBoard[r] = [...newBoard[r]];
            newBoard[r][c] = "revealed";
          }
        } else {
          if (newBoard[r][c] !== "hit" && newBoard[r][c] !== "miss") {
            const isHit = Math.random() < 0.4;
            newBoard[r] = [...newBoard[r]];
            newBoard[r][c] = isHit ? "hit" : "miss";
            if (isHit) hitCount++;
          }
        }
      }
    });

    setOpponentBoard(newBoard);
    
    setSpecialAttackUses(prev => ({
      ...prev,
      [selectedSpecialAttack]: prev[selectedSpecialAttack] - 1
    }));
    
    if (attack.cooldown > 0) {
      setSpecialAttackCooldowns(prev => ({
        ...prev,
        [selectedSpecialAttack]: attack.cooldown
      }));
    }

    if (selectedSpecialAttack === "sonar") {
      setMessages((prev) => [
        ...prev,
        `${attack.name} used at ${row},${col} - Area revealed!`,
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        `${attack.name} used at ${row},${col} - ${hitCount} hits!`,
      ]);
    }

    setSelectedSpecialAttack(null);
    setAttackPreview([]);
    switchTurn();

    setTimeout(() => {
      if (gamePhase === "battle") {
        const attackRow = Math.floor(Math.random() * BOARD_SIZE);
        const attackCol = Math.floor(Math.random() * BOARD_SIZE);
        const useSpecial = Math.random() < 0.3;
        
        if (useSpecial) {
          const randomSpecial = SPECIAL_ATTACKS[Math.floor(Math.random() * SPECIAL_ATTACKS.length)];
          handleOpponentAttack({ 
            row: attackRow, 
            col: attackCol, 
            attackType: randomSpecial.type 
          });
        } else {
          handleOpponentAttack({ row: attackRow, col: attackCol });
        }
      }
    }, 2000);
  };

  const renderBoard = (board, isPlayerBoard) => (
    <div className="board">
      {board.map((row, rIdx) => (
        <div key={rIdx} className="board-row">
          {row.map((cell, cIdx) => {
            const cellClass = ["board-cell"];

            if (cell === "ship" && isPlayerBoard) cellClass.push("ship-cell");
            if (cell === "hit") cellClass.push("hit-cell");
            if (cell === "miss") cellClass.push("miss-cell");
            if (cell === "revealed") cellClass.push("revealed-cell");

            if (sonarRevealed.has(`${rIdx}-${cIdx}`) && !isPlayerBoard) {
              cellClass.push("sonar-revealed");
            }

            if (!isPlayerBoard && attackPreview.some(p => p.row === rIdx && p.col === cIdx)) {
              cellClass.push("attack-preview");
            }

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
                  } else if (!isPlayerBoard && gamePhase === "battle" && activePlayer === 1) {
                    handleAttack(rIdx, cIdx);
                  }
                }}
                onMouseEnter={() => {
                  if (isPlayerBoard && gamePhase === "placement") {
                    handleCellHover(rIdx, cIdx);
                  } else if (!isPlayerBoard && gamePhase === "battle" && activePlayer === 1) {
                    handleCellHover(rIdx, cIdx);
                  }
                }}
                onMouseLeave={() => {
                  if (isPlayerBoard && gamePhase === "placement") {
                    setHoverCoordinates(null);
                  } else if (!isPlayerBoard && gamePhase === "battle") {
                    setAttackPreview([]);
                  }
                }}
              >
                {cell === "hit" && "💥"}
                {cell === "miss" && "•"}
                {cell === "revealed" && "👁️"}
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

    <div className={`special-attacks ${activePlayer !== 1 ? 'disabled' : ''}`}>
      <h4>Special Attacks</h4>
      <div className="special-attack-buttons">
        {SPECIAL_ATTACKS.map((attack) => {
          const usesLeft = specialAttackUses[attack.type];
          const cooldown = specialAttackCooldowns[attack.type] || 0;
          const isDisabled = usesLeft <= 0 || cooldown > 0 || activePlayer !== 1;

          return (
            <button
              key={attack.type}
              className={`special-button ${
                selectedSpecialAttack === attack.type ? "selected" : ""
              }`}
              onClick={() => {
                if (activePlayer !== 1) return;
                setSelectedSpecialAttack(
                  selectedSpecialAttack === attack.type ? null : attack.type
                );
              }}
              disabled={isDisabled}
              title={`${attack.description} (${usesLeft} uses left)${cooldown > 0 ? ` - Cooldown: ${cooldown}` : ''}`}
            >
              {attack.icon} {attack.name} ({usesLeft})
              {cooldown > 0 && <span className="cooldown">({cooldown})</span>}
            </button>
          );
        })}
      </div>
      {activePlayer === 1 && selectedSpecialAttack && (
        <div className="special-attack-info">
          <p>
            Selected: {SPECIAL_ATTACKS.find(a => a.type === selectedSpecialAttack)?.name}
            <br />
            <small>{SPECIAL_ATTACKS.find(a => a.type === selectedSpecialAttack)?.description}</small>
          </p>
          <button onClick={() => { setSelectedSpecialAttack(null); setAttackPreview([]); }}>
            Cancel Special Attack
          </button>
        </div>
      )}
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
          <p>{activePlayer === 1 ? "You win!" : `${opponent} wins!`}</p>
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