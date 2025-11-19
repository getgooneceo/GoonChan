import React from 'react';

const STATUS_COLORS = {
  online: '#3ba55d',
  idle: '#faa81a',
  away: '#faa81a',
  dnd: '#ed4245',
  offline: '#4f5660',
  default: '#4f5660'
};

const STATUS_SIZES = {
  xs: { diameter: 11, border: 2 },
  sm: { diameter: 14, border: 2.5 },
  md: { diameter: 18, border: 3 },
  lg: { diameter: 23, border: 3.5 }
};

export const StatusBadge = ({ status, size = 'sm', borderColor, className = '' }) => {
  const preset = STATUS_SIZES[size] || STATUS_SIZES.sm;
  const badgeColor = STATUS_COLORS[status] || STATUS_COLORS.default;
  const borderShade = borderColor ?? 'transparent';
  const idlePreset = {
    diameter: preset.diameter * 0.47,
    offset: preset.diameter * 0
  };
  const dndPreset = {
    width: preset.diameter * 0.60,
    height: Math.max(2, preset.diameter * 0.17)
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{
        width: `${preset.diameter}px`,
        height: `${preset.diameter}px`,
        backgroundColor: badgeColor,
        border: `${preset.border}px solid ${borderShade}`,
        boxSizing: 'border-box'
      }}
    >
      <span className="relative inline-flex items-center justify-center w-full h-full rounded-full">
        {(status === 'idle' || status === 'away') && (
          <span
            className="absolute rounded-full"
            style={{
              width: `${idlePreset.diameter}px`,
              height: `${idlePreset.diameter}px`,
              backgroundColor: '#000000',
              top: `${idlePreset.offset}px`,
              left: `${idlePreset.offset}px`
            }}
          />
        )}
        {status === 'dnd' && (
          <span
            className="rounded-full"
            style={{
              width: `${dndPreset.width}px`,
              height: `${dndPreset.height}px`,
              backgroundColor: borderShade
            }}
          />
        )}
        {status === 'offline' && (
          <span
            className="absolute rounded-full"
            style={{
              width: `${preset.diameter * 0.367}px`,
              height: `${preset.diameter * 0.367}px`,
              backgroundColor: borderShade
            }}
          />
        )}
      </span>
    </span>
  );
};
