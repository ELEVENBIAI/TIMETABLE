import { GRID_END_HOUR, GRID_START_HOUR, PX_PER_MINUTE } from './WeekGrid.types';

/**
 * Y-Achse mit Stundenmarkern 07:00–18:00.
 * Wird in einer 64px-breiten Spalte links neben dem Grid gerendert.
 */
export function TimeAxis() {
  const hours = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    hours.push(h);
  }
  return (
    <div className="relative w-16 shrink-0 border-r border-border" aria-hidden="true">
      {hours.map((h, idx) => (
        <div
          key={h}
          className="absolute right-2 -translate-y-1/2 text-label numeric tabular-nums text-text-muted"
          style={{ top: idx * 60 * PX_PER_MINUTE }}
        >
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  );
}

/**
 * Hintergrund-Stundenlinien für eine Tagesspalte. Wird absolut positioniert
 * gerendert hinter den Entry-Cards.
 */
export function HourGridBackground() {
  const lines = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    const idx = h - GRID_START_HOUR;
    lines.push(
      <div
        key={h}
        className="absolute inset-x-0 border-t border-border"
        style={{ top: idx * 60 * PX_PER_MINUTE }}
      />
    );
    if (h < GRID_END_HOUR) {
      // Halbstunden-Strich gestrichelt
      lines.push(
        <div
          key={`${h}-half`}
          className="absolute inset-x-0 border-t border-border/40 border-dashed"
          style={{ top: idx * 60 * PX_PER_MINUTE + 30 * PX_PER_MINUTE }}
        />
      );
    }
  }
  return <>{lines}</>;
}
