import React from 'react';
import PropTypes from 'prop-types';
import Cell from './Cell';
import '../../Pages/Game/Game.css';

const Board = ({ board, onCellClick, isDisabled }) => {
  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="board-row">
          {row.map((cell, colIndex) => (
            <Cell
              key={`cell-${rowIndex}-${colIndex}`}
              value={cell}
              onClick={() => onCellClick(rowIndex, colIndex)}
              disabled={isDisabled || cell !== null}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

Board.propTypes = {
  board: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.string)
  ).isRequired,
  onCellClick: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool
};

Board.defaultProps = {
  isDisabled: false
};

export default Board;