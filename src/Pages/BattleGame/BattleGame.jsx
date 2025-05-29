import React from "react";
import "./BattleGame.css";

const BOARD_SIZE = 10;
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

const BattleGame = ({
  playerBoard,
  opponentBoard,
  activePlayer,
  opponent,
  timer,
  selectedSpecialAttack,
  setSelectedSpecialAttack,
  specialAttackUses,
  specialAttackCooldowns,
  sonarRevealed,
  attackPreview,
  onAttack,
  onSpecialAttackHover,
  onClearPreview,
}) => {
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

            if (
              !isPlayerBoard &&
              attackPreview.some((p) => p.row === rIdx && p.col === cIdx)
            ) {
              cellClass.push("attack-preview");
            }

            return (
              <div
                key={cIdx}
                className={cellClass.join(" ")}
                onClick={() => {
                  if (!isPlayerBoard && activePlayer === 1) {
                    onAttack(rIdx, cIdx);
                  }
                }}
                onMouseEnter={() => {
                  if (!isPlayerBoard && activePlayer === 1) {
                    onSpecialAttackHover(rIdx, cIdx);
                  }
                }}
                onMouseLeave={() => {
                  if (!isPlayerBoard) {
                    onClearPreview();
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

  const renderBattleControls = () => (
    <div className="battle-controls">
      <div className="turn-info">
        <span>{activePlayer === 1 ? "Your turn" : `${opponent}'s turn`}</span>
        <span>Time left: {timer}s</span>
      </div>

      <div
        className={`special-attacks ${activePlayer !== 1 ? "disabled" : ""}`}
      >
        <h4>Special Attacks</h4>
        <div className="special-attack-buttons">
          {SPECIAL_ATTACKS.map((attack) => {
            const usesLeft = specialAttackUses[attack.type];
            const cooldown = specialAttackCooldowns[attack.type] || 0;
            const isDisabled =
              usesLeft <= 0 || cooldown > 0 || activePlayer !== 1;

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
                title={`${attack.description} (${usesLeft} uses left)${
                  cooldown > 0 ? ` - Cooldown: ${cooldown}` : ""
                }`}
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
              Selected:{" "}
              {
                SPECIAL_ATTACKS.find((a) => a.type === selectedSpecialAttack)
                  ?.name
              }
              <br />
              <small>
                {
                  SPECIAL_ATTACKS.find((a) => a.type === selectedSpecialAttack)
                    ?.description
                }
              </small>
            </p>
            <button
              onClick={() => {
                setSelectedSpecialAttack(null);
                onClearPreview();
              }}
            >
              Cancel Special Attack
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="battle-phase">
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
  );
};

export default BattleGame;
