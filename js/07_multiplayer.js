// ------------------------------------------------------------
//   Простой онлайн-режим через Socket.IO (host authoritative)
// ------------------------------------------------------------
const socket = typeof io !== "undefined" ? io() : null;
let isHost = false;
let localPlayerIndex = null;
let applyingRemoteState = false;
let lastStateFingerprint = "";
let lastEmitAt = 0;
let performingRemoteAction = false;
let pendingState = null;
let applyStateTimer = null;
const STATE_APPLY_DEBOUNCE_MS = 40;
let lastBoardFingerprint = "";
let lastReachableFingerprint = "";
let lastPlayerUiFingerprint = [];
let lastPawnPositions = [];
let lastFullStateAt = 0;
let lastSentState = null;
let lastSentTurnIndex = null;
const FULL_STATE_INTERVAL = 1000;
let hasInitialFullBoard = false;
let lastAuthState = null;
let applyingAuthState = false;
const playerSelectModal = document.getElementById("playerSelectModal");
const playerSelectButtons = Array.from(document.querySelectorAll(".player-select-btn"));

function emitAuthBootstrap() {
  if (!socket || !isHost) return;
  const payload = {
    currentPlayerIndex,
    turnCounter,
    movesRemaining,
    lastRoll,
    lastDie1,
    lastDie2,
    turnsUntilResources,
    players: players.map(p => ({
      x: p.x,
      y: p.y,
      pocket: { ...p.pocket },
      flowerCount: p.flowerCount || 0,
      cloverCount: p.cloverCount || 0,
      rainbowStoneCount: p.rainbowStoneCount || 0
    })),
    spawnableKeys: Object.keys(grid).filter(key => {
      if (nodeByPos[key]) return false;
      if (blockedCellKeys.has(key)) return false;
      if (specialByPos[key]) return false;
      return true;
    }),
    resourceByPos: Object.values(resourceByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      typeKey: entry.type?.key || entry.typeKey,
      spawnedAtTurn: entry.spawnedAtTurn
    })),
    treasure: treasure ? { key: treasure.key, x: treasure.x, y: treasure.y } : null,
    flowerArtifact: flowerArtifact ? { key: flowerArtifact.key, x: flowerArtifact.x, y: flowerArtifact.y } : null,
    cloverArtifact: cloverArtifact ? { key: cloverArtifact.key, x: cloverArtifact.x, y: cloverArtifact.y } : null,
    rainbowByPos: Object.values(rainbowByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      turnsRemaining: entry.turnsRemaining
    }))
  };
  socket.emit("auth:bootstrap", payload);
}

function emitAuthAction(action) {
  if (!socket) return;
  socket.emit("auth:action", action);
}

function applyAuthState(state) {
  if (!state || applyingAuthState) return;
  applyingAuthState = true;
  lastAuthState = state;
  if (typeof state.currentPlayerIndex === "number") {
    currentPlayerIndex = state.currentPlayerIndex;
  }
  if (typeof state.turnCounter === "number") {
    turnCounter = state.turnCounter;
  }
  if (typeof state.movesRemaining === "number") {
    movesRemaining = state.movesRemaining;
  }
  if (typeof state.turnsUntilResources === "number") {
    turnsUntilResources = state.turnsUntilResources;
  }
  if (typeof state.lastRoll !== "undefined") {
    lastRoll = state.lastRoll;
  }
  if (typeof state.lastDie1 !== "undefined") {
    lastDie1 = state.lastDie1;
  }
  if (typeof state.lastDie2 !== "undefined") {
    lastDie2 = state.lastDie2;
  }
  if (typeof lastRoll !== "undefined" && lastRoll !== null) {
    if (typeof lastDie1 === "number" && typeof lastDie2 === "number") {
      lastRollText = `${lastDie1} + ${lastDie2} = ${lastRoll}`;
    } else {
      lastRollText = String(lastRoll);
    }
  } else {
    lastRollText = "-";
  }
  if (Array.isArray(state.players)) {
    state.players.forEach((p, idx) => {
      if (!players[idx]) return;
      if (typeof p.x === "number") players[idx].x = p.x;
      if (typeof p.y === "number") players[idx].y = p.y;
      if (p.pocket) {
        players[idx].pocket.gold = p.pocket.gold ?? players[idx].pocket.gold;
        players[idx].pocket.army = p.pocket.army ?? players[idx].pocket.army;
        players[idx].pocket.resources = p.pocket.resources ?? players[idx].pocket.resources;
      }
      if (typeof p.flowerCount === "number") players[idx].flowerCount = p.flowerCount;
      if (typeof p.cloverCount === "number") players[idx].cloverCount = p.cloverCount;
      if (typeof p.rainbowStoneCount === "number") players[idx].rainbowStoneCount = p.rainbowStoneCount;
    });
  }
  updatePawns();
  if (Array.isArray(state.resourceByPos)) {
    if (typeof clearAllResources === "function") {
      clearAllResources();
    } else {
      Object.keys(resourceByPos).forEach(key => delete resourceByPos[key]);
    }
    const turnRef = typeof state.turnCounter === "number" ? state.turnCounter : turnCounter;
    const filtered = state.resourceByPos.filter(entry => {
      if (typeof entry.spawnedAtTurn !== "number") return true;
      return (turnRef - entry.spawnedAtTurn) < 6;
    });
    filtered.forEach(entry => applyResourceEntry(entry));
  }
  players.forEach((_, idx) => updatePlayerResources(idx));
  updateTurnUI();
  if (typeof updateStatusPanel === "function") {
    updateStatusPanel();
  }
  if (typeof canLocalAct === "function" && canLocalAct() && movesRemaining > 0) {
    showReachable();
  } else {
    clearReachable();
  }
  applyingAuthState = false;
}

function setPlayerSelectVisible(visible) {
  if (!playerSelectModal) return;
  playerSelectModal.classList.toggle("active", visible);
}

function updatePlayerSelectAvailability(availablePlayers) {
  if (!playerSelectButtons.length) return;
  const available = Array.isArray(availablePlayers) ? new Set(availablePlayers) : new Set();
  playerSelectButtons.forEach(btn => {
    const value = Number(btn.dataset.playerChoice);
    if (Number.isNaN(value)) return;
    btn.disabled = !available.has(value);
  });
}

playerSelectButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (!socket) return;
    const value = Number(btn.dataset.playerChoice);
    if (Number.isNaN(value)) return;
    socket.emit("requestPlayerIndex", value);
  });
});

function shallowClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeEntries(entries, keyFn) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(entry => keyFn(entry))
    .filter(Boolean)
    .sort();
}

function mapByKey(entries, keyFn) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;
  entries.forEach(entry => {
    const key = keyFn(entry);
    if (key) map.set(key, entry);
  });
  return map;
}

function diffMap(prevEntries, nextEntries, keyFn) {
  const prevMap = mapByKey(prevEntries, keyFn);
  const nextMap = mapByKey(nextEntries, keyFn);
  const added = [];
  const updated = [];
  const removed = [];
  nextMap.forEach((value, key) => {
    if (!prevMap.has(key)) {
      added.push(value);
      return;
    }
    const prevValue = prevMap.get(key);
    if (JSON.stringify(prevValue) !== JSON.stringify(value)) {
      updated.push(value);
    }
  });
  prevMap.forEach((_, key) => {
    if (!nextMap.has(key)) removed.push(key);
  });
  return { added, updated, removed };
}

function buildPatch(prevState, nextState) {
  const patch = { scalars: {}, players: [] };
  const scalarKeys = [
    "currentPlayerIndex",
    "movesRemaining",
    "lastRoll",
    "lastRollText",
    "lastDie1",
    "lastDie2",
    "extraTurnPending",
    "extraTurnReason",
    "justRolledDouble",
    "robberAmbushThisSession",
    "robbersEnabled",
    "turnCounter",
    "turnsUntilResources",
    "turnsUntilTreasure",
    "treasureTurnsRemaining",
    "flowerTurnsRemaining",
    "masterNextSpawnTurn",
    "masterTurnsRemaining",
    "masterActive",
    "barbarianPhaseStarted",
    "robberEvent",
    "gameEnded",
    "gameTimerSeconds",
    "cloverTurnsRemaining",
    "nextCloverSpawnTurn"
  ];
  scalarKeys.forEach(key => {
    if (JSON.stringify(prevState[key]) !== JSON.stringify(nextState[key])) {
      patch.scalars[key] = nextState[key];
    }
  });
  if (Array.isArray(nextState.players)) {
    nextState.players.forEach((player, idx) => {
      const prevPlayer = prevState.players ? prevState.players[idx] : null;
      if (!prevPlayer || JSON.stringify(prevPlayer) !== JSON.stringify(player)) {
        patch.players.push({ index: idx, data: player });
      }
    });
  }
  patch.resources = diffMap(prevState.resourceByPos || [], nextState.resourceByPos || [],
    entry => entry.key || `${entry.x},${entry.y}`);
  patch.specials = diffMap(prevState.specialByPos || [], nextState.specialByPos || [],
    entry => entry.key || `${entry.x},${entry.y}`);
  patch.stones = diffMap(prevState.stoneByPos || [], nextState.stoneByPos || [],
    entry => entry.key || `${entry.x},${entry.y}`);
  patch.rainbows = diffMap(prevState.rainbowByPos || [], nextState.rainbowByPos || [],
    entry => entry.key || `${entry.x},${entry.y}`);
  patch.barbarians = diffMap(prevState.barbarianCells || [], nextState.barbarianCells || [],
    entry => entry.key || `${entry.x},${entry.y}`);
  patch.mercenaries = diffMap(prevState.mercenaries || [], nextState.mercenaries || [],
    entry => entry.id ? `id:${entry.id}` : `${entry.x},${entry.y}`);
  patch.thieves = diffMap(prevState.thieves || [], nextState.thieves || [],
    entry => entry.id ? `id:${entry.id}` : `${entry.x},${entry.y}`);

  patch.treasure = JSON.stringify(prevState.treasure || null) !== JSON.stringify(nextState.treasure || null)
    ? (nextState.treasure || null) : undefined;
  patch.flowerArtifact = JSON.stringify(prevState.flowerArtifact || null) !== JSON.stringify(nextState.flowerArtifact || null)
    ? (nextState.flowerArtifact || null) : undefined;
  patch.cloverArtifact = JSON.stringify(prevState.cloverArtifact || null) !== JSON.stringify(nextState.cloverArtifact || null)
    ? (nextState.cloverArtifact || null) : undefined;
  patch.masterActive = Boolean(prevState.masterActive) !== Boolean(nextState.masterActive)
    ? Boolean(nextState.masterActive) : undefined;
  patch.mageSlot = JSON.stringify(prevState.mageSlot || null) !== JSON.stringify(nextState.mageSlot || null)
    ? (nextState.mageSlot || null) : undefined;
  patch.portalState = JSON.stringify(prevState.portalState || null) !== JSON.stringify(nextState.portalState || null)
    ? (nextState.portalState || null) : undefined;
  patch.trollState = JSON.stringify(prevState.trollState || null) !== JSON.stringify(nextState.trollState || null)
    ? (nextState.trollState || null) : undefined;

  return patch;
}

function applyPatch(patch) {
  applyingRemoteState = true;

  if (patch.scalars) {
    Object.keys(patch.scalars).forEach(key => {
      if (typeof patch.scalars[key] !== "undefined") {
        switch (key) {
          case "currentPlayerIndex": currentPlayerIndex = patch.scalars[key]; break;
          case "movesRemaining": movesRemaining = patch.scalars[key]; break;
          case "lastRoll": lastRoll = patch.scalars[key]; break;
          case "lastRollText": lastRollText = patch.scalars[key]; break;
          case "lastDie1": lastDie1 = patch.scalars[key]; break;
          case "lastDie2": lastDie2 = patch.scalars[key]; break;
          case "extraTurnPending": extraTurnPending = patch.scalars[key]; break;
          case "extraTurnReason": extraTurnReason = patch.scalars[key]; break;
          case "justRolledDouble": justRolledDouble = patch.scalars[key]; break;
          case "robberAmbushThisSession": robberAmbushThisSession = patch.scalars[key]; break;
          case "robbersEnabled": robbersEnabled = patch.scalars[key]; break;
          case "turnCounter": turnCounter = patch.scalars[key]; break;
          case "turnsUntilResources": turnsUntilResources = patch.scalars[key]; break;
          case "turnsUntilTreasure": turnsUntilTreasure = patch.scalars[key]; break;
          case "treasureTurnsRemaining": treasureTurnsRemaining = patch.scalars[key]; break;
          case "flowerTurnsRemaining": flowerTurnsRemaining = patch.scalars[key]; break;
          case "masterNextSpawnTurn": masterNextSpawnTurn = patch.scalars[key]; break;
          case "masterTurnsRemaining": masterTurnsRemaining = patch.scalars[key]; break;
          case "masterActive": masterActive = patch.scalars[key]; break;
          case "barbarianPhaseStarted": barbarianPhaseStarted = patch.scalars[key]; break;
          case "robberEvent": robberEvent = patch.scalars[key]; break;
          case "gameEnded": gameEnded = patch.scalars[key]; break;
          case "gameTimerSeconds": gameTimerSeconds = patch.scalars[key]; break;
          case "cloverTurnsRemaining": cloverTurnsRemaining = patch.scalars[key]; break;
          case "nextCloverSpawnTurn": nextCloverSpawnTurn = patch.scalars[key]; break;
          default: break;
        }
      }
    });
  }

  if (Array.isArray(patch.players)) {
    patch.players.forEach(item => {
      if (!players[item.index]) return;
      Object.assign(players[item.index], item.data);
    });
  }

  if (patch.resources) {
    patch.resources.removed.forEach(key => {
      if (resourceByPos[key]) delete resourceByPos[key];
      const parts = key.split(",").map(Number);
      if (parts.length === 2) setCellToInactive(parts[0], parts[1], { skipTreasureCleanup: true });
    });
    [...patch.resources.added, ...patch.resources.updated].forEach(applyResourceEntry);
  }

  if (patch.specials) {
    patch.specials.removed.forEach(key => {
      if (specialByPos[key]) delete specialByPos[key];
      const parts = key.split(",").map(Number);
      if (parts.length === 2) setCellToInactive(parts[0], parts[1], { skipTreasureCleanup: true });
    });
    [...patch.specials.added, ...patch.specials.updated].forEach(applySpecialEntry);
  }

  if (patch.stones) {
    patch.stones.removed.forEach(key => {
      if (stoneByPos[key]) delete stoneByPos[key];
      if (typeof clearStone === "function") clearStone(key);
    });
    [...patch.stones.added, ...patch.stones.updated].forEach(applyStone);
  }

  if (patch.rainbows) {
    patch.rainbows.removed.forEach(key => {
      if (rainbowByPos[key]) delete rainbowByPos[key];
      if (typeof clearRainbowStone === "function") clearRainbowStone(key);
    });
    [...patch.rainbows.added, ...patch.rainbows.updated].forEach(applyRainbow);
  }

  if (typeof patch.treasure !== "undefined") {
    if (typeof clearTreasure === "function") clearTreasure();
    if (patch.treasure) applyTreasure(patch.treasure);
  }
  if (typeof patch.flowerArtifact !== "undefined") {
    if (typeof clearFlower === "function") clearFlower();
    if (patch.flowerArtifact) applyFlower(patch.flowerArtifact);
  }
  if (typeof patch.cloverArtifact !== "undefined") {
    if (typeof clearClover === "function") clearClover();
    if (patch.cloverArtifact) applyClover(patch.cloverArtifact);
  }

  if (typeof patch.masterActive !== "undefined") {
    if (patch.masterActive) {
      applyMaster();
    } else if (typeof clearMasterCell === "function") {
      clearMasterCell();
    }
  }
  if (typeof patch.mageSlot !== "undefined") {
    if (patch.mageSlot && patch.mageSlot.active) {
      applyMageSlot(patch.mageSlot);
    } else if (mageSlot && mageSlot.key) {
      setCellToInactive(mageSlot.x, mageSlot.y, { skipTreasureCleanup: true });
      mageSlot.active = false;
      mageSlot.key = null;
      mageSlot.x = null;
      mageSlot.y = null;
    }
  }
  if (typeof patch.portalState !== "undefined" && typeof portalState !== "undefined" && portalState) {
    portalState.active = Boolean(patch.portalState?.active);
    portalState.keys = Array.isArray(patch.portalState?.keys) ? patch.portalState.keys.slice() : [];
  }
  if (typeof patch.trollState !== "undefined" && typeof trollState !== "undefined") {
    trollState = Object.assign(trollState, patch.trollState);
    trollState.prevKey = null;
    updateTrollVisual();
  }

  if (patch.barbarians) {
    patch.barbarians.removed.forEach(key => {
      const parts = key.split(",").map(Number);
      if (parts.length === 2) setCellToInactive(parts[0], parts[1], { skipTreasureCleanup: true });
      const idx = barbarianCells.findIndex(entry => (entry.key || `${entry.x},${entry.y}`) === key);
      if (idx >= 0) barbarianCells.splice(idx, 1);
    });
    [...patch.barbarians.added, ...patch.barbarians.updated].forEach(entry => {
      applyBarbarianCell(entry);
      const key = entry.key || `${entry.x},${entry.y}`;
      const idx = barbarianCells.findIndex(item => (item.key || `${item.x},${item.y}`) === key);
      if (idx >= 0) barbarianCells[idx] = entry;
      else barbarianCells.push(entry);
    });
  }

  if (patch.mercenaries) {
    patch.mercenaries.removed.forEach(idKey => {
      const entryIdx = mercenaries.findIndex(entry => (entry.id ? `id:${entry.id}` : `${entry.x},${entry.y}`) === idKey);
      if (entryIdx >= 0) {
        clearMercenaryCell(mercenaries[entryIdx].x, mercenaries[entryIdx].y);
        mercenaries.splice(entryIdx, 1);
      }
    });
    [...patch.mercenaries.added, ...patch.mercenaries.updated].forEach(entry => {
      applyMercenary(entry);
      const key = entry.id ? `id:${entry.id}` : `${entry.x},${entry.y}`;
      const idx = mercenaries.findIndex(item => (item.id ? `id:${item.id}` : `${item.x},${item.y}`) === key);
      if (idx >= 0) mercenaries[idx] = entry;
      else mercenaries.push(entry);
    });
  }

  if (patch.thieves) {
    patch.thieves.removed.forEach(idKey => {
      const entryIdx = thieves.findIndex(entry => (entry.id ? `id:${entry.id}` : `${entry.x},${entry.y}`) === idKey);
      if (entryIdx >= 0) {
        clearThiefCell(thieves[entryIdx].x, thieves[entryIdx].y);
        thieves.splice(entryIdx, 1);
      }
    });
    [...patch.thieves.added, ...patch.thieves.updated].forEach(entry => {
      applyThief(entry);
      const key = entry.id ? `id:${entry.id}` : `${entry.x},${entry.y}`;
      const idx = thieves.findIndex(item => (item.id ? `id:${item.id}` : `${item.x},${item.y}`) === key);
      if (idx >= 0) thieves[idx] = entry;
      else thieves.push(entry);
    });
  }

  updatePawns();
  players.forEach((_, idx) => updatePlayerResources(idx));
  updateTurnUI();
  updateStatusPanel();
  if (typeof canLocalAct === "function" && canLocalAct() && movesRemaining > 0) {
    showReachable();
  } else {
    clearReachable();
  }

  applyingRemoteState = false;
}

function buildState() {
  return {
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      x: p.x,
      y: p.y,
      resources: shallowClone(p.resources),
      pocket: shallowClone(p.pocket),
      income: shallowClone(p.income),
      attack: p.attack,
      hasSword: p.hasSword,
      hasArmor: p.hasArmor,
      hasWorkshopSword: p.hasWorkshopSword,
      barbarianKills: p.barbarianKills,
      slowTurnsRemaining: p.slowTurnsRemaining,
      noDoubleTurnsRemaining: p.noDoubleTurnsRemaining,
      poisonCount: p.poisonCount,
      invisPotionCount: p.invisPotionCount,
      luckPotionCount: p.luckPotionCount,
      invisTurnsRemaining: p.invisTurnsRemaining,
      luckTurnsRemaining: p.luckTurnsRemaining,
      cloverCount: p.cloverCount,
      trollClubCount: p.trollClubCount,
      flowerCount: p.flowerCount,
      tokenCount: p.tokenCount,
      ringCount: p.ringCount,
      terrorRingCount: p.terrorRingCount,
      rainbowStoneCount: p.rainbowStoneCount,
      heroHiltCount: p.heroHiltCount,
      stoneBonusRollsRemaining: p.stoneBonusRollsRemaining,
      stunnedTurnsRemaining: p.stunnedTurnsRemaining,
      barbarianRewards: shallowClone(p.barbarianRewards)
    })),
    currentPlayerIndex,
    movesRemaining,
    lastRoll,
    lastRollText,
    lastDie1,
    lastDie2,
    extraTurnPending,
    extraTurnReason,
    justRolledDouble,
    robberAmbushThisSession,
    robbersEnabled,
    turnCounter,
    turnsUntilResources,
    turnsUntilTreasure,
    treasureTurnsRemaining,
    flowerTurnsRemaining,
    masterNextSpawnTurn,
    masterTurnsRemaining,
    masterActive,
    barbarianPhaseStarted,
    barbarianCells: shallowClone(barbarianCells),
    barbarianRespawnTimers: shallowClone(barbarianRespawnTimers),
    robberEvent: shallowClone(robberEvent),
    guardAccess: shallowClone(guardAccess),
    gameEnded,
    gameTimerSeconds,
    resourceByPos: Object.values(resourceByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      typeKey: entry.type?.key || entry.typeKey
    })),
    specialByPos: Object.values(specialByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      label: entry.label,
      extraClass: entry.extraClass,
      ownerIndex: entry.ownerIndex,
      featureKey: entry.featureKey,
      sourceCastleKey: entry.sourceCastleKey,
      disabled: entry.disabled,
      type: entry.type,
      mageId: entry.mageId
    })),
    treasure: treasure ? { key: treasure.key, x: treasure.x, y: treasure.y } : null,
    flowerArtifact: flowerArtifact ? { key: flowerArtifact.key, x: flowerArtifact.x, y: flowerArtifact.y } : null,
    cloverArtifact: cloverArtifact ? { key: cloverArtifact.key, x: cloverArtifact.x, y: cloverArtifact.y } : null,
    cloverTurnsRemaining,
    nextCloverSpawnTurn,
    stoneByPos: Object.values(stoneByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      turnsRemaining: entry.turnsRemaining
    })),
    rainbowByPos: Object.values(rainbowByPos).map(entry => ({
      key: entry.key,
      x: entry.x,
      y: entry.y,
      turnsRemaining: entry.turnsRemaining
    })),
    portalState: portalState ? {
      active: portalState.active,
      keys: Array.isArray(portalState.keys) ? shallowClone(portalState.keys) : [],
      turnsRemaining: portalState.turnsRemaining,
      nextSpawnTurn: portalState.nextSpawnTurn
    } : null,
    mageSlot: {
      active: mageSlot.active,
      turnsRemaining: mageSlot.turnsRemaining,
      key: mageSlot.key,
      x: mageSlot.x,
      y: mageSlot.y,
      nextSpawnTurn: mageSlot.nextSpawnTurn
    },
    trollState: shallowClone(trollState),
    trollCaves: TROLL_CAVES.map(cave => ({
      key: cave.key,
      x: cave.x,
      y: cave.y,
      looted: cave.looted
    })),
    mercenaries: shallowClone(mercenaries),
    mercenaryIdCounter,
    thieves: shallowClone(thieves),
    thiefIdCounter,
    lastBattleResult: shallowClone(lastBattleResult),
    lastBattleId,
    reachableKeys: Array.from(reachableKeys),
    castleOwnersByKey: shallowClone(castleOwnersByKey),
    castleStatsByKey: shallowClone(castleStatsByKey)
  };
}

function emitStateNow(force = false) {
  if (!socket || !isHost || applyingRemoteState) return;
  const now = Date.now();
  if (!force && now - lastEmitAt < 150) return;
  const state = buildState();
  const fingerprint = JSON.stringify(state);
  if (!force && fingerprint === lastStateFingerprint) return;
  lastStateFingerprint = fingerprint;
  lastEmitAt = now;
  const turnChanged = lastSentTurnIndex !== state.currentPlayerIndex;
  const shouldSendFull = force || turnChanged || !lastSentState || (now - lastFullStateAt > FULL_STATE_INTERVAL);
  if (shouldSendFull) {
    lastFullStateAt = now;
    lastSentTurnIndex = state.currentPlayerIndex;
    lastSentState = shallowClone(state);
    socket.emit("hostState", state);
    return;
  }
  const patch = buildPatch(lastSentState, state);
  lastSentState = shallowClone(state);
  socket.emit("hostPatch", patch);
}

function resetDynamicCells() {
  // Очистка всех не-узловых клеток
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = `${x},${y}`;
      if (nodeByPos[key]) continue;
      setCellToInactive(x, y, { skipTreasureCleanup: true });
    }
  }

  // Очистить коллекции
  Object.keys(resourceByPos).forEach(key => delete resourceByPos[key]);
  Object.keys(specialByPos).forEach(key => delete specialByPos[key]);
  Object.keys(stoneByPos).forEach(key => delete stoneByPos[key]);
  Object.keys(rainbowByPos).forEach(key => delete rainbowByPos[key]);
  if (typeof initPortalState === "function") {
    initPortalState();
  } else if (typeof portalState !== "undefined" && portalState) {
    portalState.active = false;
    portalState.keys = [];
    portalState.turnsRemaining = 0;
    portalState.nextSpawnTurn = null;
  }
  barbarianCells.length = 0;
  barbarianRespawnTimers.length = 0;
  mercenaries.length = 0;
  thieves.length = 0;
  treasure = null;
  flowerArtifact = null;
  cloverArtifact = null;
  masterActive = false;
  mageSlot.active = false;
  mageSlot.key = null;
  mageSlot.x = null;
  mageSlot.y = null;
  if (mageSlot.timerElem) {
    mageSlot.timerElem.remove();
    mageSlot.timerElem = null;
  }
  if (trollState.prevKey) clearTrollTokenAt(trollState.prevKey);
  if (trollState.key) clearTrollTokenAt(trollState.key);
}

function applyResourceEntry(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  const type = resourceTypes.find(t => t.key === entry.typeKey);
  if (!type) return;
  cell.classList.remove("inactive");
  cell.classList.add("resource", "important");
  cell.textContent = "";
  const iconDef = RESOURCE_ICONS[type.key];
  if (iconDef) {
    const icon = setCellIcon(cell, iconDef.file, iconDef.alt);
    if (icon) icon.classList.add("resource-icon");
  } else {
    cell.textContent = type.label;
  }
  resourceByPos[key] = { type, x: entry.x, y: entry.y, key };
}

function applySpecialEntry(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const success = setSpecialCell(
    entry.x,
    entry.y,
    entry.label,
    entry.extraClass || null,
    entry.ownerIndex ?? null,
    entry.featureKey ?? null,
    entry.sourceCastleKey ?? null,
    entry.type ? { type: entry.type, mageId: entry.mageId } : {}
  );
  if (!success) return;
  if (entry.disabled) setSpecialCellDisabled(key, true);
  const cell = grid[key];
  if (!cell) return;
  if (entry.extraClass === "mage") {
    setCellIcon(cell, "mage.png", "Маг");
  }
  if (entry.extraClass === "portal") {
    setCellIcon(cell, "portal.png", "Портал");
  }
  if (entry.extraClass === "troll-cave") {
    setCellIcon(cell, "troll_cave.png", "Пещера троллей");
  }
}

function applyTreasure(entry) {
  if (!entry) return;
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("treasure", "important");
  cell.textContent = "";
  setCellIcon(cell, "treasure.png", "Сокровище");
  treasure = { key, x: entry.x, y: entry.y, elem: cell };
}

function applyFlower(entry) {
  if (!entry) return;
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("flower", "important");
  cell.textContent = "";
  setCellIcon(cell, FLOWER_ICON.file, FLOWER_ICON.alt);
  flowerArtifact = { key, x: entry.x, y: entry.y, elem: cell };
}

function applyClover(entry) {
  if (!entry) return;
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("clover", "important");
  cell.textContent = "";
  setCellIcon(cell, "clover.png", "Клевер");
  cloverArtifact = { key, x: entry.x, y: entry.y, elem: cell };
}

function applyStone(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("stone", "important");
  cell.textContent = "";
  setCellIcon(cell, "stone.png", "Необычный камень");
  stoneByPos[key] = { key, x: entry.x, y: entry.y, turnsRemaining: entry.turnsRemaining };
}

function applyRainbow(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("rainbow-stone", "important");
  cell.textContent = "";
  setCellIcon(cell, "rainbow_stone.png", "Радужный камень");
  rainbowByPos[key] = { key, x: entry.x, y: entry.y, turnsRemaining: entry.turnsRemaining };
}

function applyMaster() {
  const key = MASTER_CELL.key;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("master", "important");
  cell.textContent = "";
  setCellIcon(cell, "grand_master.png", "Великий Мастер");
}

function applyMageSlot(slot) {
  if (!slot || !slot.active || !slot.key) return;
  const cell = grid[slot.key];
  if (!cell) return;
  setSpecialCell(slot.x, slot.y, mageSlot.label, "mage", null, null, null, { type: "mage", mageId: mageSlot.id });
  setCellIcon(cell, "mage.png", "Маг");
  mageSlot.active = true;
  mageSlot.key = slot.key;
  mageSlot.x = slot.x;
  mageSlot.y = slot.y;
  mageSlot.turnsRemaining = slot.turnsRemaining;
  updateMageTimer(mageSlot);
}

function applyBarbarianCell(entry) {
  const key = entry.key || `${entry.x},${entry.y}`;
  const cell = grid[key];
  if (!cell) return;
  cell.classList.remove("inactive");
  cell.classList.add("important", "barbarian");
  cell.textContent = "";
  cell.title = "ВАРВАРЫ";
  cell.setAttribute("data-barbarian", "true");
  setCellIcon(cell, "barbarian_village.png", "Варвары");
}

function applyMercenary(entry) {
  setCellToMercenary(entry.x, entry.y);
}

function applyThief(entry) {
  setCellToThief(entry.x, entry.y);
}

function applyState(state) {
  applyingRemoteState = true;
  if (typeof turnEndPending !== "undefined") {
    turnEndPending = false;
  }
  const authActive = typeof lastAuthState !== "undefined" &&
    lastAuthState &&
    typeof lastAuthState.currentPlayerIndex === "number";
  const boardState = authActive && lastAuthState ? lastAuthState : state;

  // Scalars
  if (!authActive) {
    currentPlayerIndex = state.currentPlayerIndex ?? currentPlayerIndex;
    movesRemaining = state.movesRemaining ?? movesRemaining;
    lastRoll = state.lastRoll ?? lastRoll;
    lastRollText = state.lastRollText ?? lastRollText;
    lastDie1 = state.lastDie1 ?? lastDie1;
    lastDie2 = state.lastDie2 ?? lastDie2;
  }
  extraTurnPending = state.extraTurnPending ?? extraTurnPending;
  extraTurnReason = state.extraTurnReason ?? extraTurnReason;
  justRolledDouble = state.justRolledDouble ?? justRolledDouble;
  robberAmbushThisSession = state.robberAmbushThisSession ?? robberAmbushThisSession;
  robbersEnabled = state.robbersEnabled ?? robbersEnabled;
  if (!authActive) {
    turnCounter = state.turnCounter ?? turnCounter;
  }
  if (!authActive) {
    turnsUntilResources = state.turnsUntilResources ?? turnsUntilResources;
  }
  turnsUntilTreasure = state.turnsUntilTreasure ?? turnsUntilTreasure;
  treasureTurnsRemaining = state.treasureTurnsRemaining ?? treasureTurnsRemaining;
  flowerTurnsRemaining = state.flowerTurnsRemaining ?? flowerTurnsRemaining;
  masterNextSpawnTurn = state.masterNextSpawnTurn ?? masterNextSpawnTurn;
  masterTurnsRemaining = state.masterTurnsRemaining ?? masterTurnsRemaining;
  masterActive = state.masterActive ?? masterActive;
  barbarianPhaseStarted = state.barbarianPhaseStarted ?? barbarianPhaseStarted;
  robberEvent = state.robberEvent ?? robberEvent;
  gameEnded = state.gameEnded ?? gameEnded;
  gameTimerSeconds = state.gameTimerSeconds ?? gameTimerSeconds;
  const incomingBattleId = state.lastBattleId ?? lastBattleId;
  const incomingBattleResult = state.lastBattleResult ?? lastBattleResult;

  // Players
  state.players?.forEach((data, idx) => {
    if (!players[idx]) return;
    Object.assign(players[idx], data);
  });
  if (authActive && Array.isArray(lastAuthState?.players)) {
    lastAuthState.players.forEach((p, idx) => {
      if (!players[idx]) return;
      if (typeof p.x === "number") players[idx].x = p.x;
      if (typeof p.y === "number") players[idx].y = p.y;
    });
  }

  // Castle maps
  Object.keys(castleOwnersByKey).forEach(key => delete castleOwnersByKey[key]);
  Object.assign(castleOwnersByKey, state.castleOwnersByKey || {});
  Object.keys(castleStatsByKey).forEach(key => delete castleStatsByKey[key]);
  Object.assign(castleStatsByKey, state.castleStatsByKey || {});
  if (typeof syncCastleOwnershipVisuals === "function") {
    syncCastleOwnershipVisuals();
  }

  // Guard access
  if (Array.isArray(state.guardAccess)) {
    guardAccess.length = 0;
    guardAccess.push(...state.guardAccess);
  }

  // Troll caves looted state
  if (Array.isArray(state.trollCaves)) {
    state.trollCaves.forEach(cave => {
      const idx = getTrollCaveIndexByKey(cave.key);
      if (idx >= 0) TROLL_CAVES[idx].looted = cave.looted;
    });
  }

  function buildBoardFingerprintFromState(data) {
    return JSON.stringify({
      resourceByPos: normalizeEntries(data.resourceByPos, entry => `${entry.key || `${entry.x},${entry.y}`}:${entry.typeKey || ""}`),
      specialByPos: normalizeEntries(data.specialByPos, entry => `${entry.key || `${entry.x},${entry.y}`}:${entry.extraClass || ""}:${entry.type || ""}:${entry.ownerIndex ?? ""}`),
      treasure: data.treasure ? `${data.treasure.key || `${data.treasure.x},${data.treasure.y}`}` : "",
      flowerArtifact: data.flowerArtifact ? `${data.flowerArtifact.key || `${data.flowerArtifact.x},${data.flowerArtifact.y}`}` : "",
      cloverArtifact: data.cloverArtifact ? `${data.cloverArtifact.key || `${data.cloverArtifact.x},${data.cloverArtifact.y}`}` : "",
      stoneByPos: normalizeEntries(data.stoneByPos, entry => `${entry.key || `${entry.x},${entry.y}`}`),
      rainbowByPos: normalizeEntries(data.rainbowByPos, entry => `${entry.key || `${entry.x},${entry.y}`}`),
      portalState: data.portalState ? `${data.portalState.active ? 1 : 0}:${(data.portalState.keys || []).join("|")}` : "",
      masterActive: data.masterActive ? 1 : 0,
      mageSlot: data.mageSlot ? `${data.mageSlot.active ? 1 : 0}:${data.mageSlot.key || ""}` : "",
      trollState: data.trollState ? `${data.trollState.key || ""}` : "",
      barbarianCells: normalizeEntries(data.barbarianCells, entry => `${entry.key || `${entry.x},${entry.y}`}`),
      mercenaries: normalizeEntries(data.mercenaries, entry => `${entry.x},${entry.y}:${entry.id ?? ""}`),
      thieves: normalizeEntries(data.thieves, entry => `${entry.x},${entry.y}:${entry.id ?? ""}`)
    });
  }

  function buildBoardFingerprintFromLocal() {
    return JSON.stringify({
      resourceByPos: normalizeEntries(Object.values(resourceByPos), entry => `${entry.key || `${entry.x},${entry.y}`}:${entry.type?.key || entry.typeKey || ""}`),
      specialByPos: normalizeEntries(Object.values(specialByPos), entry => `${entry.key || `${entry.x},${entry.y}`}:${entry.extraClass || ""}:${entry.type || ""}:${entry.ownerIndex ?? ""}`),
      treasure: treasure ? `${treasure.key || `${treasure.x},${treasure.y}`}` : "",
      flowerArtifact: flowerArtifact ? `${flowerArtifact.key || `${flowerArtifact.x},${flowerArtifact.y}`}` : "",
      cloverArtifact: cloverArtifact ? `${cloverArtifact.key || `${cloverArtifact.x},${cloverArtifact.y}`}` : "",
      stoneByPos: normalizeEntries(Object.values(stoneByPos), entry => `${entry.key || `${entry.x},${entry.y}`}`),
      rainbowByPos: normalizeEntries(Object.values(rainbowByPos), entry => `${entry.key || `${entry.x},${entry.y}`}`),
      portalState: portalState ? `${portalState.active ? 1 : 0}:${(portalState.keys || []).join("|")}` : "",
      masterActive: masterActive ? 1 : 0,
      mageSlot: mageSlot ? `${mageSlot.active ? 1 : 0}:${mageSlot.key || ""}` : "",
      trollState: trollState ? `${trollState.key || ""}` : "",
      barbarianCells: normalizeEntries(barbarianCells, entry => `${entry.key || `${entry.x},${entry.y}`}`),
      mercenaries: normalizeEntries(mercenaries, entry => `${entry.x},${entry.y}:${entry.id ?? ""}`),
      thieves: normalizeEntries(thieves, entry => `${entry.x},${entry.y}:${entry.id ?? ""}`)
    });
  }

  const incomingBoardFingerprint = buildBoardFingerprintFromState(boardState);
  const localBoardFingerprint = buildBoardFingerprintFromLocal();
  const needsBoardSync = !hasInitialFullBoard || localBoardFingerprint !== incomingBoardFingerprint;
  if (needsBoardSync) {
    lastBoardFingerprint = incomingBoardFingerprint;
    hasInitialFullBoard = true;

    // Clear and rebuild board
    resetDynamicCells();

    // Special cells (incl. troll caves)
    (state.specialByPos || []).forEach(applySpecialEntry);

    // Resources
    (boardState.resourceByPos || []).forEach(applyResourceEntry);

    // Treasure / artifacts
    if (boardState.treasure) applyTreasure(boardState.treasure);
    if (boardState.flowerArtifact) applyFlower(boardState.flowerArtifact);
    if (boardState.cloverArtifact) applyClover(boardState.cloverArtifact);
    cloverTurnsRemaining = boardState.cloverTurnsRemaining ?? cloverTurnsRemaining;
    nextCloverSpawnTurn = boardState.nextCloverSpawnTurn ?? nextCloverSpawnTurn;

    // Stones
    (state.stoneByPos || []).forEach(applyStone);
    (boardState.rainbowByPos || []).forEach(applyRainbow);

    // Portals
    if (state.portalState && typeof portalState !== "undefined" && portalState) {
      portalState.active = Boolean(state.portalState.active);
      portalState.keys = Array.isArray(state.portalState.keys) ? state.portalState.keys.slice() : [];
      portalState.turnsRemaining = state.portalState.turnsRemaining ?? portalState.turnsRemaining;
      portalState.nextSpawnTurn = state.portalState.nextSpawnTurn ?? portalState.nextSpawnTurn;
    }

    // Master
    if (state.masterActive) applyMaster();

    // Mage
    if (state.mageSlot) {
      mageSlot.nextSpawnTurn = state.mageSlot.nextSpawnTurn ?? mageSlot.nextSpawnTurn;
      applyMageSlot(state.mageSlot);
    }

    // Troll
    if (state.trollState) {
      trollState = Object.assign(trollState, state.trollState);
      trollState.prevKey = null;
      updateTrollVisual();
    }

    // Barbarians
    barbarianCells.length = 0;
    (state.barbarianCells || []).forEach(entry => {
      applyBarbarianCell(entry);
      barbarianCells.push(entry);
    });
    barbarianRespawnTimers.length = 0;
    if (Array.isArray(state.barbarianRespawnTimers)) {
      barbarianRespawnTimers.push(...state.barbarianRespawnTimers);
    }

    // Mercenaries
    mercenaries.length = 0;
    (state.mercenaries || []).forEach(entry => {
      applyMercenary(entry);
      mercenaries.push(entry);
    });
    mercenaryIdCounter = state.mercenaryIdCounter ?? mercenaryIdCounter;

    // Thieves
    thieves.length = 0;
    (state.thieves || []).forEach(entry => {
      applyThief(entry);
      thieves.push(entry);
    });
    thiefIdCounter = state.thiefIdCounter ?? thiefIdCounter;
  }

  // Timers that shouldn't force board rebuild
  if (state.portalState && typeof portalState !== "undefined" && portalState) {
    portalState.turnsRemaining = state.portalState.turnsRemaining ?? portalState.turnsRemaining;
    portalState.nextSpawnTurn = state.portalState.nextSpawnTurn ?? portalState.nextSpawnTurn;
  }
  if (state.mageSlot && typeof mageSlot !== "undefined") {
    mageSlot.turnsRemaining = state.mageSlot.turnsRemaining ?? mageSlot.turnsRemaining;
    mageSlot.nextSpawnTurn = state.mageSlot.nextSpawnTurn ?? mageSlot.nextSpawnTurn;
    if (typeof updateMageTimer === "function") {
      updateMageTimer(mageSlot);
    }
  }
  if (state.trollState && typeof trollState !== "undefined") {
    trollState.turnsRemaining = state.trollState.turnsRemaining ?? trollState.turnsRemaining;
  }

  // Reachable
  if (!authActive) {
    const shouldShowReachable = (state.movesRemaining ?? movesRemaining) > 0;
    const reachableList = shouldShowReachable && Array.isArray(state.reachableKeys)
      ? state.reachableKeys.slice().sort()
      : [];
    const reachableFingerprint = reachableList.join("|");
    if (reachableFingerprint !== lastReachableFingerprint) {
      lastReachableFingerprint = reachableFingerprint;
      clearReachable();
      reachableKeys = new Set(reachableList);
      if (shouldShowReachable && typeof canLocalAct === "function" && canLocalAct()) {
        showReachable();
      }
    }
  }

  // UI updates
  const positions = players.map(p => `${p.x},${p.y}`).join("|");
  if (authActive) {
    lastPawnPositions = [];
    updatePawns();
  } else if (positions !== lastPawnPositions.join("|")) {
    lastPawnPositions = players.map(p => `${p.x},${p.y}`);
    updatePawns();
  }
  players.forEach((player, idx) => {
    const uiFingerprint = JSON.stringify({
      resources: player.resources,
      pocket: player.pocket,
      income: player.income,
      attack: player.attack,
      barbarianKills: player.barbarianKills,
      slow: player.slowTurnsRemaining,
      noDouble: player.noDoubleTurnsRemaining,
      invis: player.invisTurnsRemaining,
      luck: player.luckTurnsRemaining,
      stone: player.stoneBonusRollsRemaining,
      stunned: player.stunnedTurnsRemaining,
      poisonCount: player.poisonCount,
      invisPotionCount: player.invisPotionCount,
      luckPotionCount: player.luckPotionCount,
      cloverCount: player.cloverCount,
      trollClubCount: player.trollClubCount,
      flowerCount: player.flowerCount,
      tokenCount: player.tokenCount,
      ringCount: player.ringCount,
      terrorRingCount: player.terrorRingCount,
      rainbowStoneCount: player.rainbowStoneCount,
      heroHiltCount: player.heroHiltCount,
      hasSword: player.hasSword,
      hasArmor: player.hasArmor,
      hasWorkshopSword: player.hasWorkshopSword
    });
    if (lastPlayerUiFingerprint[idx] !== uiFingerprint) {
      lastPlayerUiFingerprint[idx] = uiFingerprint;
      updatePlayerResources(idx);
    }
  });
  updateTurnUI();
  updateStatusPanel();
  if (incomingBattleId !== lastBattleId) {
    lastBattleId = incomingBattleId;
    lastBattleResult = incomingBattleResult;
    if (lastBattleResult) {
      showBattleModal(lastBattleResult, true);
    }
  }
  if (typeof updateRobberToggleButtons === "function") {
    updateRobberToggleButtons();
  }
  if (typeof updateRobberModalVisibility === "function") {
    updateRobberModalVisibility();
  }
  if (gameTimerDisplay) {
    gameTimerDisplay.textContent = `ВРЕМЯ: ${formatTime(gameTimerSeconds)}`;
  }

  applyingRemoteState = false;
}

function queueStateApply(state) {
  pendingState = state;
  if (applyStateTimer) return;
  applyStateTimer = setTimeout(() => {
    applyStateTimer = null;
    if (pendingState) {
      const nextState = pendingState;
      pendingState = null;
      applyState(nextState);
    }
  }, STATE_APPLY_DEBOUNCE_MS);
}

function getActionFromEvent(e) {
  if (typeof canLocalAct === "function" && !canLocalAct()) {
    return null;
  }
  const target = e.target;
  if (!target) return null;

  if (game && game.contains(target)) {
    const rect = game.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridX = Math.floor(clickX / cellSize);
    const gridY = Math.floor(clickY / cellSize);
    if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
      return { type: "game_click", x: gridX, y: gridY, playerIndex: localPlayerIndex };
    }
  }

  const clickable = target.closest(
    "#rollBtn, #newGameBtn, button, [data-buy], [data-lavka-buy], [data-workshop-buy], [data-hire], [data-city-reward], [data-city-exchange], [data-castle-feature], [data-castle-storage]"
  );
  if (!clickable) return null;

  if (clickable.id) {
    return { type: "dom_click", id: clickable.id, playerIndex: localPlayerIndex };
  }

  const dataKeys = [
    "buy",
    "lavkaBuy",
    "workshopBuy",
    "hire",
    "cityReward",
    "cityExchange",
    "castleFeature",
    "castleStorage"
  ];
  for (const key of dataKeys) {
    const dataValue = clickable.dataset[key];
    if (dataValue) {
      return { type: "dom_click", dataKey: key, dataValue, playerIndex: localPlayerIndex };
    }
  }

  return null;
}

function shouldApplyHostAction(action) {
  if (!action || typeof action.playerIndex !== "number") return true;
  return action.playerIndex === currentPlayerIndex;
}

function performHostAction(action) {
  if (!action) return;
  performingRemoteAction = true;
  if (action.type === "game_click") {
    const rect = game.getBoundingClientRect();
    const clickX = rect.left + (action.x + 0.5) * cellSize;
    const clickY = rect.top + (action.y + 0.5) * cellSize;
    const evt = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: clickX,
      clientY: clickY
    });
    game.dispatchEvent(evt);
    performingRemoteAction = false;
    return;
  }
  if (action.type === "dom_click") {
    let el = null;
    if (action.id) {
      el = document.getElementById(action.id);
    } else if (action.dataKey) {
      const attr = action.dataKey.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      el = document.querySelector(`[data-${attr}="${action.dataValue}"]`);
    }
    if (el) el.click();
  }
  performingRemoteAction = false;
}

if (socket) {
  socket.on("role", payload => {
    isHost = Boolean(payload?.isHost);
    if (payload && typeof payload.playerIndex === "number") {
      localPlayerIndex = payload.playerIndex;
    } else {
      localPlayerIndex = null;
    }
    updatePlayerSelectAvailability(payload?.availablePlayers);
    setPlayerSelectVisible(localPlayerIndex === null);
    if (typeof updatePlayerResources === "function" && Array.isArray(players)) {
      players.forEach((_, idx) => updatePlayerResources(idx));
    }
    if (typeof updateTurnUI === "function") {
      updateTurnUI();
    }
    if (!isHost && typeof autoRollTimer !== "undefined" && autoRollTimer) {
      clearTimeout(autoRollTimer);
      autoRollTimer = null;
    }
    if (isHost && typeof scheduleAutoRoll === "function") {
      scheduleAutoRoll();
    }
    if (isHost) {
      setTimeout(() => emitStateNow(true), 0);
      setTimeout(() => emitAuthBootstrap(), 0);
    }
    if (!isHost && socket) {
      socket.emit("auth:requestState");
    }
  });

  socket.on("playerAvailability", payload => {
    updatePlayerSelectAvailability(payload?.availablePlayers);
  });

  socket.on("hostAction", action => {
    if (!isHost) {
      return;
    }
    if (!shouldApplyHostAction(action)) {
      setTimeout(() => emitStateNow(true), 0);
      return;
    }
    performHostAction(action);
    setTimeout(() => emitStateNow(true), 0);
  });

  socket.on("stateUpdate", state => {
    if (isHost) return;
    if (!state || applyingRemoteState) return;
    queueStateApply(state);
  });

  socket.on("statePatch", patch => {
    if (isHost) return;
    if (!patch || applyingRemoteState) return;
    applyPatch(patch);
  });

  socket.on("auth:state", state => {
    applyAuthState(state);
  });

  socket.on("auth:event", evt => {
    if (!evt || !evt.type) return;
    if (evt.type === "pickup") {
      if (evt.kind === "resource") {
        const key = evt.key;
        const entry = resourceByPos[key];
        if (entry) {
          delete resourceByPos[key];
          setCellToInactive(entry.x, entry.y);
        } else if (key) {
          const parts = key.split(",").map(Number);
          if (parts.length === 2) setCellToInactive(parts[0], parts[1]);
        }
        if (typeof showPickupToast === "function") {
          const label = evt.typeKey === "gold" ? "золота" : evt.typeKey === "army" ? "войск" : "ресурсов";
          showPickupToast(`В карман: +${evt.amount} ${label}`, { broadcast: true, fromNetwork: true });
        }
      }
      if (evt.kind === "treasure") {
        if (typeof clearTreasure === "function") clearTreasure();
        if (typeof showPickupToast === "function") {
          showPickupToast(`Сокровище: +${evt.amount} золота в карман`, { broadcast: true, fromNetwork: true });
        }
      }
      if (evt.kind === "flower") {
        if (typeof clearFlower === "function") clearFlower();
        if (typeof showPickupToast === "function") {
          showPickupToast("Таинственный цветок добавлен в инвентарь.", { broadcast: true, fromNetwork: true });
        }
      }
      if (evt.kind === "clover") {
        if (typeof clearClover === "function") clearClover();
        if (typeof showPickupToast === "function") {
          showPickupToast("Клевер добавлен в инвентарь.", { broadcast: true, fromNetwork: true });
        }
      }
      if (evt.kind === "rainbow") {
        if (typeof clearRainbowStone === "function" && evt.key) {
          clearRainbowStone(evt.key);
        } else if (evt.key) {
          const parts = evt.key.split(",").map(Number);
          if (parts.length === 2) setCellToInactive(parts[0], parts[1]);
        }
        if (typeof showPickupToast === "function") {
          showPickupToast("Радужный камень добавлен в инвентарь.", { broadcast: true, fromNetwork: true });
        }
      }
    }
    if (evt.type === "spawn" && evt.kind === "resources" && Array.isArray(evt.items)) {
      if (typeof clearAllResources === "function") {
        clearAllResources();
      } else {
        Object.keys(resourceByPos).forEach(key => delete resourceByPos[key]);
      }
      evt.items.forEach(entry => applyResourceEntry(entry));
      if (typeof updateStatusPanel === "function") {
        updateStatusPanel();
      }
    }
    if (evt.type === "despawn" && evt.kind === "resources" && Array.isArray(evt.keys)) {
      evt.keys.forEach(key => {
        const entry = resourceByPos[key];
        if (entry) {
          delete resourceByPos[key];
          setCellToInactive(entry.x, entry.y);
        } else if (key) {
          const parts = key.split(",").map(Number);
          if (parts.length === 2) setCellToInactive(parts[0], parts[1]);
        }
      });
      if (typeof updateStatusPanel === "function") {
        updateStatusPanel();
      }
    }
  });

  socket.on("pickupToast", payload => {
    if (!payload || typeof payload.text !== "string") return;
    if (payload.senderId && socket.id && payload.senderId === socket.id) return;
    if (typeof showPickupToast === "function") {
      showPickupToast(payload.text, { broadcast: true, fromNetwork: true });
    }
  });

  document.addEventListener("click", e => {
    if (isHost || applyingRemoteState || performingRemoteAction) return;
    const action = getActionFromEvent(e);
    if (!action) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    socket.emit("clientAction", action);
  }, true);

  document.addEventListener("click", e => {
    if (!isHost || applyingRemoteState || performingRemoteAction) return;
    const action = getActionFromEvent(e);
    if (action) {
      socket.emit("hostAction", action);
    }
    setTimeout(() => emitStateNow(), 0);
  }, true);

  setInterval(() => {
    emitStateNow();
  }, 400);
}
