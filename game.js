import {
  CHARIZARD,
  BACKGROUNDS,
  getFrame,
  frameIndexAt,
} from './spritesheet.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

const SCALE = 3;
const MOVE_SPEED = 240;

const FONDO = BACKGROUNDS.fondo1;

const DIR_KEYS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

const keys = new Set();

const player = {
  x: VIEW_W / 2,
  y: VIEW_H / 2,
  dir: 'down',
  moving: false,
  elapsedMs: 0,
  hp: 100,
  maxHp: 100,
  alive: true,
};

const rival = {
  x: VIEW_W * 0.7,
  y: VIEW_H / 2,
  dir: 'left',
  hp: 100,
  maxHp: 100,
  alive: true,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
    img.src = src;
  });
}

function directionFromVector(dx, dy) {
  if (dx > 0 && dy > 0) return 'downRight';
  if (dx < 0 && dy > 0) return 'downLeft';
  if (dx > 0 && dy < 0) return 'upRight';
  if (dx < 0 && dy < 0) return 'upLeft';
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';
  return player.dir;
}

function drawBackground(img) {
  const scale = Math.max(VIEW_W / img.width, VIEW_H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h);
}

function drawPlayer(img) {
  const anim = player.moving ? 'walk' : 'idle';
  const frame = getFrame(anim, player.dir, frameIndexAt(anim, player.elapsedMs));
  const px = player.x;
  const py = player.y;
  ctx.drawImage(
    img,
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    px - frame.shadow.x * SCALE,
    py - frame.shadow.y * SCALE,
    frame.sw * SCALE,
    frame.sh * SCALE,
  );
}

function update(dt) {
  let dx = 0;
  let dy = 0;
  for (const code of keys) {
    const dir = DIR_KEYS[code];
    if (dir === 'up') dy -= 1;
    else if (dir === 'down') dy += 1;
    else if (dir === 'left') dx -= 1;
    else if (dir === 'right') dx += 1;
  }

  const moving = dx !== 0 || dy !== 0;
  if (moving) {
    player.dir = directionFromVector(dx, dy);
    const len = Math.hypot(dx, dy);
    player.x += (dx / len) * MOVE_SPEED * dt;
    player.y += (dy / len) * MOVE_SPEED * dt;
  }

  if (moving !== player.moving) {
    player.moving = moving;
    player.elapsedMs = 0;
  }
  player.elapsedMs += dt * 1000;

  const halfW = (CHARIZARD[player.moving ? 'walk' : 'idle'].frameWidth / 2) * SCALE;
  const footH = CHARIZARD[player.moving ? 'walk' : 'idle'].frameHeight * SCALE;
  player.x = Math.min(Math.max(player.x, halfW), VIEW_W - halfW);
  player.y = Math.min(Math.max(player.y, footH * 0.4), VIEW_H - 10);
}

function render(fondoImg, charizardImg) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground(fondoImg);
  drawPlayer(charizardImg);
}

async function main() {
  const [fondoImg, idleImg, walkImg] = await Promise.all([
    loadImage(FONDO.src),
    loadImage(CHARIZARD.idle.src.anim),
    loadImage(CHARIZARD.walk.src.anim),
  ]);

  window.addEventListener('keydown', (e) => {
    const dir = DIR_KEYS[e.code];
    if (dir) {
      e.preventDefault();
      keys.add(e.code);
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  window.addEventListener('blur', () => keys.clear());

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    const img = player.moving ? walkImg : idleImg;
    render(fondoImg, img);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main().catch((err) => {
  console.error(err);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ff5555';
  ctx.font = '20px monospace';
  ctx.fillText('Error al cargar el juego. Revisa la consola.', 24, 40);
});
