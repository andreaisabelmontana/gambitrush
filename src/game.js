// Knightmare — survive an escalating hazard board.
//
// You occupy one square of a 6×6 grid. Each wave, chess-piece hazards telegraph
// the squares they're about to strike — a Rook sweeps a full row or column, a
// Bishop a diagonal, a Knight lands on an L-jump square. Dodge off the warned
// squares before the strike lands. Survive a wave and the board gets faster and
// busier. One hit ends the run.

const GRID = 6;

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const SCORES_KEY = "knightmare.scores";

const game = {
  player: { x: 2, y: 2, rx: 2, ry: 2 }, // rx/ry = render (lerped) position
  wave: 0,
  phase: "idle",   // idle | warn | strike | recover | dead
  t: 0,
  danger: new Set(),
  hazards: [],     // for rendering telegraphs: {type, cells:Set, meta}
  alive: false,
  best: 0,
};

let dim = 0, ox = 0, oy = 0, cell = 0; // board geometry in px

function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dim = Math.min(w, h) * 0.74;
  cell = dim / GRID;
  ox = (w - dim) / 2; oy = (h - dim) / 2 + 8;
}
window.addEventListener("resize", fit);

// ---------- difficulty ----------
const warnTime = () => Math.max(0.42, 1.15 - game.wave * 0.028);
const hazardCount = () => Math.min(4, 1 + Math.floor(game.wave / 5));

// ---------- hazards ----------
function key(x, y) { return y * GRID + x; }
const ri = (n) => (Math.random() * n) | 0;

function buildWave() {
  game.danger = new Set();
  game.hazards = [];
  const n = hazardCount();
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    if (roll < 0.4) rook();
    else if (roll < 0.72) bishop();
    else knight();
  }
  // never make the board fully inescapable: ensure at least a few safe cells
  ensureEscape();
}

function rook() {
  const cells = new Set();
  if (Math.random() < 0.5) { const r = ri(GRID); for (let x = 0; x < GRID; x++) cells.add(key(x, r)); }
  else { const c = ri(GRID); for (let y = 0; y < GRID; y++) cells.add(key(c, y)); }
  addHazard("rook", cells);
}

function bishop() {
  const cells = new Set();
  const sx = ri(GRID), sy = ri(GRID);
  const dir = Math.random() < 0.5 ? 1 : -1;
  for (let x = 0; x < GRID; x++) {
    const y = sy + (x - sx) * dir;
    if (y >= 0 && y < GRID) cells.add(key(x, y));
  }
  addHazard("bishop", cells);
}

function knight() {
  // land on a knight's-move square relative to a random anchor
  const ax = ri(GRID), ay = ri(GRID);
  const moves = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const cells = new Set();
  for (let k = 0; k < 2; k++) {
    const [dx, dy] = moves[ri(moves.length)];
    const x = ax + dx, y = ay + dy;
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) cells.add(key(x, y));
  }
  if (cells.size === 0) cells.add(key(ri(GRID), ri(GRID)));
  addHazard("knight", cells);
}

function addHazard(type, cells) {
  game.hazards.push({ type, cells });
  for (const c of cells) game.danger.add(c);
}

function ensureEscape() {
  // if every cell is dangerous, clear a random 2x2 pocket so the player can live
  if (game.danger.size >= GRID * GRID) {
    const bx = ri(GRID - 1), by = ri(GRID - 1);
    for (const [x, y] of [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]]) game.danger.delete(key(x, y));
  }
}

// ---------- flow ----------
function start() {
  game.player = { x: 2, y: 2, rx: 2, ry: 2 };
  game.wave = 0;
  game.alive = true;
  game.best = loadBest();
  nextWave();
  updateHud();
  hideOverlay();
}

function nextWave() {
  game.wave++;
  buildWave();
  game.phase = "warn";
  game.t = warnTime();
  updateHud();
}

function strike() {
  game.phase = "strike";
  game.t = 0.16;
  // resolve hit at the moment the strike lands
  if (game.danger.has(key(game.player.x, game.player.y))) die();
}

function die() {
  game.phase = "dead";
  game.alive = false;
  beep(110, 0.4, "sawtooth");
  const survived = game.wave - 1;
  const best = saveScore(survived);
  game.best = best;
  showOverlay(survived, best);
}

// ---------- update ----------
function update(dt) {
  // smooth the player toward its grid cell
  game.player.rx += (game.player.x - game.player.rx) * Math.min(1, dt * 18);
  game.player.ry += (game.player.y - game.player.ry) * Math.min(1, dt * 18);

  if (!game.alive) return;
  game.t -= dt;
  if (game.phase === "warn" && game.t <= 0) { strike(); beep(680, 0.05); }
  else if (game.phase === "strike" && game.t <= 0) { game.phase = "recover"; game.t = 0.22; }
  else if (game.phase === "recover" && game.t <= 0) { nextWave(); }
}

function move(dx, dy) {
  if (!game.alive) return;
  const nx = Math.max(0, Math.min(GRID - 1, game.player.x + dx));
  const ny = Math.max(0, Math.min(GRID - 1, game.player.y + dy));
  if (nx !== game.player.x || ny !== game.player.y) { game.player.x = nx; game.player.y = ny; beep(420, 0.02); }
}

// ---------- render ----------
function render() {
  const w = window.innerWidth, h = window.innerHeight;
  ctx.fillStyle = "#0a0712";
  ctx.fillRect(0, 0, w, h);

  // board cells
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const px = ox + x * cell, py = oy + y * cell;
      const checker = (x + y) % 2 === 0;
      ctx.fillStyle = checker ? "#181028" : "#140d22";
      ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
    }
  }

  // telegraph / strike on danger cells
  const warning = game.phase === "warn";
  const striking = game.phase === "strike";
  if (warning || striking) {
    const pulse = warning ? (0.35 + 0.35 * Math.sin(game.t * 18)) : 1;
    for (const c of game.danger) {
      const x = c % GRID, y = (c / GRID) | 0;
      const px = ox + x * cell, py = oy + y * cell;
      ctx.fillStyle = striking ? "rgba(255,70,90,0.92)" : `rgba(255,120,80,${pulse * 0.55})`;
      ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
    }
  }

  // player
  const px = ox + (game.player.rx + 0.5) * cell;
  const py = oy + (game.player.ry + 0.5) * cell;
  ctx.beginPath();
  ctx.arc(px, py, cell * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = game.alive ? "#5ad1ff" : "#6a6a7a";
  ctx.shadowColor = "#5ad1ff"; ctx.shadowBlur = game.alive ? 22 : 0;
  ctx.fill(); ctx.shadowBlur = 0;

  // board border
  ctx.strokeStyle = "rgba(140,120,220,.3)"; ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, dim, dim);
}

let last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - (last || t)) / 1000);
  last = t;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// ---------- audio ----------
let actx = null;
function beep(freq, dur = 0.05, type = "square") {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = 0.04;
    o.connect(g); g.connect(actx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.stop(actx.currentTime + dur);
  } catch (e) {}
}

// ---------- leaderboard ----------
function loadScores() { try { return JSON.parse(localStorage.getItem(SCORES_KEY)) || []; } catch { return []; } }
function loadBest() { const s = loadScores(); return s.length ? s[0] : 0; }
function saveScore(v) {
  const s = loadScores();
  s.push(v); s.sort((a, b) => b - a); s.length = Math.min(5, s.length);
  localStorage.setItem(SCORES_KEY, JSON.stringify(s));
  return s[0];
}

// ---------- HUD / overlay ----------
function updateHud() {
  document.getElementById("wave").textContent = Math.max(0, game.wave - (game.phase === "idle" ? 0 : 1));
  document.getElementById("best").textContent = loadBest();
}
function showOverlay(score, best) {
  const o = document.getElementById("overlay");
  document.getElementById("ovtitle").textContent = "Struck down";
  document.getElementById("ovscore").textContent = `You survived ${score} wave${score === 1 ? "" : "s"}.`;
  const list = loadScores().map((s, i) => `<li><span>${i + 1}</span> ${s}</li>`).join("");
  document.getElementById("board").innerHTML = `<h3>Best runs</h3><ol>${list}</ol>`;
  document.getElementById("startbtn").textContent = "Play again";
  o.classList.remove("hidden");
  updateHud();
}
function hideOverlay() { document.getElementById("overlay").classList.add("hidden"); }

// ---------- input ----------
const KEYMAP = {
  arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
};
window.addEventListener("keydown", (e) => {
  const m = KEYMAP[e.key.toLowerCase()];
  if (m) { e.preventDefault(); move(m[0], m[1]); }
});
let ts = null;
canvas.addEventListener("touchstart", (e) => { ts = e.touches[0]; }, { passive: true });
canvas.addEventListener("touchmove", (e) => {
  if (!ts) return;
  const t = e.touches[0], dx = t.clientX - ts.clientX, dy = t.clientY - ts.clientY;
  if (Math.abs(dx) + Math.abs(dy) < 26) return;
  if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy));
  ts = t; e.preventDefault();
}, { passive: false });
for (const b of document.querySelectorAll("[data-dir]")) {
  const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  b.addEventListener("click", () => move(...map[b.dataset.dir]));
}
document.getElementById("startbtn").addEventListener("click", start);

fit();
updateHud();
requestAnimationFrame(frame);

window.__knightmare = {
  game, start, move, update, nextWave, render, fit,
  forceStrike() { game.t = 0; update(0.001); },
  setPlayer(x, y) { game.player.x = x; game.player.y = y; game.player.rx = x; game.player.ry = y; },
  get danger() { return [...game.danger]; },
  GRID,
};
