import React from 'react';
import PropTypes from 'prop-types';
import '../../Pages/Game/Game.css';

const Cell = ({ value, onClick, disabled }) => {
  const getCellClass = () => {
    const baseClass = 'board-cell';
    if (disabled) return `${baseClass} disabled`;
    if (value === 'hit') return `${baseClass} hit`;
    if (value === 'miss') return `${baseClass} miss`;
    if (value === 'attacked') return `${baseClass} attacked`;
    return baseClass;
  };

  const getDisplayValue = () => {
    if (value === 'hit') return '💥';
    if (value === 'miss') return '💦';
    if (value === 'attacked') return '🎯';
    return '';
  };

  return (
    <button
      className={getCellClass()}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Cell ${value || 'empty'}`}
    >
      {getDisplayValue()}
    </button>
  );
};

Cell.propTypes = {
  value: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

Cell.defaultProps = {
  value: null,
  disabled: false
};

export default Cell;