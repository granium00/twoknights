const COLS = 30;
const ROWS = 25;
const RESOURCE_INTERVAL = 6;

const RESOURCE_TYPES = {
  gold: { min: 200, max: 400, label: "золота" },
  army: { min: 5, max: 8, label: "войск" },
  resources: { min: 20, max: 30, label: "ресурсов" }
};
const RESOURCE_LIFETIME_TURNS = 6;

const DEFAULT_STATE = {
  version: 1,
  tick: 0,
  currentPlayerIndex: 0,
  turnCounter: 0,
  movesRemaining: 0,
  lastRoll: null,
  lastDie1: null,
  lastDie2: null,
  players: [
    { id: 0, x: 0, y: 0, pocket: { gold: 0, army: 0, resources: 0 }, flowerCount: 0, cloverCount: 0, rainbowStoneCount: 0 },
    { id: 1, x: 0, y: 0, pocket: { gold: 0, army: 0, resources: 0 }, flowerCount: 0, cloverCount: 0, rainbowStoneCount: 0 }
  ],
  resourceByPos: [],
  treasure: null,
  flowerArtifact: null,
  cloverArtifact: null,
  rainbowByPos: [],
  turnsUntilResources: RESOURCE_INTERVAL,
  spawnableKeys: []
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createAuthoritativeState() {
  return clone(DEFAULT_STATE);
}

function applyAuthoritativeAction(state, action) {
  const events = [];
  if (!action || typeof action.type !== "string") return { state, events };
  function pruneExpiredResources() {
    const toRemove = [];
    state.resourceByPos = state.resourceByPos.filter(entry => {
      if (typeof entry.spawnedAtTurn !== "number") return true;
      if ((state.turnCounter - entry.spawnedAtTurn) >= RESOURCE_LIFETIME_TURNS) {
        toRemove.push(entry.key);
        return false;
      }
      return true;
    });
    if (toRemove.length) {
      events.push({ type: "despawn", kind: "resources", keys: toRemove });
    }
  }
  switch (action.type) {
    case "bootstrap": {
      if (!action.state) return { state, events };
      const next = action.state;
      if (typeof next.currentPlayerIndex === "number") {
        state.currentPlayerIndex = next.currentPlayerIndex;
      }
      if (typeof next.turnCounter === "number") {
        state.turnCounter = next.turnCounter;
      }
      if (typeof next.movesRemaining === "number") {
        state.movesRemaining = next.movesRemaining;
      }
      if (typeof next.lastRoll !== "undefined") {
        state.lastRoll = next.lastRoll;
      }
      if (typeof next.lastDie1 !== "undefined") {
        state.lastDie1 = next.lastDie1;
      }
      if (typeof next.lastDie2 !== "undefined") {
        state.lastDie2 = next.lastDie2;
      }
      if (Array.isArray(next.players)) {
        next.players.forEach((p, idx) => {
          if (!state.players[idx]) {
            state.players[idx] = {
              id: idx,
              x: 0,
              y: 0,
              pocket: { gold: 0, army: 0, resources: 0 },
              flowerCount: 0,
              cloverCount: 0,
              rainbowStoneCount: 0
            };
          }
          if (typeof p.x === "number") state.players[idx].x = p.x;
          if (typeof p.y === "number") state.players[idx].y = p.y;
          if (p.pocket) {
            state.players[idx].pocket.gold = p.pocket.gold ?? state.players[idx].pocket.gold;
            state.players[idx].pocket.army = p.pocket.army ?? state.players[idx].pocket.army;
            state.players[idx].pocket.resources = p.pocket.resources ?? state.players[idx].pocket.resources;
          }
          if (typeof p.flowerCount === "number") state.players[idx].flowerCount = p.flowerCount;
          if (typeof p.cloverCount === "number") state.players[idx].cloverCount = p.cloverCount;
          if (typeof p.rainbowStoneCount === "number") state.players[idx].rainbowStoneCount = p.rainbowStoneCount;
        });
      }
      if (Array.isArray(next.resourceByPos)) {
        state.resourceByPos = next.resourceByPos.map(entry => ({
          key: entry.key,
          x: entry.x,
          y: entry.y,
          typeKey: entry.typeKey,
          spawnedAtTurn: entry.spawnedAtTurn
        }));
      }
      if (typeof next.turnsUntilResources === "number") {
        state.turnsUntilResources = next.turnsUntilResources;
      }
      if (Array.isArray(next.spawnableKeys)) {
        state.spawnableKeys = next.spawnableKeys.slice();
      }
      if (next.treasure) state.treasure = next.treasure;
      if (next.flowerArtifact) state.flowerArtifact = next.flowerArtifact;
      if (next.cloverArtifact) state.cloverArtifact = next.cloverArtifact;
      if (Array.isArray(next.rainbowByPos)) {
        state.rainbowByPos = next.rainbowByPos.map(entry => ({
          key: entry.key,
          x: entry.x,
          y: entry.y,
          turnsRemaining: entry.turnsRemaining
        }));
      }
      state.tick += 1;
      return { state, events };
    }
    case "roll": {
      if (action.playerIndex !== state.currentPlayerIndex) return { state, events };
      let die1 = typeof action.die1 === "number" ? action.die1 : null;
      let die2 = typeof action.die2 === "number" ? action.die2 : null;
      if (die1 === null) die1 = Math.floor(Math.random() * 6) + 1;
      if (die2 === null) die2 = Math.floor(Math.random() * 6) + 1;
      const roll = typeof action.roll === "number" ? action.roll : die1 + die2;
      state.lastDie1 = die1;
      state.lastDie2 = die2;
      state.lastRoll = roll;
      state.movesRemaining = roll;
      state.tick += 1;
      return { state, events };
    }
    case "move": {
      if (action.playerIndex !== state.currentPlayerIndex) return { state, events };
      if (typeof action.x !== "number" || typeof action.y !== "number") return { state, events };
      if (action.x < 0 || action.x >= COLS || action.y < 0 || action.y >= ROWS) return { state, events };
      if (state.movesRemaining <= 0) return { state, events };
      const player = state.players[action.playerIndex];
      if (!player) return { state, events };
      const dist = Math.abs(player.x - action.x) + Math.abs(player.y - action.y);
      if (dist > state.movesRemaining) return { state, events };
      player.x = action.x;
      player.y = action.y;
      state.movesRemaining = 0;
      const key = `${action.x},${action.y}`;
      const resourceIndex = state.resourceByPos.findIndex(entry => entry.key === key);
      if (resourceIndex >= 0) {
        const entry = state.resourceByPos[resourceIndex];
        const typeInfo = RESOURCE_TYPES[entry.typeKey];
        if (typeInfo) {
          const base = Math.floor(Math.random() * (typeInfo.max - typeInfo.min + 1)) + typeInfo.min;
          const amount = state.turnCounter >= 150 ? Math.floor(base * 1.75) : base;
          player.pocket[entry.typeKey] = (player.pocket[entry.typeKey] || 0) + amount;
          state.resourceByPos.splice(resourceIndex, 1);
          events.push({ type: "pickup", kind: "resource", key, typeKey: entry.typeKey, amount, playerIndex: action.playerIndex });
        }
      }
      if (state.treasure && state.treasure.key === key) {
        const goldReward = Math.floor(Math.random() * (1200 - 700 + 1)) + 700;
        player.pocket.gold = (player.pocket.gold || 0) + goldReward;
        state.treasure = null;
        events.push({ type: "pickup", kind: "treasure", key, amount: goldReward, playerIndex: action.playerIndex });
      }
      if (state.flowerArtifact && state.flowerArtifact.key === key) {
        player.flowerCount = (player.flowerCount || 0) + 1;
        state.flowerArtifact = null;
        events.push({ type: "pickup", kind: "flower", key, playerIndex: action.playerIndex });
      }
      if (state.cloverArtifact && state.cloverArtifact.key === key) {
        player.cloverCount = (player.cloverCount || 0) + 1;
        state.cloverArtifact = null;
        events.push({ type: "pickup", kind: "clover", key, playerIndex: action.playerIndex });
      }
      const rainbowIndex = state.rainbowByPos.findIndex(entry => entry.key === key);
      if (rainbowIndex >= 0) {
        player.rainbowStoneCount = (player.rainbowStoneCount || 0) + 1;
        state.rainbowByPos.splice(rainbowIndex, 1);
        events.push({ type: "pickup", kind: "rainbow", key, playerIndex: action.playerIndex });
      }
      const hasBlocking = events.some(evt => evt.blockTurn);
      if (!hasBlocking) {
        state.movesRemaining = 0;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        state.turnCounter += 1;
        pruneExpiredResources();
        state.turnsUntilResources = Math.max(0, state.turnsUntilResources - 1);
        if (state.turnsUntilResources === 0) {
          const spawnPool = Array.isArray(state.spawnableKeys) ? state.spawnableKeys.slice() : [];
          const blocked = new Set();
          state.resourceByPos.forEach(entry => blocked.add(entry.key));
          if (state.treasure?.key) blocked.add(state.treasure.key);
          if (state.flowerArtifact?.key) blocked.add(state.flowerArtifact.key);
          if (state.cloverArtifact?.key) blocked.add(state.cloverArtifact.key);
          state.rainbowByPos.forEach(entry => blocked.add(entry.key));
          state.players.forEach(p => blocked.add(`${p.x},${p.y}`));
          const emptyKeys = spawnPool.filter(key => !blocked.has(key));
          const typesToSpawn = ["gold", "resources", "army"];
          if (Math.random() < 0.2) typesToSpawn.push("army");
          const spawned = [];
          while (typesToSpawn.length && emptyKeys.length) {
            const typeKey = typesToSpawn.shift();
            const pickIndex = Math.floor(Math.random() * emptyKeys.length);
            const spawnKey = emptyKeys.splice(pickIndex, 1)[0];
            const [sx, sy] = spawnKey.split(",").map(Number);
            state.resourceByPos.push({ key: spawnKey, x: sx, y: sy, typeKey, spawnedAtTurn: state.turnCounter });
            spawned.push({ key: spawnKey, x: sx, y: sy, typeKey });
          }
          if (spawned.length) {
            events.push({ type: "spawn", kind: "resources", items: spawned });
          }
          state.turnsUntilResources = RESOURCE_INTERVAL;
        }
        state.lastRoll = null;
        state.lastDie1 = null;
        state.lastDie2 = null;
      }
      state.tick += 1;
      return { state, events };
    }
    case "end_turn": {
      if (action.playerIndex !== state.currentPlayerIndex) return { state, events };
      state.movesRemaining = 0;
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      state.turnCounter += 1;
      pruneExpiredResources();
      state.turnsUntilResources = Math.max(0, state.turnsUntilResources - 1);
      if (state.turnsUntilResources === 0) {
        const spawnPool = Array.isArray(state.spawnableKeys) ? state.spawnableKeys.slice() : [];
        const blocked = new Set();
        state.resourceByPos.forEach(entry => blocked.add(entry.key));
        if (state.treasure?.key) blocked.add(state.treasure.key);
        if (state.flowerArtifact?.key) blocked.add(state.flowerArtifact.key);
        if (state.cloverArtifact?.key) blocked.add(state.cloverArtifact.key);
        state.rainbowByPos.forEach(entry => blocked.add(entry.key));
        state.players.forEach(p => blocked.add(`${p.x},${p.y}`));
        const emptyKeys = spawnPool.filter(key => !blocked.has(key));
        const typesToSpawn = ["gold", "resources", "army"];
        if (Math.random() < 0.2) typesToSpawn.push("army");
        const spawned = [];
        while (typesToSpawn.length && emptyKeys.length) {
          const typeKey = typesToSpawn.shift();
          const pickIndex = Math.floor(Math.random() * emptyKeys.length);
          const spawnKey = emptyKeys.splice(pickIndex, 1)[0];
          const [sx, sy] = spawnKey.split(",").map(Number);
          state.resourceByPos.push({ key: spawnKey, x: sx, y: sy, typeKey, spawnedAtTurn: state.turnCounter });
          spawned.push({ key: spawnKey, x: sx, y: sy, typeKey });
        }
        if (spawned.length) {
          events.push({ type: "spawn", kind: "resources", items: spawned });
        }
        state.turnsUntilResources = RESOURCE_INTERVAL;
      }
      state.lastRoll = null;
      state.lastDie1 = null;
      state.lastDie2 = null;
      state.tick += 1;
      return { state, events };
    }
    case "noop":
      state.tick += 1;
      return { state, events };
    default:
      return { state, events };
  }
}

module.exports = {
  createAuthoritativeState,
  applyAuthoritativeAction
};
