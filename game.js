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

const CHARIZARD_DAMAGE = 20;
const ATTACK_RANGE = 120;
const ATTACK_COOLDOWN_MS = 400;
const RIVAL_DAMAGE = 10;
const CONTACT_COOLDOWN_MS = 800;
const HURT_MS = CHARIZARD.hurt.totalMs;

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
  attacking: false,
  attackElapsedMs: 0,
  attackCooldownMs: 0,
  hurt: false,
  hurtElapsedMs: 0,
};

const rival = {
  x: VIEW_W * 0.7,
  y: VIEW_H / 2,
  dir: 'left',
  hp: 100,
  maxHp: 100,
  alive: true,
  hurt: false,
  hurtElapsedMs: 0,
  contactCooldownMs: 0,
};

const RIVAL_TINT = 'rgba(80, 120, 235, 0.55)';
let rivalImg = null;
let attackImg = null;
let hurtImg = null;
let rivalHurtImg = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
    img.src = src;
  });
}

function makeTintedImage(img, color) {
  const off = document.createElement('canvas');
  off.width = img.width;
  off.height = img.height;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(img, 0, 0);
  octx.globalCompositeOperation = 'source-atop';
  octx.fillStyle = color;
  octx.fillRect(0, 0, off.width, off.height);
  return off;
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
  const anim = player.hurt ? 'hurt' : player.attacking ? 'attack' : player.moving ? 'walk' : 'idle';
  const elapsedMs = player.hurt ? player.hurtElapsedMs : player.attacking ? player.attackElapsedMs : player.elapsedMs;
  const frame = getFrame(anim, player.dir, frameIndexAt(anim, elapsedMs));
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

function drawRival() {
  const anim = rival.hurt ? 'hurt' : 'idle';
  const img = rival.hurt ? rivalHurtImg : rivalImg;
  const elapsedMs = rival.hurt ? rival.hurtElapsedMs : 0;
  const frame = getFrame(anim, rival.dir, frameIndexAt(anim, elapsedMs));
  const px = rival.x;
  const py = rival.y;
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

function drawHealthBar(x, y, hp, maxHp, label, align) {
  const w = 180;
  const h = 16;
  const ratio = Math.max(0, hp) / maxHp;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#333333';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ffc107' : '#f44336';
  ctx.fillRect(x, y, w * ratio, h);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${label} ${hp}/${maxHp}`, align === 'right' ? x + w : x, y - 6);
}

function applyDamage(target, amount) {
  target.hp = Math.max(0, target.hp - amount);
  if (target.hp === 0) {
    target.alive = false;
  }
  target.hurt = true;
  target.hurtElapsedMs = 0;
}

function attemptAttack() {
  if (!player.alive || player.attackCooldownMs > 0) return;

  player.attacking = true;
  player.attackElapsedMs = 0;
  player.attackCooldownMs = ATTACK_COOLDOWN_MS;

  if (rival.alive && Math.hypot(rival.x - player.x, rival.y - player.y) <= ATTACK_RANGE) {
    applyDamage(rival, CHARIZARD_DAMAGE);
  }
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

  if (player.attackCooldownMs > 0) {
    player.attackCooldownMs = Math.max(0, player.attackCooldownMs - dt * 1000);
  }
  if (player.attacking) {
    player.attackElapsedMs += dt * 1000;
    if (player.attackElapsedMs >= CHARIZARD.attack.totalMs) {
      player.attacking = false;
      player.attackElapsedMs = 0;
    }
  }

  for (const ent of [player, rival]) {
    if (ent.hurt) {
      ent.hurtElapsedMs += dt * 1000;
      if (ent.hurtElapsedMs >= HURT_MS) {
        ent.hurt = false;
        ent.hurtElapsedMs = 0;
      }
    }
  }

  if (rival.contactCooldownMs > 0) {
    rival.contactCooldownMs = Math.max(0, rival.contactCooldownMs - dt * 1000);
  }
  if (
    rival.alive &&
    player.alive &&
    rival.contactCooldownMs === 0 &&
    Math.hypot(rival.x - player.x, rival.y - player.y) <= ATTACK_RANGE
  ) {
    applyDamage(player, RIVAL_DAMAGE);
    rival.contactCooldownMs = CONTACT_COOLDOWN_MS;
  }

  const halfW = (CHARIZARD[player.moving ? 'walk' : 'idle'].frameWidth / 2) * SCALE;
  const footH = CHARIZARD[player.moving ? 'walk' : 'idle'].frameHeight * SCALE;
  player.x = Math.min(Math.max(player.x, halfW), VIEW_W - halfW);
  player.y = Math.min(Math.max(player.y, footH * 0.4), VIEW_H - 10);
}

function render(fondoImg, charizardImg) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground(fondoImg);
  drawPlayer(charizardImg);
  drawRival();
  drawHealthBar(20, 30, player.hp, player.maxHp, 'Charizard', 'left');
  drawHealthBar(VIEW_W - 200, 30, rival.hp, rival.maxHp, 'Rival', 'right');
}

async function main() {
  const [fondoImg, idleImg, walkImg, attackSrcImg, hurtSrcImg] = await Promise.all([
    loadImage(FONDO.src),
    loadImage(CHARIZARD.idle.src.anim),
    loadImage(CHARIZARD.walk.src.anim),
    loadImage(CHARIZARD.attack.src.anim),
    loadImage(CHARIZARD.hurt.src.anim),
  ]);

  rivalImg = makeTintedImage(idleImg, RIVAL_TINT);
  attackImg = attackSrcImg;
  hurtImg = hurtSrcImg;
  rivalHurtImg = makeTintedImage(hurtSrcImg, RIVAL_TINT);

  window.addEventListener('keydown', (e) => {
    const dir = DIR_KEYS[e.code];
    if (dir) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === 'KeyJ') {
      e.preventDefault();
      attemptAttack();
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
    const img = player.hurt ? hurtImg : player.attacking ? attackImg : player.moving ? walkImg : idleImg;
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
