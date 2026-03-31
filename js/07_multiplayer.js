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
const playerSelectModal = document.getElementById("playerSelectModal");
const playerSelectButtons = Array.from(document.querySelectorAll(".player-select-btn"));

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
  socket.emit("hostState", state);
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
  if (entry.disabled) setSpecialCellDisabled(entry.key, true);
  const cell = grid[entry.key];
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

  // Scalars
  currentPlayerIndex = state.currentPlayerIndex ?? currentPlayerIndex;
  movesRemaining = state.movesRemaining ?? movesRemaining;
  lastRoll = state.lastRoll ?? lastRoll;
  lastRollText = state.lastRollText ?? lastRollText;
  lastDie1 = state.lastDie1 ?? lastDie1;
  lastDie2 = state.lastDie2 ?? lastDie2;
  extraTurnPending = state.extraTurnPending ?? extraTurnPending;
  extraTurnReason = state.extraTurnReason ?? extraTurnReason;
  justRolledDouble = state.justRolledDouble ?? justRolledDouble;
  robberAmbushThisSession = state.robberAmbushThisSession ?? robberAmbushThisSession;
  robbersEnabled = state.robbersEnabled ?? robbersEnabled;
  turnCounter = state.turnCounter ?? turnCounter;
  turnsUntilResources = state.turnsUntilResources ?? turnsUntilResources;
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

  // Castle maps
  Object.keys(castleOwnersByKey).forEach(key => delete castleOwnersByKey[key]);
  Object.assign(castleOwnersByKey, state.castleOwnersByKey || {});
  Object.keys(castleStatsByKey).forEach(key => delete castleStatsByKey[key]);
  Object.assign(castleStatsByKey, state.castleStatsByKey || {});

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

  const boardFingerprint = JSON.stringify({
    resourceByPos: normalizeEntries(state.resourceByPos, entry => `${entry.key || `${entry.x},${entry.y}`}:${entry.typeKey || ""}`),
    specialByPos: normalizeEntries(state.specialByPos, entry => `${entry.key || `${entry.x},${entry.y}`}:${entry.extraClass || ""}:${entry.type || ""}:${entry.ownerIndex ?? ""}`),
    treasure: state.treasure ? `${state.treasure.key || `${state.treasure.x},${state.treasure.y}`}` : "",
    flowerArtifact: state.flowerArtifact ? `${state.flowerArtifact.key || `${state.flowerArtifact.x},${state.flowerArtifact.y}`}` : "",
    cloverArtifact: state.cloverArtifact ? `${state.cloverArtifact.key || `${state.cloverArtifact.x},${state.cloverArtifact.y}`}` : "",
    stoneByPos: normalizeEntries(state.stoneByPos, entry => `${entry.key || `${entry.x},${entry.y}`}`),
    rainbowByPos: normalizeEntries(state.rainbowByPos, entry => `${entry.key || `${entry.x},${entry.y}`}`),
    portalState: state.portalState ? `${state.portalState.active ? 1 : 0}:${(state.portalState.keys || []).join("|")}` : "",
    masterActive: state.masterActive ? 1 : 0,
    mageSlot: state.mageSlot ? `${state.mageSlot.active ? 1 : 0}:${state.mageSlot.key || ""}` : "",
    trollState: state.trollState ? `${state.trollState.key || ""}` : "",
    barbarianCells: normalizeEntries(state.barbarianCells, entry => `${entry.key || `${entry.x},${entry.y}`}`),
    mercenaries: normalizeEntries(state.mercenaries, entry => `${entry.x},${entry.y}:${entry.id ?? ""}`),
    thieves: normalizeEntries(state.thieves, entry => `${entry.x},${entry.y}:${entry.id ?? ""}`)
  });
  const boardChanged = boardFingerprint !== lastBoardFingerprint;
  if (boardChanged) {
    lastBoardFingerprint = boardFingerprint;

    // Clear and rebuild board
    resetDynamicCells();

    // Special cells (incl. troll caves)
    (state.specialByPos || []).forEach(applySpecialEntry);

    // Resources
    (state.resourceByPos || []).forEach(applyResourceEntry);

    // Treasure / artifacts
    if (state.treasure) applyTreasure(state.treasure);
    if (state.flowerArtifact) applyFlower(state.flowerArtifact);
    if (state.cloverArtifact) applyClover(state.cloverArtifact);
    cloverTurnsRemaining = state.cloverTurnsRemaining ?? cloverTurnsRemaining;
    nextCloverSpawnTurn = state.nextCloverSpawnTurn ?? nextCloverSpawnTurn;

    // Stones
    (state.stoneByPos || []).forEach(applyStone);
    (state.rainbowByPos || []).forEach(applyRainbow);

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
  const reachableList = Array.isArray(state.reachableKeys) ? state.reachableKeys.slice().sort() : [];
  const reachableFingerprint = reachableList.join("|");
  if (reachableFingerprint !== lastReachableFingerprint) {
    lastReachableFingerprint = reachableFingerprint;
    clearReachable();
    reachableKeys = new Set(reachableList);
    showReachable();
  }

  // UI updates
  const positions = players.map(p => `${p.x},${p.y}`).join("|");
  if (positions !== lastPawnPositions.join("|")) {
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
  if (isHost) return true;
  const hasLocal = typeof localPlayerIndex !== "undefined" && localPlayerIndex !== null;
  const hasPlayerIndex = action && Object.prototype.hasOwnProperty.call(action, "playerIndex");
  if (!hasPlayerIndex || !hasLocal) return true;
  return action.playerIndex === localPlayerIndex;
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
    }
  });

  socket.on("playerAvailability", payload => {
    updatePlayerSelectAvailability(payload?.availablePlayers);
  });

  socket.on("hostAction", action => {
    if (!isHost) {
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
