import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShipPlacement from "./ShipPlacement/ShipPlacement";
import BattleGame from "./BattleGame/BattleGame";
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
          ]);}