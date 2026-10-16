import {
  activatedColor,
  backgroundColor,
  cellAmount,
  centerOf,
  colorFor,
  layoutGrid,
  manhattan,
  maxDistance,
  radiusFor,
  restingColor,
  rgbCss,
  VIEW_H,
  VIEW_W,
} from './wave.js';

const ANIMATION_DURATION = 5000;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });

let viewW = 1;
let viewH = 1;
let grid = layoutGrid(1, 1);
let cells = [];
let mode = 'idle';
let startedAt = 0;

function rebuildCells() {
  const { cols, rows, cell, gap, ox, oy } = grid;
  const { cx, cy } = centerOf(cols, rows);
  const maxD = maxDistance(cols, rows);
  cells = new Array(cols * rows);
  let i = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells[i] = {
        x: ox + col * (cell + gap),
        y: oy + row * (cell + gap),
        col,
        row,
        distance: manhattan(col, row, cx, cy),
      };
      i += 1;
    }
  }
  cells.maxD = maxD;
  cells.size = cell;
}

function fit() {
  viewW = VIEW_W;
  viewH = VIEW_H;
  canvas.width = viewW;
  canvas.height = viewH;
  const scale = Math.min(window.innerWidth / viewW, window.innerHeight / viewH);
  canvas.style.width = `${Math.round(viewW * scale)}px`;
  canvas.style.height = `${Math.round(viewH * scale)}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  grid = layoutGrid(viewW, viewH);
  rebuildCells();
}

function paint(now) {
  let elapsed = 0;
  if (mode === 'playing') {
    elapsed = now - startedAt;
    if (elapsed >= ANIMATION_DURATION) {
      elapsed = ANIMATION_DURATION;
      mode = 'done';
    }
  } else if (mode === 'done') {
    elapsed = ANIMATION_DURATION;
  }

  const time = now / 1000;
  const background = backgroundColor(time);
  const resting = restingColor(time);
  const progress = elapsed / ANIMATION_DURATION;
  const radius = mode === 'idle' ? -100 : radiusFor(progress, cells.maxD);
  const size = cells.size;
  const { cols, rows } = grid;

  ctx.fillStyle = rgbCss(background);
  ctx.fillRect(0, 0, viewW, viewH);

  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const amount = cellAmount(cell.distance, radius);
    const active = activatedColor(cell.col, cell.row, cols, rows, time);
    ctx.fillStyle = rgbCss(colorFor(amount, resting, active));
    ctx.fillRect(cell.x, cell.y, size, size);
  }

}

function start() {
  if (mode === 'playing') return;
  startedAt = performance.now();
  mode = 'playing';
  paint(startedAt);
}

function reset() {
  mode = 'idle';
  startedAt = 0;
  paint(performance.now());
}

function isSpace(event) {
  return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
}

window.addEventListener('keydown', (event) => {
  if (isSpace(event)) {
    event.preventDefault();
    start();
  } else if (event.key === 'Escape' || event.code === 'Escape') {
    event.preventDefault();
    reset();
  }
});

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => {
  canvas.focus({ preventScroll: true });
  start();
});

let lastPaint = 0;

function tick() {
  const now = performance.now();
  if (now - lastPaint < 12) return;
  lastPaint = now;
  paint(now);
}

fit();
window.addEventListener('resize', fit);
tick();
requestAnimationFrame(function loop() {
  tick();
  requestAnimationFrame(loop);
});
// Some embedded browsers suspend requestAnimationFrame after the first frame.
// The interval keeps the 5-second clock moving on wall time.
setInterval(tick, 16);
