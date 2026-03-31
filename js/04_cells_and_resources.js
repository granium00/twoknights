// ────────────────────────────────────────
//   ОТМЕЧАЕМ ВАЖНЫЕ КЛЕТКИ
// ────────────────────────────────────────
const nodeMap = {};
const nodeByPos = {};
const castleOwnersByKey = {};
const castleStatsByKey = {};
const CASTLE_LEVELS = {
  1: {armor: 75, health: 50},
  2: {armor: 150, health: 75},
  3: {armor: 250, health: 100}
};
const CASTLE_FEATURES = {
  wall: {cost: 300, armor: 50, label: "Стена"},
  lumber: {cost: 50, income: 3, label: "Лесопилка"},
  mine: {cost: 200, income: 10, label: "Шахта"},
  clay: {cost: 400, income: 15, label: "Глиняный карьер"}
};

function ensureCastleStats(key) {
  if (!castleStatsByKey[key]) {
    castleStatsByKey[key] = {
      level: 1,
      wall: false,
      lumber: false,
      mine: false,
      clay: false,
      storageArmy: 0,
      armorCurrent: null,
      healthCurrent: null
    };
  }
  const stats = castleStatsByKey[key];
  const prevArmorMax = stats.armor || 0;
  const prevHealthMax = stats.health || 0;
  stats.level = Math.max(1, Math.min(3, stats.level));
  const levelInfo = CASTLE_LEVELS[stats.level] || CASTLE_LEVELS[1];
  const wallBonus = stats.wall ? CASTLE_FEATURES.wall.armor : 0;
  stats.armor = levelInfo.armor + wallBonus;
  if (stats.armorCurrent === null || typeof stats.armorCurrent !== "number") {
    stats.armorCurrent = stats.armor;
  } else {
    if (stats.armor > prevArmorMax) {
      stats.armorCurrent += (stats.armor - prevArmorMax);
    }
    if (stats.armorCurrent > stats.armor) {
      stats.armorCurrent = stats.armor;
    }
  }
  stats.health = levelInfo.health;
  if (stats.healthCurrent === null || typeof stats.healthCurrent !== "number") {
    stats.healthCurrent = stats.health;
  } else {
    if (stats.health > prevHealthMax) {
      stats.healthCurrent += (stats.health - prevHealthMax);
    }
    if (stats.healthCurrent > stats.health) {
      stats.healthCurrent = stats.health;
    }
  }
  stats.income =
    (stats.lumber ? CASTLE_FEATURES.lumber.income : 0) +
    (stats.mine ? CASTLE_FEATURES.mine.income : 0) +
    (stats.clay ? CASTLE_FEATURES.clay.income : 0);
  return stats;
}

function updateCastleBadge(key) {
  const cell = grid[key];
  if (!cell) return;
  const stats = ensureCastleStats(key);
  let badge = cell.querySelector(".castle-level");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "castle-level";
    cell.appendChild(badge);
  }
  badge.textContent = `Ур. ${stats.level}`;
  let wallBadge = cell.querySelector(".castle-wall");
  if (stats.wall) {
    if (!wallBadge) {
      wallBadge = document.createElement("div");
      wallBadge.className = "castle-wall";
      wallBadge.textContent = "СТЕНА";
      cell.appendChild(wallBadge);
    }
    wallBadge.style.display = "block";
  } else if (wallBadge) {
    wallBadge.style.display = "none";
  }
}
function setCellIcon(cell, iconName, altText) {
  if (!cell || !iconName) return;
  let icon = cell.querySelector("img.icon");
  if (!icon) {
    icon = document.createElement("img");
    icon.className = "icon";
    cell.appendChild(icon);
  }
  cell.classList.add("has-icon");
  icon.src = `assets/icons/${iconName}`;
  icon.alt = altText || "";
  return icon;
}

function clearCellIcon(cell) {
  if (!cell) return;
  const icon = cell.querySelector("img.icon");
  if (icon) icon.remove();
  cell.classList.remove("has-icon");
}

const ICONS_BY_ID = {
  2: { file: "barracks.png", alt: "КАЗ" },
  6: { file: "hire.png", alt: "НАЕМ" },
  9: { file: "shop.png", alt: "ЛАВ" },
  10: { file: "dragon.png", alt: "Дракон" },
  11: { file: "castle_11.png", alt: "Замок" },
  15: { file: "king.png", alt: "КОР" },
  17: { file: "castle_17.png", alt: "Замок" },
  19: { file: "workshop.png", alt: "МАС" },
  20: { file: "guard.png", alt: "СТ" }
};
importantNodes.forEach(node => {
  const key = `${node.x},${node.y}`;
  const cell = grid[key];
    if (cell) {
      cell.classList.add("important", node.type);
      cell.classList.remove("inactive");
      cell.textContent = node.label || node.id;
    const entry = {id: node.id, x: node.x, y: node.y, elem: cell, type: node.type};
    nodeMap[node.id] = entry;
    nodeByPos[key] = entry;
    if (node.type === "castle") {
      castleOwnersByKey[key] = undefined;
      ensureCastleStats(key);
      updateCastleBadge(key);
    }
    if (node.id === 2) cell.classList.add("barracks-node");
    if (node.id === 9) cell.classList.add("shop-node");
    if (node.id === 19) cell.classList.add("workshop-node");
    const iconDef = ICONS_BY_ID[node.id];
    if (iconDef) {
      cell.textContent = "";
      if (node.type === "dragon") {
        cell.classList.add("dragon-2x2");
        cell.style.width = `calc(var(--cell-size) * 2)`;
        cell.style.height = `calc(var(--cell-size) * 2)`;
        cell.style.zIndex = "5";
      }
      if (node.type === "castle") {
        cell.classList.add("castle-2x2");
        cell.style.width = `calc(var(--cell-size) * 2)`;
        cell.style.height = `calc(var(--cell-size) * 2)`;
        cell.style.zIndex = "5";
      }
      setCellIcon(cell, iconDef.file, iconDef.alt);
      if (node.type === "castle") {
        updateCastleBadge(key);
      }
    }
  }
});

const RESOURCE_INTERVAL = 6;
const RESOURCE_LIFETIME_TURNS = 6;
const resourceTypes = [
  {key: "gold", label: "З", min: 200, max: 400},
  {key: "army", label: "В", min: 5, max: 8},
  {key: "resources", label: "Р", min: 20, max: 30}
];
const RESOURCE_ICONS = {
  gold: { file: "gold.png", alt: "Золото" },
  army: { file: "army.png", alt: "Войска" },
  resources: { file: "resources.png", alt: "Ресурсы" }
};
const resourceByPos = {};
const specialByPos = {};
const SPAWN_BLOCKED_COORDINATES = [
  { x: 20, yStart: 23, yEnd: 25 },
  { x: 21, yStart: 21, yEnd: 25 },
  { x: 22, yStart: 20, yEnd: 25 },
  { x: 23, yStart: 19, yEnd: 25 },
  { x: 24, yStart: 18, yEnd: 25 },
  { x: 25, yStart: 18, yEnd: 25 },
  { x: 26, yStart: 17, yEnd: 25 },
  { x: 27, yStart: 17, yEnd: 25 },
  { x: 28, yStart: 16, yEnd: 25 },
  { x: 29, yStart: 16, yEnd: 25 },
  { x: 30, yStart: 16, yEnd: 25 }
];
const spawnBlockedKeys = new Set();
SPAWN_BLOCKED_COORDINATES.forEach(range => {
  const x = range.x - 1;
  for (let y = range.yStart; y <= range.yEnd; y++) {
    spawnBlockedKeys.add(`${x},${y - 1}`);
  }
});
function isSpawnBlocked(x, y) {
  return spawnBlockedKeys.has(`${x},${y}`);
}
let turnsUntilResources = RESOURCE_INTERVAL;
let toastTimer = null;
const TREASURE_INTERVAL = 20;
const TREASURE_DURATION = 2;
let turnsUntilTreasure = TREASURE_INTERVAL;
let treasure = null;
let treasureTurnsRemaining = 0;
const FLOWER_SPAWN_MIN_TURN = 1;
const FLOWER_SPAWN_MAX_TURN = 150;
const FLOWER_SPAWN_COUNT = 5;
const FLOWER_DURATION = 4;
const FLOWER_ICON = { file: "mystic_flower.png", alt: "Таинственный цветок" };
const flowerSpawnTurns = [];
let flowerSpawnIndex = 0;
let flowerArtifact = null;
let flowerTurnsRemaining = 0;
const CLOVER_SPAWN_MIN = 15;
const CLOVER_SPAWN_MAX = 30;
const CLOVER_DURATION = 5;
let nextCloverSpawnTurn = null;
let cloverArtifact = null;
let cloverTurnsRemaining = 0;
const STONE_FIRST_MIN_TURN = 15;
const STONE_FIRST_MAX_TURN = 25;
const STONE_COOLDOWN_MIN = 12;
const STONE_COOLDOWN_MAX = 20;
const STONE_DURATION = 8;
let nextStoneSpawnTurn = null;
const stoneByPos = {};
const RAINBOW_SPAWN_MIN_TURN = 20;
const RAINBOW_SPAWN_MAX_TURN = 200;
const RAINBOW_SPAWN_COUNT = 5;
const RAINBOW_DURATION = 6;
const rainbowSpawnTurns = [];
let rainbowSpawnIndex = 0;
const rainbowByPos = {};
const MASTER_CELL = { x: 15, y: 1, key: "15,1" };
const MASTER_SPAWN_INTERVAL = 20;
const MASTER_DURATION = 6;
let masterNextSpawnTurn = 20;
let masterTurnsRemaining = 0;
let masterActive = false;
const PORTAL_FIRST_MIN_TURN = 15;
const PORTAL_FIRST_MAX_TURN = 20;
const PORTAL_LIFETIME_MIN = 15;
const PORTAL_LIFETIME_MAX = 20;
const PORTAL_RESPAWN_MIN = 15;
const PORTAL_RESPAWN_MAX = 20;
const portalState = {
  active: false,
  keys: [],
  turnsRemaining: 0,
  nextSpawnTurn: null
};
function randomIntRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function initFlowerSpawns() {
  const picked = new Set();
  while (picked.size < FLOWER_SPAWN_COUNT) {
    picked.add(randomIntRange(FLOWER_SPAWN_MIN_TURN, FLOWER_SPAWN_MAX_TURN));
  }
  flowerSpawnTurns.length = 0;
  flowerSpawnTurns.push(...Array.from(picked).sort((a, b) => a - b));
}
initFlowerSpawns();
function initStoneSpawns() {
  nextStoneSpawnTurn = randomIntRange(STONE_FIRST_MIN_TURN, STONE_FIRST_MAX_TURN);
}
initStoneSpawns();
function initCloverSpawns() {
  nextCloverSpawnTurn = randomIntRange(CLOVER_SPAWN_MIN, CLOVER_SPAWN_MAX);
}
initCloverSpawns();
function initRainbowSpawns() {
  const picked = new Set();
  while (picked.size < RAINBOW_SPAWN_COUNT) {
    picked.add(randomIntRange(RAINBOW_SPAWN_MIN_TURN, RAINBOW_SPAWN_MAX_TURN));
  }
  rainbowSpawnTurns.length = 0;
  rainbowSpawnTurns.push(...Array.from(picked).sort((a, b) => a - b));
}
initRainbowSpawns();
function initPortalState() {
  portalState.active = false;
  portalState.keys = [];
  portalState.turnsRemaining = 0;
  portalState.nextSpawnTurn = randomIntRange(PORTAL_FIRST_MIN_TURN, PORTAL_FIRST_MAX_TURN);
}
initPortalState();
const MAGE_POSITIONS = [
  { x: 8, y: 5 },  // 09:06
  { x: 28, y: 17 } // 29:18
];
const MAGE_MIN_DURATION = 7;
const MAGE_MAX_DURATION = 9;
const MAGE_MIN_COOLDOWN = 15;
const MAGE_MAX_COOLDOWN = 20;
const mageSlot = {
  id: "mage",
  label: "МАГ",
  active: false,
  turnsRemaining: 0,
  cell: null,
  key: null,
  x: null,
  y: null,
  timerElem: null,
  nextSpawnTurn: 20,
  nextSpawnIndex: null
};
const TROLL_CAVES = [
  { x: 0, y: 11, key: "0,11", looted: false }, // 01:12
  { x: 13, y: 0, key: "13,0", looted: false } // 14:01
];
function getTrollCaveIndexByKey(key) {
  return TROLL_CAVES.findIndex(cave => cave.key === key);
}

function markTrollCaveLooted(index, value) {
  if (index < 0 || index >= TROLL_CAVES.length) return;
  TROLL_CAVES[index].looted = value;
}

const TROLL_STAY_MIN = 5;
const TROLL_STAY_MAX = 10;
const TROLL_RESPAWN_MIN = 5;
const TROLL_RESPAWN_MAX = 10;
const TROLL_SPEED = 4;
const TROLL_EXTRA_STEPS = 0;
let trollState = {
  x: null,
  y: null,
  key: null,
  currentCaveIndex: null,
  targetCaveIndex: null,
  turnsRemaining: 0,
  moving: false,
  path: [],
  pathIndex: 0,
  prevKey: null,
  stunUsed: false,
  active: true,
  respawnTurns: 0
};

function initTrollCaves() {
  TROLL_CAVES.forEach((cave, index) => {
    const placed = setSpecialCell(
      cave.x,
      cave.y,
      "",
      "troll-cave",
      null,
      null,
      null,
      { type: "troll-cave", caveIndex: index }
    );
    if (!placed) return;
    const cell = grid[cave.key];
    if (cell) {
      cell.textContent = "";
      setCellIcon(cell, "troll_cave.png", "Пещера троллей");
    }
  });
}

function initTrollState() {
  initTrollCaves();
  const startIndex = Math.floor(Math.random() * TROLL_CAVES.length);
  const cave = TROLL_CAVES[startIndex];
  trollState.currentCaveIndex = startIndex;
  trollState.targetCaveIndex = null;
  trollState.moving = false;
  trollState.path = [];
  trollState.pathIndex = 0;
  trollState.x = cave.x;
  trollState.y = cave.y;
  trollState.key = cave.key;
  trollState.turnsRemaining = randomIntRange(TROLL_STAY_MIN, TROLL_STAY_MAX);
  trollState.prevKey = null;
  trollState.stunUsed = false;
  trollState.active = true;
  trollState.respawnTurns = 0;
  updateTrollVisual();
}

function isTrollInCave() {
  if (trollState.currentCaveIndex === null) return false;
  const cave = TROLL_CAVES[trollState.currentCaveIndex];
  return !trollState.moving && trollState.key === cave.key;
}

function clearTrollTokenAt(key) {
  const cell = grid[key];
  if (!cell) return;
  const token = cell.querySelector(".troll-token");
  if (token) token.remove();
  cell.classList.remove("troll");
}

function ensureTrollTokenAt(x, y) {
  const key = `${x},${y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.add("troll");
  let token = cell.querySelector(".troll-token");
  if (!token) {
    token = document.createElement("img");
    token.className = "troll-token";
    token.src = "assets/icons/troll.png";
    token.alt = "Тролли";
    cell.appendChild(token);
  }
}

function updateTrollVisual() {
  if (trollState.prevKey) {
    clearTrollTokenAt(trollState.prevKey);
  }
  if (!trollState.active || !trollState.key) return;
  if (!isTrollInCave()) {
    ensureTrollTokenAt(trollState.x, trollState.y);
  }
  trollState.prevKey = trollState.key;
}

function spawnTrollAtRandomCave() {
  const index = Math.floor(Math.random() * TROLL_CAVES.length);
  const cave = TROLL_CAVES[index];
  trollState.currentCaveIndex = index;
  trollState.targetCaveIndex = null;
  trollState.moving = false;
  trollState.path = [];
  trollState.pathIndex = 0;
  trollState.x = cave.x;
  trollState.y = cave.y;
  trollState.key = cave.key;
  trollState.turnsRemaining = randomIntRange(TROLL_STAY_MIN, TROLL_STAY_MAX);
  trollState.prevKey = null;
  trollState.stunUsed = false;
  trollState.active = true;
  trollState.respawnTurns = 0;
  updateTrollVisual();
}

function handleTrollDefeat() {
  if (!trollState.active) return;
  if (trollState.key) {
    clearTrollTokenAt(trollState.key);
  }
  trollState.active = false;
  trollState.respawnTurns = randomIntRange(TROLL_RESPAWN_MIN, TROLL_RESPAWN_MAX);
  trollState.currentCaveIndex = null;
  trollState.targetCaveIndex = null;
  trollState.moving = false;
  trollState.path = [];
  trollState.pathIndex = 0;
  trollState.x = null;
  trollState.y = null;
  trollState.key = null;
  trollState.prevKey = null;
}

function buildTrollPath(start, end) {
  const path = [];
  let cx = start.x;
  let cy = start.y;
  let remainingX = end.x - start.x;
  let remainingY = end.y - start.y;
  let extra = Math.max(0, TROLL_EXTRA_STEPS);

  while (remainingX !== 0 || remainingY !== 0) {
    const moveX = remainingX !== 0 && (remainingY === 0 || Math.random() < 0.5);
    if (moveX) {
      const stepX = remainingX > 0 ? 1 : -1;
      const nx = cx + stepX;
      const ny = cy;
      const key = `${nx},${ny}`;
      if (!nodeByPos[key] && !resourceByPos[key] && !specialByPos[key] &&
          !barbarianCells.some(cell => cell.key === key) &&
          !(treasure && treasure.key === key) &&
          !(flowerArtifact && flowerArtifact.key === key) &&
          !stoneByPos[key] && !rainbowByPos[key]) {
        cx = nx;
        remainingX -= stepX;
        path.push({ x: cx, y: cy, key: `${cx},${cy}` });
      } else {
        remainingX -= stepX;
      }
    } else {
      const stepY = remainingY > 0 ? 1 : -1;
      const nx = cx;
      const ny = cy + stepY;
      const key = `${nx},${ny}`;
      if (!nodeByPos[key] && !resourceByPos[key] && !specialByPos[key] &&
          !barbarianCells.some(cell => cell.key === key) &&
          !(treasure && treasure.key === key) &&
          !(flowerArtifact && flowerArtifact.key === key) &&
          !stoneByPos[key] && !rainbowByPos[key]) {
        cy = ny;
        remainingY -= stepY;
        path.push({ x: cx, y: cy, key: `${cx},${cy}` });
      } else {
        remainingY -= stepY;
      }
    }

    while (extra >= 2 && Math.random() < 0.4) {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const valid = dirs.filter(([dx, dy]) => {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
        if (nodeByPos[key]) return false;
        if (resourceByPos[key]) return false;
        if (specialByPos[key]) return false;
        if (barbarianCells.some(cell => cell.key === key)) return false;
        if (treasure && treasure.key === key) return false;
        if (flowerArtifact && flowerArtifact.key === key) return false;
        if (stoneByPos[key]) return false;
        if (rainbowByPos[key]) return false;
        return true;
      });
      if (!valid.length) break;
      const [dx, dy] = valid[Math.floor(Math.random() * valid.length)];
      cx += dx;
      cy += dy;
      path.push({ x: cx, y: cy, key: `${cx},${cy}` });
      cx -= dx;
      cy -= dy;
      path.push({ x: cx, y: cy, key: `${cx},${cy}` });
      extra -= 2;
    }
  }
  while (extra >= 2) {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const valid = dirs.filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
      if (nodeByPos[key]) return false;
      if (resourceByPos[key]) return false;
      if (specialByPos[key]) return false;
      if (barbarianCells.some(cell => cell.key === key)) return false;
      if (treasure && treasure.key === key) return false;
      if (flowerArtifact && flowerArtifact.key === key) return false;
      if (stoneByPos[key]) return false;
      if (rainbowByPos[key]) return false;
      return true;
    });
    if (!valid.length) break;
    const [dx, dy] = valid[Math.floor(Math.random() * valid.length)];
    cx += dx;
    cy += dy;
    path.push({ x: cx, y: cy, key: `${cx},${cy}` });
    cx -= dx;
    cy -= dy;
    path.push({ x: cx, y: cy, key: `${cx},${cy}` });
    extra -= 2;
  }

  return path;
}

function startTrollMove() {
  if (trollState.currentCaveIndex === null) return;
  const targetIndex = trollState.currentCaveIndex === 0 ? 1 : 0;
  const start = { x: trollState.x, y: trollState.y };
  const end = { x: TROLL_CAVES[targetIndex].x, y: TROLL_CAVES[targetIndex].y };
  trollState.targetCaveIndex = targetIndex;
  trollState.path = buildTrollPath(start, end);
  trollState.pathIndex = 0;
  trollState.moving = true;
  trollState.stunUsed = false;
}

function handleTrollsTurn() {
  if (!trollState.active) {
    if (trollState.respawnTurns > 0) {
      trollState.respawnTurns -= 1;
      if (trollState.respawnTurns <= 0) {
        spawnTrollAtRandomCave();
      }
    }
    return;
  }
  if (trollState.currentCaveIndex === null) return;
  if (!trollState.moving) {
    trollState.turnsRemaining -= 1;
    if (trollState.turnsRemaining <= 0) {
      startTrollMove();
    }
  }
  if (trollState.moving && trollState.pathIndex < trollState.path.length && Array.isArray(players)) {
    const nearby = players
      .map(p => ({
        player: p,
        dist: Math.abs(p.x - trollState.x) + Math.abs(p.y - trollState.y)
      }))
      .filter(entry => entry.dist <= 5)
      .filter(entry => (entry.player.invisTurnsRemaining || 0) <= 0)
      .sort((a, b) => a.dist - b.dist);
    if (!trollState.stunUsed && nearby.length && Math.random() < 0.5) {
      const target = nearby[0].player;
      let stepsToMove = 1;
      let tx = trollState.x;
      let ty = trollState.y;
      while (stepsToMove > 0) {
        const dist = Math.abs(target.x - tx) + Math.abs(target.y - ty);
        if (dist <= 1) break;
        const dx2 = target.x - tx;
        const dy2 = target.y - ty;
        if (Math.abs(dx2) >= Math.abs(dy2)) {
          tx += dx2 > 0 ? 1 : -1;
        } else {
          ty += dy2 > 0 ? 1 : -1;
        }
        stepsToMove -= 1;
      }
      trollState.x = tx;
      trollState.y = ty;
      trollState.key = `${tx},${ty}`;
      if (typeof target.stunnedTurnsRemaining === "number") {
        target.stunnedTurnsRemaining = Math.max(target.stunnedTurnsRemaining, 3);
      } else {
        target.stunnedTurnsRemaining = 3;
      }
      trollState.stunUsed = true;
      const targetCave = TROLL_CAVES[trollState.targetCaveIndex];
      if (targetCave) {
        trollState.path = buildTrollPath({ x: trollState.x, y: trollState.y }, { x: targetCave.x, y: targetCave.y });
        trollState.pathIndex = 0;
      }
      updateTrollVisual();
      return;
    }
  }
  if (trollState.moving) {
    let steps = TROLL_SPEED;
    while (steps > 0 && trollState.pathIndex < trollState.path.length) {
      const next = trollState.path[trollState.pathIndex];
      trollState.pathIndex += 1;
      trollState.x = next.x;
      trollState.y = next.y;
      trollState.key = next.key;
      steps -= 1;
    }
    if (trollState.pathIndex >= trollState.path.length) {
      const cave = TROLL_CAVES[trollState.targetCaveIndex];
      trollState.currentCaveIndex = trollState.targetCaveIndex;
      trollState.targetCaveIndex = null;
      trollState.moving = false;
      trollState.path = [];
      trollState.pathIndex = 0;
      trollState.x = cave.x;
      trollState.y = cave.y;
      trollState.key = cave.key;
      cave.looted = false;
      trollState.turnsRemaining = randomIntRange(TROLL_STAY_MIN, TROLL_STAY_MAX);
      trollState.stunUsed = false;
    }
  }
  updateTrollVisual();
}

function isTrollAtKey(key) {
  return trollState.active && trollState.key === key;
}

function isTrollInCaveAtKey(key) {
  return isTrollAtKey(key) && isTrollInCave();
}

initTrollState();

const BARBARIAN_START_TURN = 10;
const BARBARIAN_RESPAWN_MIN = 10;
const BARBARIAN_RESPAWN_MAX = 15;
const MAX_BARBARIAN_CELLS = 3;
function getMaxBarbarianCells() {
  return turnCounter >= 200 ? 4 : MAX_BARBARIAN_CELLS;
}
let turnCounter = 0;
let barbarianPhaseStarted = false;
let barbarianCells = [];
let barbarianRespawnTimers = [];
const ROBBER_CHANCE = 0.05;
const ROBBER_GOLD_REWARD_MIN = 200;
const ROBBER_GOLD_REWARD_MAX = 350;
const ROBBER_RESOURCE_REWARD_MIN = 15;
const ROBBER_RESOURCE_REWARD_MAX = 25;
const ROBBER_LOSS_PENALTY = 0.6;
const ROBBER_INFLUENCE_LOSS = 15;
let robberEvent = null;

function cellIndex(x, y) {
  return y * COLS + x + 1;
}

function setCellToInactive(x, y, {skipTreasureCleanup = false} = {}) {
    const key = `${x},${y}`;
    const cell = grid[key];
  if (!cell) return;
  if (!skipTreasureCleanup && treasure && treasure.key === key) {
    clearTreasure();
    return;
  }
  cell.classList.remove("resource", "important", "owned", "reachable", "barbarian", "special", "forest", "resource-disabled", "mercenary", "thief", "cutthroat", "mage", "portal", "flower", "clover", "stone", "rainbow-stone", "master", "troll", "troll-cave", "treasure");
  cell.classList.add("inactive");
  cell.textContent = "";
  clearCellIcon(cell);
  const trollToken = cell.querySelector(".troll-token");
  if (trollToken) trollToken.remove();
  cell.style.background = "";
  cell.style.borderColor = "";
  cell.style.color = "";
  cell.removeAttribute("data-barbarian");
  cell.removeAttribute("title");
  if (specialByPos[key]) {
    delete specialByPos[key];
  }
}

function setSpecialCell(x, y, label, extraClass = null, ownerIndex = null, featureKey = null, sourceCastleKey = null, meta = {}) {
  const key = `${x},${y}`;
  if (blockedCellKeys.has(key)) return false;
  if (nodeByPos[key]) return false;
  const cell = grid[key];
  if (!cell) return false;
  const previous = specialByPos[key];
  if (previous && previous.extraClass && previous.extraClass !== extraClass) {
    cell.classList.remove(previous.extraClass);
  }
  cell.classList.remove("inactive");
  cell.classList.add("important", "special");
  if (extraClass) cell.classList.add(extraClass);
  cell.textContent = label;
  clearCellIcon(cell);
  cell.classList.remove("resource-disabled");
  const entry = {
    x,
    y,
    label,
    extraClass,
    ownerIndex,
    featureKey,
    sourceCastleKey,
    disabled: false
  };
  entry.key = key;
  Object.assign(entry, meta);
  specialByPos[key] = entry;
  return true;
}

function setSpecialCellDisabled(key, disabled) {
  const entry = specialByPos[key];
  if (!entry) return false;
  const cell = grid[key];
  if (!cell) return false;
  entry.disabled = Boolean(disabled);
  if (entry.disabled) {
    cell.classList.add("resource-disabled");
  } else {
    cell.classList.remove("resource-disabled");
  }
  return true;
}

function isSpecialFeatureDisabled(ownerIndex, featureKey, sourceCastleKey = null) {
  return Object.values(specialByPos).some(entry => {
    if (entry.ownerIndex !== ownerIndex) return false;
    if (entry.featureKey !== featureKey) return false;
    if (sourceCastleKey && entry.sourceCastleKey !== sourceCastleKey) return false;
    return entry.disabled;
  });
}

function clearAllResources() {
  Object.values(resourceByPos).forEach(entry => {
    setCellToInactive(entry.x, entry.y);
  });
  Object.keys(resourceByPos).forEach(key => delete resourceByPos[key]);
}

function pruneExpiredResources(turnRef) {
  const ref = typeof turnRef === "number" ? turnRef : (typeof turnCounter === "number" ? turnCounter : 0);
  Object.keys(resourceByPos).forEach(key => {
    const entry = resourceByPos[key];
    if (!entry) return;
    if (typeof entry.spawnedAtTurn !== "number") {
      entry.spawnedAtTurn = ref;
    }
    if ((ref - entry.spawnedAtTurn) >= RESOURCE_LIFETIME_TURNS) {
      setCellToInactive(entry.x, entry.y);
      delete resourceByPos[key];
    }
  });
}

function spawnResources() {
  clearAllResources();
  const emptyKeys = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${y}`;
      if (nodeByPos[key]) continue;
      if (resourceByPos[key]) continue;
      if (specialByPos[key]) continue;
      if (cloverArtifact && cloverArtifact.key === key) continue;
      if (barbarianCells.some(cell => cell.key === key)) continue;
      if (isSpawnBlocked(x, y)) continue;
      if (blockedCellKeys.has(key)) continue;
      if (treasure && treasure.key === key) continue;
      if (players.some(p => p.x === x && p.y === y)) continue;
      emptyKeys.push(key);
    }
  }
  if (emptyKeys.length === 0) return;
  const typesToSpawn = [];
  const goldType = resourceTypes.find(type => type.key === "gold");
  const armyType = resourceTypes.find(type => type.key === "army");
  const resType = resourceTypes.find(type => type.key === "resources");
  if (goldType) typesToSpawn.push(goldType);
  if (resType) typesToSpawn.push(resType);
  if (armyType) {
    typesToSpawn.push(armyType);
    if (Math.random() < 0.2) {
      typesToSpawn.push(armyType);
    }
  }
  for (const type of typesToSpawn) {
    if (emptyKeys.length === 0) break;
    const pickIndex = Math.floor(Math.random() * emptyKeys.length);
    const key = emptyKeys.splice(pickIndex, 1)[0];
    const [xStr, yStr] = key.split(",");
    const x = Number(xStr);
    const y = Number(yStr);
    const cell = grid[key];
    if (!cell) continue;
    cell.classList.add("resource", "important");
    cell.classList.remove("inactive");
    const iconDef = RESOURCE_ICONS[type.key];
    if (iconDef) {
      cell.textContent = "";
      const icon = setCellIcon(cell, iconDef.file, iconDef.alt);
      if (icon) icon.classList.add("resource-icon");
    } else {
      cell.textContent = type.label;
    }
    resourceByPos[key] = {type, x, y, spawnedAtTurn: typeof turnCounter === "number" ? turnCounter : 0};
  }
  turnsUntilResources = RESOURCE_INTERVAL;
  updateStatusPanel();
}
function updateStatusPanel() {
  const resourceValue = Math.max(0, turnsUntilResources);
  if (resourceCountdown) {
    resourceCountdown.textContent = resourceValue;
  }
  if (resourceCountdownLeft) {

    resourceCountdownLeft.textContent = resourceValue;
  }
  if (resourceCountdownRight) {
    resourceCountdownRight.textContent = resourceValue;
  }
  if (treasureState || treasureStateRight) {
    let text = "";
    if (treasure) {
      text = `Сокровище активно (${treasureTurnsRemaining} ходов)`;
    } else {
      const treasureDelay = Math.max(0, turnsUntilTreasure);
      text =
        treasureDelay === 0
          ? "Сокровище появится в текущем ходе"
          : `Сокровище появится через ${treasureDelay} ходов`;
    }
    if (treasureState) treasureState.textContent = text;
    if (treasureStateRight) treasureStateRight.textContent = text;
  }
}

function getAvailableBarbarianKeys() {
  const emptyKeys = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${y}`;
      if (nodeByPos[key]) continue;
      if (resourceByPos[key]) continue;
      if (specialByPos[key]) continue;
      if (isSpawnBlocked(x, y)) continue;
      if (blockedCellKeys.has(key)) continue;
      if (treasure && treasure.key === key) continue;
      if (cloverArtifact && cloverArtifact.key === key) continue;
      if (barbarianCells.some(cell => cell.key === key)) continue;
      if (players.some(player => player.x === x && player.y === y)) continue;
      const cell = grid[key];
      if (!cell || !cell.classList.contains("inactive")) continue;
      emptyKeys.push(key);
    }
  }
  return emptyKeys;
}

function spawnBarbarianCell() {
  if (barbarianCells.length >= getMaxBarbarianCells()) return false;
  const availableKeys = getAvailableBarbarianKeys();
  if (availableKeys.length === 0) return false;
  const pickIndex = Math.floor(Math.random() * availableKeys.length);
  const key = availableKeys[pickIndex];
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  const baseArmy = Math.floor(Math.random() * 11) + 10;
  const strengthMultiplier = turnCounter >= 150 ? 1.75 : 1;
  const army = Math.max(1, Math.ceil(baseArmy * strengthMultiplier));
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("important", "barbarian");
  cell.textContent = "В";
  cell.title = "ВАРВАРЫ";
  setCellIcon(cell, "barbarian_village.png", "Варвары");
  cell.setAttribute("data-barbarian", "true");
  barbarianCells.push({key, x, y, army});
  return true;
}

function spawnInitialBarbarianCells() {
  while (barbarianCells.length < getMaxBarbarianCells()) {
    if (!spawnBarbarianCell()) break;
  }
}

function removeBarbarianCell(key) {
  const index = barbarianCells.findIndex(cell => cell.key === key);
  if (index === -1) return null;
  const removed = barbarianCells.splice(index, 1)[0];
  setCellToInactive(removed.x, removed.y);
  return removed;
}

function scheduleBarbarianRespawn() {
  const delay =
    Math.floor(Math.random() * (BARBARIAN_RESPAWN_MAX - BARBARIAN_RESPAWN_MIN + 1)) +
    BARBARIAN_RESPAWN_MIN;
  barbarianRespawnTimers.push(delay);
}

function handleBarbarianRespawns() {
  if (!barbarianPhaseStarted) return;
  for (let i = barbarianRespawnTimers.length - 1; i >= 0; i--) {
    barbarianRespawnTimers[i] -= 1;
    if (barbarianRespawnTimers[i] <= 0) {
      barbarianRespawnTimers.splice(i, 1);
      const spawned = spawnBarbarianCell();
      if (!spawned) {
        barbarianRespawnTimers.push(1);
      }
    }
  }
}

function scaleBarbarianReward(army, min, max) {
  const factor = (army - 5) / 10;
  const scaled = min + Math.round(factor * (max - min));
  return Math.min(max, Math.max(min, scaled));
}

function getTreasureEligibleKeys() {
  const playerPositions = new Set(players.map(p => `${p.x},${p.y}`));
  return Object.keys(grid).filter(key => {
    if (nodeByPos[key]) return false;
    if (resourceByPos[key]) return false;
    if (specialByPos[key]) return false;
    if (stoneByPos[key]) return false;
    if (rainbowByPos[key]) return false;
    if (cloverArtifact && cloverArtifact.key === key) return false;
    if (masterActive && key === MASTER_CELL.key) return false;
    if (playerPositions.has(key)) return false;
    if (treasure && treasure.key === key) return false;
    if (flowerArtifact && flowerArtifact.key === key) return false;
    if (barbarianCells.some(cell => cell.key === key)) return false;
    if (blockedCellKeys.has(key)) return false;
    const cell = grid[key];
    if (!cell) return false;
    if (!cell.classList.contains("inactive")) return false;
    return true;
  });
}

function getFlowerEligibleKeys() {
  const playerPositions = new Set(players.map(p => `${p.x},${p.y}`));
  return Object.keys(grid).filter(key => {
    if (nodeByPos[key]) return false;
    if (resourceByPos[key]) return false;
    if (specialByPos[key]) return false;
    if (cloverArtifact && cloverArtifact.key === key) return false;
    if (playerPositions.has(key)) return false;
    if (treasure && treasure.key === key) return false;
    if (flowerArtifact && flowerArtifact.key === key) return false;
    if (barbarianCells.some(cell => cell.key === key)) return false;
    if (blockedCellKeys.has(key)) return false;
    const cell = grid[key];
    if (!cell) return false;
    if (!cell.classList.contains("inactive")) return false;
    return true;
  });
}

function getStoneEligibleKeys() {
  const playerPositions = new Set(players.map(p => `${p.x},${p.y}`));
  return Object.keys(grid).filter(key => {
    if (nodeByPos[key]) return false;
    if (resourceByPos[key]) return false;
    if (specialByPos[key]) return false;
    if (stoneByPos[key]) return false;
    if (cloverArtifact && cloverArtifact.key === key) return false;
    if (playerPositions.has(key)) return false;
    if (treasure && treasure.key === key) return false;
    if (flowerArtifact && flowerArtifact.key === key) return false;
    if (barbarianCells.some(cell => cell.key === key)) return false;
    if (blockedCellKeys.has(key)) return false;
    const cell = grid[key];
    if (!cell) return false;
    if (!cell.classList.contains("inactive")) return false;
    return true;
  });
}

function getRainbowEligibleKeys() {
  const playerPositions = new Set(players.map(p => `${p.x},${p.y}`));
  return Object.keys(grid).filter(key => {
    if (nodeByPos[key]) return false;
    if (resourceByPos[key]) return false;
    if (specialByPos[key]) return false;
    if (stoneByPos[key]) return false;
    if (rainbowByPos[key]) return false;
    if (cloverArtifact && cloverArtifact.key === key) return false;
    if (playerPositions.has(key)) return false;
    if (treasure && treasure.key === key) return false;
    if (flowerArtifact && flowerArtifact.key === key) return false;
    if (barbarianCells.some(cell => cell.key === key)) return false;
    if (blockedCellKeys.has(key)) return false;
    const cell = grid[key];
    if (!cell) return false;
    if (!cell.classList.contains("inactive")) return false;
    return true;
  });
}

function clearTreasure() {
  if (!treasure) return;
  const { x, y } = treasure;
  const cell = treasure.elem;
  if (cell) {
    cell.classList.remove("treasure", "important");
    clearCellIcon(cell);
    setCellToInactive(x, y, { skipTreasureCleanup: true });
  }
  treasure = null;
  treasureTurnsRemaining = 0;
  updateStatusPanel();
}

function spawnTreasure() {
  clearTreasure();
  const eligibleKeys = getTreasureEligibleKeys();
  if (eligibleKeys.length === 0) return;
  const key = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)];
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("treasure", "important");
  cell.textContent = "";
  setCellIcon(cell, "treasure.png", "Сокровище");
  treasure = { key, x, y, elem: cell };
  treasureTurnsRemaining = TREASURE_DURATION;
  updateStatusPanel();
}

function clearFlower() {
  if (!flowerArtifact) return;
  const { x, y } = flowerArtifact;
  const cell = flowerArtifact.elem;
  if (cell) {
    cell.classList.remove("flower", "important");
    clearCellIcon(cell);
    setCellToInactive(x, y, { skipTreasureCleanup: true });
  }
  flowerArtifact = null;
  flowerTurnsRemaining = 0;
}

function clearClover() {
  if (!cloverArtifact) return;
  const { x, y } = cloverArtifact;
  const cell = cloverArtifact.elem;
  if (cell) {
    cell.classList.remove("clover", "important");
    clearCellIcon(cell);
    setCellToInactive(x, y, { skipTreasureCleanup: true });
  }
  cloverArtifact = null;
  cloverTurnsRemaining = 0;
}

function clearStone(key) {
  const entry = stoneByPos[key];
  if (!entry) return;
  setCellToInactive(entry.x, entry.y);
  delete stoneByPos[key];
}

function clearRainbowStone(key) {
  const entry = rainbowByPos[key];
  if (!entry) return;
  setCellToInactive(entry.x, entry.y);
  delete rainbowByPos[key];
}

function getPortalEligibleKeys() {
  const playerPositions = new Set(players.map(p => `${p.x},${p.y}`));
  return Object.keys(grid).filter(key => {
    if (nodeByPos[key]) return false;
    if (resourceByPos[key]) return false;
    if (specialByPos[key]) return false;
    if (stoneByPos[key]) return false;
    if (rainbowByPos[key]) return false;
    if (cloverArtifact && cloverArtifact.key === key) return false;
    if (playerPositions.has(key)) return false;
    if (treasure && treasure.key === key) return false;
    if (flowerArtifact && flowerArtifact.key === key) return false;
    if (barbarianCells.some(cell => cell.key === key)) return false;
    if (blockedCellKeys.has(key)) return false;
    const [xStr, yStr] = key.split(",");
    const x = Number(xStr);
    const y = Number(yStr);
    if (isSpawnBlocked(x, y)) return false;
    const cell = grid[key];
    if (!cell) return false;
    if (!cell.classList.contains("inactive")) return false;
    return true;
  });
}

function spawnPortalPair() {
  const eligibleKeys = getPortalEligibleKeys();
  if (eligibleKeys.length < 2) return false;
  const firstIndex = Math.floor(Math.random() * eligibleKeys.length);
  const firstKey = eligibleKeys.splice(firstIndex, 1)[0];
  const [fxStr, fyStr] = firstKey.split(",");
  const fx = Number(fxStr);
  const fy = Number(fyStr);
  const eligibleByDistance = eligibleKeys.filter(key => {
    const parts = key.split(",");
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const dx = Math.abs(x - fx);
    const dy = Math.abs(y - fy);
    return (dx + dy) >= 18;
  });
  if (eligibleByDistance.length === 0) return false;
  const secondKey = eligibleByDistance[Math.floor(Math.random() * eligibleByDistance.length)];
  const keys = [firstKey, secondKey];
  keys.forEach(key => {
    const [xStr, yStr] = key.split(",");
    const x = Number(xStr);
    const y = Number(yStr);
    const success = setSpecialCell(x, y, "", "portal", null, null, null, { type: "portal" });
    if (!success) return;
    const cell = grid[key];
    if (cell) {
      cell.textContent = "";
      setCellIcon(cell, "portal.png", "Портал");
    }
  });
  portalState.active = true;
  portalState.keys = keys;
  portalState.turnsRemaining = randomIntRange(PORTAL_LIFETIME_MIN, PORTAL_LIFETIME_MAX);
  portalState.nextSpawnTurn = null;
  return true;
}

function clearPortalPair({ scheduleRespawn = true } = {}) {
  if (portalState.keys.length) {
    portalState.keys.forEach(key => {
      const [xStr, yStr] = key.split(",");
      const x = Number(xStr);
      const y = Number(yStr);
      setCellToInactive(x, y);
    });
  }
  portalState.active = false;
  portalState.keys = [];
  portalState.turnsRemaining = 0;
  if (scheduleRespawn) {
    portalState.nextSpawnTurn = turnCounter + randomIntRange(PORTAL_RESPAWN_MIN, PORTAL_RESPAWN_MAX);
  }
}

function getOtherPortalKey(key) {
  if (!portalState.active || portalState.keys.length !== 2) return null;
  if (portalState.keys[0] === key) return portalState.keys[1];
  if (portalState.keys[1] === key) return portalState.keys[0];
  return null;
}

function spawnMasterCell() {
  const key = MASTER_CELL.key;
  const cell = grid[key];
  if (!cell) return false;
  if (!cell.classList.contains("inactive")) return false;
  cell.classList.remove("inactive");
  cell.classList.add("master", "important");
  cell.textContent = "";
  setCellIcon(cell, "grand_master.png", "Великий Мастер");
  masterActive = true;
  masterTurnsRemaining = MASTER_DURATION;
  return true;
}

function clearMasterCell() {
  if (!masterActive) return;
  setCellToInactive(MASTER_CELL.x, MASTER_CELL.y);
  masterActive = false;
  masterTurnsRemaining = 0;
  masterNextSpawnTurn = turnCounter + MASTER_SPAWN_INTERVAL;
}

function spawnFlower() {
  const eligibleKeys = getFlowerEligibleKeys();
  if (eligibleKeys.length === 0) return false;
  const key = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)];
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("flower", "important");
  cell.textContent = "";
  setCellIcon(cell, FLOWER_ICON.file, FLOWER_ICON.alt);
  flowerArtifact = { key, x, y, elem: cell };
  flowerTurnsRemaining = FLOWER_DURATION;
  return true;
}

function getCloverEligibleKeys() {
  const playerPositions = new Set(players.map(p => `${p.x},${p.y}`));
  return Object.keys(grid).filter(key => {
    if (nodeByPos[key]) return false;
    if (resourceByPos[key]) return false;
    if (specialByPos[key]) return false;
    if (stoneByPos[key]) return false;
    if (rainbowByPos[key]) return false;
    if (masterActive && key === MASTER_CELL.key) return false;
    if (playerPositions.has(key)) return false;
    if (treasure && treasure.key === key) return false;
    if (flowerArtifact && flowerArtifact.key === key) return false;
    if (cloverArtifact && cloverArtifact.key === key) return false;
    if (barbarianCells.some(cell => cell.key === key)) return false;
    if (blockedCellKeys.has(key)) return false;
    const cell = grid[key];
    if (!cell) return false;
    if (!cell.classList.contains("inactive")) return false;
    return true;
  });
}

function spawnClover() {
  const eligibleKeys = getCloverEligibleKeys();
  if (eligibleKeys.length === 0) return false;
  const key = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)];
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("clover", "important");
  cell.textContent = "";
  setCellIcon(cell, "clover.png", "Клевер");
  cloverArtifact = { key, x, y, elem: cell };
  cloverTurnsRemaining = CLOVER_DURATION;
  return true;
}

function spawnStone() {
  const eligibleKeys = getStoneEligibleKeys();
  if (eligibleKeys.length === 0) return false;
  const key = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)];
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("stone", "important");
  cell.textContent = "";
  setCellIcon(cell, "stone.png", "Необычный камень");
  stoneByPos[key] = { key, x, y, turnsRemaining: STONE_DURATION };
  return true;
}

function spawnRainbowStone() {
  const eligibleKeys = getRainbowEligibleKeys();
  if (eligibleKeys.length === 0) return false;
  const key = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)];
  const [xStr, yStr] = key.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("rainbow-stone", "important");
  cell.textContent = "";
  setCellIcon(cell, "rainbow_stone.png", "Радужный камень");
  rainbowByPos[key] = { key, x, y, turnsRemaining: RAINBOW_DURATION };
  return true;
}

function handleFlowerTimers() {
  if (flowerArtifact) {
    flowerTurnsRemaining -= 1;
    if (flowerTurnsRemaining <= 0) {
      clearFlower();
    }
  }
  if (!flowerArtifact && flowerSpawnIndex < flowerSpawnTurns.length) {
    const nextTurn = flowerSpawnTurns[flowerSpawnIndex];
    if (turnCounter >= nextTurn) {
      const spawned = spawnFlower();
      if (spawned) {
        flowerSpawnIndex += 1;
      }
    }
  }
}

function handleCloverTimers() {
  if (cloverArtifact) {
    cloverTurnsRemaining -= 1;
    if (cloverTurnsRemaining <= 0) {
      clearClover();
    }
  }
}

function handleStoneSpawns() {
  if (nextStoneSpawnTurn === null) {
    nextStoneSpawnTurn = randomIntRange(STONE_FIRST_MIN_TURN, STONE_FIRST_MAX_TURN);
  }
  if (turnCounter < nextStoneSpawnTurn) return;
  const spawned = spawnStone();
  if (spawned) {
    nextStoneSpawnTurn =
      turnCounter + randomIntRange(STONE_COOLDOWN_MIN, STONE_COOLDOWN_MAX);
  }
}

function handlePortalSpawns() {
  if (portalState.active) return;
  if (portalState.nextSpawnTurn === null) {
    portalState.nextSpawnTurn = randomIntRange(PORTAL_FIRST_MIN_TURN, PORTAL_FIRST_MAX_TURN);
  }
  if (turnCounter < portalState.nextSpawnTurn) return;
  spawnPortalPair();
}

function handleCloverSpawns() {
  if (nextCloverSpawnTurn === null) {
    nextCloverSpawnTurn = randomIntRange(CLOVER_SPAWN_MIN, CLOVER_SPAWN_MAX);
  }
  if (turnCounter < nextCloverSpawnTurn) return;
  spawnClover();
  nextCloverSpawnTurn = turnCounter + randomIntRange(CLOVER_SPAWN_MIN, CLOVER_SPAWN_MAX);
}

function handleRainbowSpawns() {
  if (rainbowSpawnIndex >= rainbowSpawnTurns.length) return;
  const nextTurn = rainbowSpawnTurns[rainbowSpawnIndex];
  if (turnCounter < nextTurn) return;
  const spawned = spawnRainbowStone();
  if (spawned) {
    rainbowSpawnIndex += 1;
  }
}

function handleRainbowTimers() {
  Object.values(rainbowByPos).forEach(entry => {
    entry.turnsRemaining -= 1;
    if (entry.turnsRemaining <= 0) {
      clearRainbowStone(entry.key);
    }
  });
}

function handlePortalTimers() {
  if (!portalState.active) return;
  portalState.turnsRemaining -= 1;
  if (portalState.turnsRemaining <= 0) {
    clearPortalPair();
  }
}

function handleMasterCell() {
  if (masterActive) {
    masterTurnsRemaining -= 1;
    if (masterTurnsRemaining <= 0) {
      clearMasterCell();
    }
    return;
  }
  if (turnCounter >= masterNextSpawnTurn) {
    const spawned = spawnMasterCell();
    if (!spawned) {
      return;
    }
  }
}

function handleStoneTimers() {
  Object.values(stoneByPos).forEach(entry => {
    entry.turnsRemaining -= 1;
    if (entry.turnsRemaining <= 0) {
      clearStone(entry.key);
    }
  });
}

function getMageSlotById(id) {
  return mageSlot.id === id ? mageSlot : null;
}

function getMageSlotByKey(key) {
  return mageSlot.active && mageSlot.key === key ? mageSlot : null;
}

function updateMageTimer(slot) {
  if (!slot || !slot.cell) return;
  if (!slot.timerElem) {
    const cell = grid[slot.key];
    if (!cell) return;
    const timer = document.createElement("div");
    timer.className = "mage-timer";
    cell.appendChild(timer);
    slot.timerElem = timer;
    slot.cell = cell;
  }
  if (slot.timerElem) {
    slot.timerElem.textContent = slot.turnsRemaining.toString();
  }
}

function spawnMageCell(slot) {
  if (!slot || slot.active) return false;
  if (slot.nextSpawnIndex === null) {
    slot.nextSpawnIndex = Math.floor(Math.random() * MAGE_POSITIONS.length);
  }
  const pick = MAGE_POSITIONS[slot.nextSpawnIndex];
  const success = setSpecialCell(
    pick.x,
    pick.y,
    slot.label,
    "mage",
    null,
    null,
    null,
    { type: "mage", mageId: slot.id }
  );
  if (!success) return false;
  slot.nextSpawnIndex = (slot.nextSpawnIndex + 1) % MAGE_POSITIONS.length;
  const key = `${pick.x},${pick.y}`;
  const cell = grid[key];
  if (cell) {
    setCellIcon(cell, "mage.png", "Маг");
  }
  slot.active = true;
  slot.turnsRemaining = randomIntRange(MAGE_MIN_DURATION, MAGE_MAX_DURATION);
  slot.cell = cell || null;
  slot.key = key;
  slot.x = pick.x;
  slot.y = pick.y;
  updateMageTimer(slot);
  return true;
}

function removeMageCell(slot) {
  if (!slot || !slot.active) return;
  const cell = grid[slot.key];
  if (cell) {
    const timer = cell.querySelector(".mage-timer");
    if (timer) timer.remove();
  }
  if (typeof slot.x === "number" && typeof slot.y === "number") {
    setCellToInactive(slot.x, slot.y);
  }
  slot.active = false;
  slot.turnsRemaining = 0;
  slot.cell = null;
  slot.timerElem = null;
  slot.key = null;
  slot.x = null;
  slot.y = null;
  slot.nextSpawnTurn = turnCounter + randomIntRange(MAGE_MIN_COOLDOWN, MAGE_MAX_COOLDOWN);
  if (typeof closeMageModal === "function" && pendingMageSlot === slot) {
    closeMageModal();
  }
}

function handleMageCellTimers() {
  const slot = mageSlot;
  if (slot.active) {
    slot.turnsRemaining -= 1;
    updateMageTimer(slot);
    if (slot.turnsRemaining <= 0) {
      removeMageCell(slot);
    }
    return;
  }
  if (turnCounter >= slot.nextSpawnTurn) {
    spawnMageCell(slot);
  }
}


