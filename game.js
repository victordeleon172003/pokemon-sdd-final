import {
  CHARIZARD,
  BACKGROUNDS,
  getFrame,
  frameIndexAt,
} from './spritesheet.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const menuEl = document.getElementById('attack-menu');
const menuListEl = document.getElementById('attack-menu-list');

const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

const SCALE = 3;
const MOVE_SPEED = 240;

const PROJECTILE_SPEED = 700;
const PROJECTILE_HIT_RADIUS = 40;
const PROJECTILE_TARGET_OFFSET =
  (CHARIZARD.idle.frames.down[0].shadow.y - CHARIZARD.idle.frames.down[0].center.y) * SCALE;

const DIR_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  upRight: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  upLeft: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  downRight: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  downLeft: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
};

const projectiles = [];

const ATTACK_RANGE = 120;
const RIVAL_DAMAGE = 10;
const CONTACT_COOLDOWN_MS = 800;
const HURT_MS = CHARIZARD.hurt.totalMs;

const FONDO = BACKGROUNDS.fondo1;

const MOVES = [
  { id: 'golpe', nombre: 'Golpe', anim: 'attack', tipo: 'melee', dano: 20, rango: 120, pp: 25, maxPp: 25, cooldownMs: 400 },
  { id: 'lanzallamas', nombre: 'Lanzallamas', anim: 'shoot', tipo: 'proyectil', dano: 40, rango: 400, pp: 10, maxPp: 10, cooldownMs: 700 },
  { id: 'garra', nombre: 'Garra Dragón', anim: 'swing', tipo: 'melee', dano: 30, rango: 120, pp: 15, maxPp: 15, cooldownMs: 600 },
  { id: 'giro', nombre: 'Giro Fuego', anim: 'rotate', tipo: 'melee', dano: 35, rango: 150, pp: 10, maxPp: 10, cooldownMs: 800 },
];

const GOLPE = MOVES.find((m) => m.id === 'golpe');

const menu = { open: false, selection: 0 };
let menuItems = [];

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
  activeMove: null,
  attackCooldowns: { golpe: 0, lanzallamas: 0, garra: 0, giro: 0 },
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
let moveImages = {};
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
  const anim = player.hurt ? 'hurt' : player.attacking ? player.activeMove.anim : player.moving ? 'walk' : 'idle';
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

function useMove(move) {
  if (!player.alive) return;
  if (move.pp <= 0) return;
  if (player.attackCooldowns[move.id] > 0) return;

  player.attacking = true;
  player.attackElapsedMs = 0;
  player.activeMove = move;
  player.attackCooldowns[move.id] = move.cooldownMs;
  move.pp -= 1;

  if (move.tipo === 'melee') {
    if (rival.alive && Math.hypot(rival.x - player.x, rival.y - player.y) <= move.rango) {
      applyDamage(rival, move.dano);
    }
  } else if (move.tipo === 'proyectil') {
    spawnProjectile(move);
  }
}

function spawnProjectile(move) {
  const vec = DIR_VECTORS[player.dir] || DIR_VECTORS.down;
  const frame = getFrame('shoot', player.dir, 0);
  const originX = player.x - frame.shadow.x * SCALE + frame.head.x * SCALE;
  const originY = player.y - frame.shadow.y * SCALE + frame.head.y * SCALE;
  projectiles.push({
    x: originX,
    y: originY,
    dir: player.dir,
    vx: vec.x,
    vy: vec.y,
    remaining: move.rango,
    damage: move.dano,
    age: 0,
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const travel = Math.min(PROJECTILE_SPEED * dt, p.remaining);
    p.x += p.vx * travel;
    p.y += p.vy * travel;
    p.remaining -= travel;
    p.age += dt * 1000;

    const targetY = rival.y - PROJECTILE_TARGET_OFFSET;
    const hit =
      rival.alive &&
      Math.hypot(rival.x - p.x, targetY - p.y) <= PROJECTILE_HIT_RADIUS;
    if (hit) {
      applyDamage(rival, p.damage);
    }
    if (hit || p.remaining <= 0) {
      projectiles.splice(i, 1);
    }
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    const flicker = Math.sin(p.age * 0.03) * 3;
    const radius = 18 + flicker;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    grad.addColorStop(0, 'rgba(255, 255, 200, 0.95)');
    grad.addColorStop(0.4, 'rgba(255, 180, 40, 0.9)');
    grad.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function buildMenu() {
  menuListEl.innerHTML = '';
  menuItems = MOVES.map((move) => {
    const item = document.createElement('li');
    item.className = 'attack-menu__item';
    const name = document.createElement('span');
    name.textContent = move.nombre;
    const pp = document.createElement('span');
    pp.className = 'attack-menu__pp';
    item.append(name, pp);
    menuListEl.append(item);
    return { el: item, ppEl: pp, move };
  });
}

function renderMenu() {
  menuItems.forEach((item, index) => {
    item.el.classList.toggle('is-selected', index === menu.selection);
    item.el.classList.toggle('is-disabled', item.move.pp <= 0);
    item.ppEl.textContent = `PP ${item.move.pp}/${item.move.maxPp}`;
  });
}

function openMenu() {
  if (menu.open) return;
  if (!player.alive) return;
  menu.open = true;
  menu.selection = 0;
  keys.clear();
  renderMenu();
  menuEl.classList.remove('hidden');
}

function closeMenu() {
  menu.open = false;
  menuEl.classList.add('hidden');
}

function toggleMenu() {
  if (menu.open) {
    closeMenu();
  } else {
    openMenu();
  }
}

function moveSelection(delta) {
  const count = MOVES.length;
  menu.selection = (menu.selection + delta + count) % count;
  renderMenu();
}

function executeSelected() {
  const move = MOVES[menu.selection];
  if (move.pp <= 0) return;
  if (player.attackCooldowns[move.id] > 0) return;
  useMove(move);
  closeMenu();
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

  const moving = player.alive && (dx !== 0 || dy !== 0);
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

  for (const id in player.attackCooldowns) {
    if (player.attackCooldowns[id] > 0) {
      player.attackCooldowns[id] = Math.max(0, player.attackCooldowns[id] - dt * 1000);
    }
  }
  if (player.attacking) {
    player.attackElapsedMs += dt * 1000;
    if (player.attackElapsedMs >= CHARIZARD[player.activeMove.anim].totalMs) {
      player.attacking = false;
      player.attackElapsedMs = 0;
      player.activeMove = null;
    }
  }

  updateProjectiles(dt);

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

function drawDefeatMessages() {
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';

  if (!rival.alive) {
    ctx.fillStyle = '#ffd54f';
    ctx.strokeText('¡Rival derrotado!', VIEW_W / 2, VIEW_H / 2 - 24);
    ctx.fillText('¡Rival derrotado!', VIEW_W / 2, VIEW_H / 2 - 24);
  }
  if (!player.alive) {
    ctx.fillStyle = '#ff5555';
    ctx.strokeText('¡Has sido derrotado!', VIEW_W / 2, VIEW_H / 2 + 24);
    ctx.fillText('¡Has sido derrotado!', VIEW_W / 2, VIEW_H / 2 + 24);
  }
}

function render(fondoImg, charizardImg) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground(fondoImg);
  drawPlayer(charizardImg);
  drawRival();
  drawProjectiles();
  drawHealthBar(20, 30, player.hp, player.maxHp, 'Charizard', 'left');
  drawHealthBar(VIEW_W - 200, 30, rival.hp, rival.maxHp, 'Rival', 'right');
  drawDefeatMessages();
}

async function main() {
  const [fondoImg, idleImg, walkImg, attackImg, shootImg, swingImg, rotateImg, hurtSrcImg] = await Promise.all([
    loadImage(FONDO.src),
    loadImage(CHARIZARD.idle.src.anim),
    loadImage(CHARIZARD.walk.src.anim),
    loadImage(CHARIZARD.attack.src.anim),
    loadImage(CHARIZARD.shoot.src.anim),
    loadImage(CHARIZARD.swing.src.anim),
    loadImage(CHARIZARD.rotate.src.anim),
    loadImage(CHARIZARD.hurt.src.anim),
  ]);

  rivalImg = makeTintedImage(idleImg, RIVAL_TINT);
  moveImages = { attack: attackImg, shoot: shootImg, swing: swingImg, rotate: rotateImg };
  hurtImg = hurtSrcImg;
  rivalHurtImg = makeTintedImage(hurtSrcImg, RIVAL_TINT);

  buildMenu();

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') {
      e.preventDefault();
      toggleMenu();
      return;
    }
    if (menu.open) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.code === 'Enter') {
        e.preventDefault();
        executeSelected();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        closeMenu();
      }
      return;
    }
    const dir = DIR_KEYS[e.code];
    if (dir) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === 'KeyJ') {
      e.preventDefault();
      useMove(GOLPE);
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
    if (!menu.open) {
      update(dt);
    }
    const img = player.hurt ? hurtImg : player.attacking ? moveImages[player.activeMove.anim] : player.moving ? walkImg : idleImg;
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
