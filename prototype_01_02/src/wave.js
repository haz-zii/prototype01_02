/**
 * One outward pulse on a square grid.
 * A cell lights by how close its Manhattan distance is to the current wave
 * radius, so the bright part is a moving diamond ring. Cells behind the
 * front fade back off. Squares never move.
 */

export const VIEW_W = 1650;
export const VIEW_H = 2550;

/** Cells of fade ahead of the wave front. */
export const LEAD = 2.2;

/** Cells of fade behind the wave. The center goes dark once the front passes this far. */
export const TAIL = 5.5;

const BLUE = [28, 28, 209];
const PURPLE = [101, 14, 114];
const MAGENTA = [248, 2, 137];
const YELLOW = [223, 255, 13];
const PALETTE = [BLUE, PURPLE, MAGENTA, YELLOW];

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}

function paletteAt(t) {
  const loop = ((t % 1) + 1) % 1;
  const x = t > 0 && loop === 0 ? 1 : loop;
  const scaled = x * (PALETTE.length - 1);
  const i = Math.min(PALETTE.length - 2, Math.floor(scaled));
  const next = Math.min(PALETTE.length - 1, i + 1);
  return mixRgb(PALETTE[i], PALETTE[next], smoothstep(scaled - i));
}

/** Quiet field behind the diamond. Only the two darker palette colors. */
export function backgroundColor(time) {
  const shift = 0.5 - 0.5 * Math.cos(time * 0.16);
  return mixRgb(BLUE, PURPLE, 0.08 + shift * 0.12);
}

/** Resting squares, distinct from the field so the grid reads before the wave. */
export function restingColor(time) {
  const shift = 0.5 - 0.5 * Math.cos(time * 0.16);
  return mixRgb(PURPLE, BLUE, 0.22 + shift * 0.12);
}

/**
 * Color rings follow the same center as the diamond.
 * A corner-to-corner mix hides half the shape in the dark field colors,
 * so the lit cells stay in the bright magenta–yellow range.
 */
export function activatedColor(col, row, cols, rows, time) {
  const { cx, cy } = centerOf(cols, rows);
  const n = manhattan(col, row, cx, cy) / Math.max(1, cx + cy);
  const drift = 0.5 - 0.5 * Math.cos(time * 0.4);
  const ring = paletteAt(1 - n * 0.7);
  const glow = mixRgb(YELLOW, MAGENTA, 0.25 + n * 0.45 + drift * 0.2);
  return mixRgb(ring, glow, 0.7);
}

export function rgbCss(rgb) {
  return `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
}

export function layoutGrid(viewW, viewH) {
  const margin = 40;
  const gap = 2;
  const innerW = viewW - margin * 2;
  const innerH = viewH - margin * 2;
  let cols = Math.round(innerW / 26);
  if (cols % 2 === 0) cols -= 1;
  cols = Math.max(21, cols);
  const cell = Math.max(8, Math.floor((innerW - gap * (cols - 1)) / cols));
  let rows = Math.floor((innerH + gap) / (cell + gap));
  if (rows % 2 === 0) rows -= 1;
  rows = Math.max(21, rows);
  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = rows * cell + (rows - 1) * gap;
  return {
    cols,
    rows,
    cell,
    gap,
    ox: Math.round((viewW - gridW) / 2),
    oy: Math.round((viewH - gridH) / 2),
  };
}

export function centerOf(cols, rows) {
  return { cx: (cols - 1) / 2, cy: (rows - 1) / 2 };
}

export function manhattan(col, row, cx, cy) {
  return Math.abs(col - cx) + Math.abs(row - cy);
}

export function maxDistance(cols, rows) {
  const { cx, cy } = centerOf(cols, rows);
  return cx + cy;
}

/** Eased wave position in cell steps. At 1 the front has passed the farthest cell. */
export function radiusFor(progress, maxD) {
  if (progress <= 0) return 0;
  return easeInOutCubic(progress) * (maxD + TAIL);
}

/**
 * Brightness of a cell relative to the moving front.
 * Ahead of the wave is dark. The front is brightest. Cells behind fade back off.
 */
export function cellAmount(distance, radius) {
  const delta = distance - radius;
  if (delta >= LEAD || delta <= -TAIL) return 0;
  if (delta >= 0) return smoothstep(1 - delta / LEAD);
  return smoothstep(1 + delta / TAIL);
}

export function colorFor(amount, background, active) {
  return mixRgb(background, active, smoothstep(clamp(amount, 0, 1)));
}

export function asciiFrame(progress, cols, rows) {
  const { cx, cy } = centerOf(cols, rows);
  const radius = radiusFor(progress, cx + cy);
  const lines = [];
  for (let row = 0; row < rows; row += 1) {
    let line = '';
    for (let col = 0; col < cols; col += 1) {
      const amount = cellAmount(manhattan(col, row, cx, cy), radius);
      if (amount > 0.72) line += 'X';
      else if (amount > 0.08) line += '+';
      else line += '·';
    }
    lines.push(line);
  }
  return lines.join('\n');
}
