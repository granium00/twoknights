// ────────────────────────────────────────
//   ПЕШКИ
// ────────────────────────────────────────
const startNode = importantNodes.find(n => n.id === 6) || {x: 0, y: 0};
const players = [
  {
    id: 0,
    name: "Игрок 1",
    color: "#4cc9f0",
    x: startNode.x,
    y: startNode.y,
    resources: {gold: 0, army: 0, influence: 0, resources: 0},
    pocket: {gold: 0, army: 0, resources: 0},
    income: {resources: 0},
    attack: 6,
    hasSword: false,
    hasArmor: false,
    hasWorkshopSword: false,
    barbarianKills: 0,
    slowTurnsRemaining: 0,
    noDoubleTurnsRemaining: 0,
    poisonCount: 0,
    invisPotionCount: 0,
    luckPotionCount: 0,
    invisTurnsRemaining: 0,
    luckTurnsRemaining: 0,
    cloverCount: 0,
    trollClubCount: 0,
    flowerCount: 0,
    tokenCount: 0,
    ballistaCount: 0,
    boltCount: 0,
    ringCount: 0,
    terrorRingCount: 0,
    rainbowStoneCount: 0,
    heroHiltCount: 0,
    stoneBonusRollsRemaining: 0,
    stunnedTurnsRemaining: 0,
    barbarianRewards: {r5: false, r10: false, r20: false}
  },
  {
    id: 1,
    name: "Игрок 2",
    color: "#ff595e",
    x: startNode.x,
    y: startNode.y,
    resources: {gold: 0, army: 0, influence: 0, resources: 0},
    pocket: {gold: 0, army: 0, resources: 0},
    income: {resources: 0},
    attack: 6,
    hasSword: false,
    hasArmor: false,
    hasWorkshopSword: false,
    barbarianKills: 0,
    slowTurnsRemaining: 0,
    noDoubleTurnsRemaining: 0,
    poisonCount: 0,
    invisPotionCount: 0,
    luckPotionCount: 0,
    invisTurnsRemaining: 0,
    luckTurnsRemaining: 0,
    cloverCount: 0,
    trollClubCount: 0,
    flowerCount: 0,
    tokenCount: 0,
    ballistaCount: 0,
    boltCount: 0,
    ringCount: 0,
    terrorRingCount: 0,
    rainbowStoneCount: 0,
    heroHiltCount: 0,
    stoneBonusRollsRemaining: 0,
    stunnedTurnsRemaining: 0,
    barbarianRewards: {r5: false, r10: false, r20: false}
  }
];
const PLAYER_VISIBILITY_RANGE = 5;

function getLocalPlayerIndex() {
  return typeof localPlayerIndex !== "undefined" && localPlayerIndex !== null
    ? localPlayerIndex
    : null;
}

function canLocalAct() {
  const inMultiplayer = typeof socket !== "undefined" && socket;
  if (!inMultiplayer) return true;
  const localIndex = getLocalPlayerIndex();
  if (localIndex === null) return false;
  return localIndex === currentPlayerIndex;
}

function isPlayerInfoHidden(targetIndex) {
  const localIndex = getLocalPlayerIndex();
  if (localIndex === null || localIndex === targetIndex) return false;
  const localPlayer = players[localIndex];
  const targetPlayer = players[targetIndex];
  if (!localPlayer || !targetPlayer) return false;
  const dist = Math.abs(localPlayer.x - targetPlayer.x) + Math.abs(localPlayer.y - targetPlayer.y);
  return dist > PLAYER_VISIBILITY_RANGE;
}

function maskPlayerPanel(panel) {
  if (!panel) return;
  panel.querySelectorAll('[data-stat]').forEach(node => {
    node.textContent = "??";
  });
  panel.querySelectorAll('[data-income]').forEach(node => {
    node.textContent = "+?";
  });
  const negativeSpan = panel.querySelector('[data-stat="negative-buffs"]');
  if (negativeSpan) negativeSpan.textContent = "Скрыто";
  const positiveSpan = panel.querySelector('[data-stat="positive-buffs"]');
  if (positiveSpan) positiveSpan.textContent = "Скрыто";
}
const pawns = players.map((player, index) => {
  const pawn = document.createElement("div");
  pawn.className = "pawn";
  pawn.textContent = "";
  pawn.style.boxShadow = `0 0 12px ${player.color}88`;
  const icon = document.createElement("img");
  icon.className = "icon";
  icon.src = index === 0 ? "assets/icons/player_1.png" : "assets/icons/player_2.png";
  icon.alt = index === 0 ? "Игрок 1" : "Игрок 2";
  icon.style.filter = `drop-shadow(0 0 10px ${player.color}aa)`;
  pawn.appendChild(icon);
  game.appendChild(pawn);
  return pawn;
});
const MAGE_SLOW_COST = 750;
const MAGE_NO_DOUBLE_COST = 750;
const MAGE_POISON_COST = 5500;
const MAGE_SLOW_DURATION = 15;
const MAGE_NO_DOUBLE_DURATION = 15;
const MAGE_SLOW_PENALTY = 3;
const POISON_INFLUENCE_THRESHOLD = 1000;
playerColorDots.forEach((dot, index) => {
  const player = players[index];
  if (player) dot.style.background = player.color;
});
const guardAccess = players.map(() => false);
let pendingGuardMove = null;
let pendingGuardPlayerIndex = null;
const POTION_INVIS_TURNS = 25;
const POTION_LUCK_TURNS = 25;
const BALLISTA_COST = 1000;
const BOLT_COST = 150;
const BALLISTA_RANGE = 11;
const BALLISTA_DAMAGE_MIN = 13;
const BALLISTA_DAMAGE_MAX = 17;
let ballistaModePlayerIndex = null;
const INVENTORY_ITEMS = [
  {key: "poison", label: "Яд", icon: "poison.png", count: player => player.poisonCount || 0},
  {key: "potion-invis", label: "Зелье невидимости", icon: "potion_invis.png", count: player => player.invisPotionCount || 0, useAction: "potion-invis"},
  {key: "potion-luck", label: "Зелье удачи", icon: "potion_luck.png", count: player => player.luckPotionCount || 0, useAction: "potion-luck"},
  {key: "clover", label: "Клевер", icon: "clover.png", count: player => player.cloverCount || 0},
  {key: "flower", label: "Таинственный цветок", icon: "mystic_flower.png", count: player => player.flowerCount || 0},
  {key: "token", label: "Жетон", icon: "token.png", count: player => player.tokenCount || 0},
  {key: "ballista", label: "Баллиста", icon: "ballista.png", count: player => player.ballistaCount || 0, useAction: "ballista"},
  {key: "bolt", label: "Болт", icon: "ballista_bolt.png", count: player => player.boltCount || 0},
  {key: "ring", label: "Кольцо убеждения", icon: "ring_persuasion.png", count: player => player.ringCount || 0},
  {key: "terror-ring", label: "Кольцо ужаса", icon: "ring_terror.png", count: player => player.terrorRingCount || 0},
  {key: "rainbow-stone", label: "Радужный камень", icon: "rainbow_stone.png", count: player => player.rainbowStoneCount || 0},
  {key: "troll-club", label: "Дубинка троллей", icon: "troll_club.png", count: player => player.trollClubCount || 0},
  {key: "hero-hilt", label: "Рукоять меча героя", icon: "hero_hilt.png", count: player => player.heroHiltCount || 0},
  {key: "sword", label: "Меч героя", icon: "sword.png", count: player => (player.hasSword ? 1 : 0)}
];

function applyPotion(playerIndex, type) {
  const player = players[playerIndex];
  if (!player) return;
  if (type === "ballista") {
    if (playerIndex !== currentPlayerIndex) return;
    if ((player.ballistaCount || 0) <= 0) return;
    if ((player.boltCount || 0) <= 0) {
      showPickupToast("Нет болтов для баллисты.");
      return;
    }
    ballistaModePlayerIndex = playerIndex;
    showPickupToast("Режим баллисты активирован. Выберите цель.");
    showBallistaRange();
    updateInventory(playerIndex);
    return;
  }
  if (type === "potion-invis") {
    if ((player.invisPotionCount || 0) <= 0) return;
    player.invisPotionCount -= 1;
    player.invisTurnsRemaining = Math.max(player.invisTurnsRemaining || 0, POTION_INVIS_TURNS);
    showPickupToast("Зелье невидимости: тролли не атакуют 25 ходов.");
  }
  if (type === "potion-luck") {
    if ((player.luckPotionCount || 0) <= 0) return;
    player.luckPotionCount -= 1;
    player.luckTurnsRemaining = Math.max(player.luckTurnsRemaining || 0, POTION_LUCK_TURNS);
    showPickupToast("Зелье удачи: +1.6 к ресурсам на 25 ходов.");
  }
  updatePlayerResources(playerIndex);
  updateInventory(playerIndex);
}

function cancelBallistaMode(playerIndex) {
  if (ballistaModePlayerIndex !== playerIndex) return;
  ballistaModePlayerIndex = null;
  clearReachable();
  showReachable();
  updateInventory(playerIndex);
  showPickupToast("Режим баллисты отменен.");
}

function tryBallistaShot(gridX, gridY) {
  if (ballistaModePlayerIndex === null) return false;
  if (ballistaModePlayerIndex !== currentPlayerIndex) return false;
  const attacker = players[ballistaModePlayerIndex];
  if (!attacker) return true;
  const targetIndex = players.findIndex(
    (p, idx) => idx !== ballistaModePlayerIndex && p.x === gridX && p.y === gridY
  );
  if (targetIndex === -1) {
    showPickupToast("Выберите игрока для выстрела.");
    return true;
  }
  const dist = Math.abs(attacker.x - gridX) + Math.abs(attacker.y - gridY);
  if (dist > BALLISTA_RANGE) {
    showPickupToast("Цель слишком далеко для баллисты.");
    return true;
  }
  if ((attacker.boltCount || 0) <= 0) {
    showPickupToast("Нет болтов для баллисты.");
    cancelBallistaMode(ballistaModePlayerIndex);
    return true;
  }
  const target = players[targetIndex];
  const damage = Math.floor(Math.random() * (BALLISTA_DAMAGE_MAX - BALLISTA_DAMAGE_MIN + 1)) + BALLISTA_DAMAGE_MIN;
  const beforeArmy = Math.max(0, target.pocket.army || 0);
  const killed = Math.min(beforeArmy, damage);
  target.pocket.army = beforeArmy - killed;
  attacker.boltCount -= 1;
  updatePlayerResources(ballistaModePlayerIndex);
  updatePlayerResources(targetIndex);
  updateInventory(ballistaModePlayerIndex);
  showPickupToast(`Баллиста: -${killed} войск в кармане противника.`);
  ballistaModePlayerIndex = null;
  endTurn();
  return true;
}

function updateInventory(playerIndex) {
  const panel = inventoryPanels[playerIndex];
  const player = players[playerIndex];
  if (!panel || !player) return;
  const hidden = isPlayerInfoHidden(playerIndex);
  panel.classList.toggle("info-hidden", hidden);
  const itemsRoot = panel.querySelector(".inventory-items");
  if (!itemsRoot) return;
  if (hidden) {
    itemsRoot.innerHTML = '<div class="inventory-empty">Скрыто</div>';
    return;
  }
  itemsRoot.innerHTML = "";
  INVENTORY_ITEMS.forEach(item => {
    const count = item.count ? item.count(player) : 0;
    if (!count) return;
    const entry = document.createElement("div");
    entry.className = "inventory-item";
    const icon = document.createElement("img");
    icon.className = "inventory-icon";
    icon.src = `assets/icons/${item.icon}`;
    icon.alt = item.label;
    const label = document.createElement("span");
    label.textContent = count > 1 ? `${item.label} ×${count}` : item.label;
    entry.appendChild(icon);
    entry.appendChild(label);
    if (item.useAction) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inventory-use";
      if (item.useAction === "ballista" && ballistaModePlayerIndex === playerIndex) {
        btn.textContent = "Отменить";
        btn.addEventListener("click", () => cancelBallistaMode(playerIndex));
      } else {
        btn.textContent = "Применить";
        btn.addEventListener("click", () => applyPotion(playerIndex, item.useAction));
      }
      entry.appendChild(btn);
    }
    itemsRoot.appendChild(entry);
  });
}

function updatePlayerResources(playerIndex) {
  const player = players[playerIndex];
  const panel = playerPanels[playerIndex];
  if (!player || !panel) return;
  const hidden = isPlayerInfoHidden(playerIndex);
  panel.classList.toggle("info-hidden", hidden);
  if (hidden) {
    maskPlayerPanel(panel);
    updateInventory(playerIndex);
    return;
  }
  panel.querySelector('[data-stat="gold"]').textContent = player.resources.gold;
  panel.querySelector('[data-stat="army"]').textContent = player.resources.army;
  panel.querySelector('[data-stat="influence"]').textContent = player.resources.influence;
  panel.querySelector('[data-stat="resources"]').textContent = player.resources.resources;
  panel.querySelector('[data-stat="pocket-gold"]').textContent = player.pocket.gold;
  panel.querySelector('[data-stat="pocket-army"]').textContent = player.pocket.army;
  panel.querySelector('[data-stat="pocket-resources"]').textContent = player.pocket.resources;
  const incomeSpan = panel.querySelector('[data-income="resources"]');
  if (incomeSpan) {
    incomeSpan.textContent = `+${player.income.resources}`;
  }
  const attackSpan = panel.querySelector('[data-stat="attack"]');
  if (attackSpan) {
    attackSpan.textContent = player.attack;
  }
  const killsSpan = panel.querySelector('[data-stat="barbarian-kills"]');
  if (killsSpan) {
    killsSpan.textContent = player.barbarianKills || 0;
  }
  const negativeSpan = panel.querySelector('[data-stat="negative-buffs"]');
  if (negativeSpan) {
    const parts = [];
    if ((player.slowTurnsRemaining || 0) > 0) parts.push(`Замедление ${player.slowTurnsRemaining}`);
    if ((player.noDoubleTurnsRemaining || 0) > 0) parts.push(`Без дубля ${player.noDoubleTurnsRemaining}`);
    if ((player.stunnedTurnsRemaining || 0) > 0) parts.push(`Оглушение ${player.stunnedTurnsRemaining}`);
    negativeSpan.textContent = parts.length ? parts.join(", ") : "нет";
  }
  const positiveSpan = panel.querySelector('[data-stat="positive-buffs"]');
  if (positiveSpan) {
    const parts = [];
    if ((player.invisTurnsRemaining || 0) > 0) parts.push(`Невидимость ${player.invisTurnsRemaining}`);
    if ((player.luckTurnsRemaining || 0) > 0) parts.push(`Удача ${player.luckTurnsRemaining}`);
    if ((player.stoneBonusRollsRemaining || 0) > 0) parts.push(`Ходы подряд ${player.stoneBonusRollsRemaining}`);
    positiveSpan.textContent = parts.length ? parts.join(", ") : "нет";
  }
  const castleKey = getFirstOwnedCastleKey(playerIndex);
  const stats = castleKey ? ensureCastleStats(castleKey) : null;
  const storedArmy = stats ? (stats.storageArmy || 0) : 0;
  const armySpan = panel.querySelector('[data-stat="army"]');
  if (armySpan) {
    armySpan.textContent = String(storedArmy);
  }
  updateInventory(playerIndex);
}

function depositPocketCurrencyToPlayer(playerIndex) {
  const player = players[playerIndex];
  if (!player) return;
  const parts = [];
  if (player.pocket.gold > 0) {
    player.resources.gold += player.pocket.gold;
    parts.push(`+${player.pocket.gold} золота`);
    player.pocket.gold = 0;
  }
  if (player.pocket.resources > 0) {
    player.resources.resources += player.pocket.resources;
    parts.push(`+${player.pocket.resources} ресурсов`);
    player.pocket.resources = 0;
  }
  if (parts.length) {
    updatePlayerResources(playerIndex);
    showPickupToast(`В замок: ${parts.join(", ")}`);
  }
}
players.forEach((_, index) => {
  recalcPlayerResourceIncome(index);
  updatePlayerResources(index);
});

function showPickupToast(text) {
  const localIndex = getLocalPlayerIndex();
  if (localIndex !== null && localIndex !== currentPlayerIndex) {
    return;
  }
  pickupText.textContent = text;
  pickupToast.style.display = "flex";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    pickupToast.style.display = "none";
  }, 2000);
}

function showDoubleToast() {
  if (!doubleToast) return;
  const text = doubleToast.querySelector(".double-toast-text");
  doubleToast.style.display = "flex";
  if (text) {
    text.classList.remove("animate");
    void text.offsetWidth;
    text.classList.add("animate");
  }
  setTimeout(() => {
    doubleToast.style.display = "none";
    if (text) text.classList.remove("animate");
  }, 2700);
  if (!doubleSound) {
    doubleSound = document.getElementById("doubleSound") || new Audio("assets/sfx/double.mp3");
  }
  doubleSound.currentTime = 0;
  doubleSound.play().catch(() => {});
}

function simulateArmyExchange(attackerCurrent, defenderCurrent, attackerInitial, defenderInitial) {
  const attackerThreshold = Math.max(1, Math.round(attackerInitial * 0.07));
  const defenderThreshold = Math.max(1, Math.round(defenderInitial * 0.07));
  let attackerRemaining = attackerCurrent;
  let defenderRemaining = defenderCurrent;
  while (attackerRemaining > attackerThreshold && defenderRemaining > defenderThreshold &&
    attackerRemaining > 0 && defenderRemaining > 0) {
    const attackerLossCap = Math.max(1, attackerRemaining - attackerThreshold);
    const defenderLossCap = Math.max(1, defenderRemaining - defenderThreshold);
    const attackerLoss = Math.min(attackerLossCap, Math.floor(Math.random() * 3) + 1);
    const defenderLoss = Math.min(defenderLossCap, Math.floor(Math.random() * 3) + 1);
    attackerRemaining = Math.max(attackerThreshold, attackerRemaining - attackerLoss);
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - defenderLoss);
    if (attackerRemaining === attackerThreshold && defenderRemaining === defenderThreshold) {
      break;
    }
  }
  return {attackerRemaining, defenderRemaining, attackerThreshold, defenderThreshold};
}

const worldDangerModal = document.getElementById("worldDangerModal");
const worldDangerClose = document.getElementById("worldDangerClose");
let worldDangerShown = false;
const devTurnInput = document.getElementById("devTurnInput");
const devTurnApply = document.getElementById("devTurnApply");
const devSkipInput = document.getElementById("devSkipInput");
const devSkipApply = document.getElementById("devSkipApply");
const testModeBtn = document.getElementById("testModeBtn");
const disableTestModeBtn = document.getElementById("disableTestModeBtn");
const disableRobbersBtn = document.getElementById("disableRobbersBtn");
const enableRobbersBtn = document.getElementById("enableRobbersBtn");
let robbersEnabled = false;

function showWorldDangerModal() {
  if (!worldDangerModal) return;
  worldDangerModal.style.display = "flex";
}

function hideWorldDangerModal() {
  if (!worldDangerModal) return;
  worldDangerModal.style.display = "none";
}

if (worldDangerClose) {
  worldDangerClose.addEventListener("click", hideWorldDangerModal);
}
if (worldDangerModal) {
  worldDangerModal.addEventListener("click", event => {
    if (event.target === worldDangerModal) {
      hideWorldDangerModal();
    }
  });
}

const mageModal = document.getElementById("mageModal");
const mageCancelBtn = document.getElementById("mageCancelBtn");
const mageActionButtons = mageModal ? Array.from(mageModal.querySelectorAll("[data-mage-action]")) : [];
let pendingMageSlot = null;
let pendingMagePlayerIndex = null;
let pendingStoneKey = null;
let pendingStonePlayerIndex = null;
let pendingMasterPlayerIndex = null;

function getMageActionCost(action) {
  if (action === "slow") return MAGE_SLOW_COST;
  if (action === "no-double") return MAGE_NO_DOUBLE_COST;
  if (action === "poison") return MAGE_POISON_COST;
  if (action === "flower-gold") return 1000;
  return null;
}

function updateMageActionButtons(playerIndex) {
  if (!mageActionButtons.length) return;
  const player = players[playerIndex];
  mageActionButtons.forEach(btn => {
    const action = btn.dataset.mageAction;
    const baseCost = getMageActionCost(action);
    if (!player || (baseCost === null && action !== "flower-infl" && action !== "clover-luck")) {
      btn.disabled = true;
      return;
    }
    if (action === "flower-infl") {
      btn.disabled = (player.flowerCount || 0) <= 0;
      return;
    }
    if (action === "flower-gold") {
      btn.disabled = (player.flowerCount || 0) <= 0;
      return;
    }
    if (action === "clover-luck") {
      btn.disabled = (player.cloverCount || 0) <= 0;
      return;
    }
    const cost = getDiscountedGoldCost(player, baseCost);
    if (action === "slow" || action === "no-double") {
      setTradePrice(btn, goldPriceHtml(cost));
    }
    if (action === "poison") {
      setTradePrice(
        btn,
        `<img class="price-icon" src="assets/icons/icon-gold.png" alt="Золото" />Цена: ${cost} золота + ` +
          `<img class="price-icon" src="assets/icons/mystic_flower.png" alt="Таинственный цветок" />Таинственный цветок`
      );
    }
    const needsFlower = action === "poison";
    const hasFlower = (player.flowerCount || 0) > 0;
    btn.disabled = getTotalGold(player) < cost || (needsFlower && !hasFlower);
  });
}

function getOpponentIndex(playerIndex) {
  return (playerIndex + 1) % players.length;
}

function openMageModal(slot, playerIndex) {
  if (!mageModal || !slot) return;
  pendingMageSlot = slot;
  pendingMagePlayerIndex = playerIndex;
  updateMageActionButtons(playerIndex);
  mageModal.style.display = "flex";
}

function closeMageModal() {
  if (!mageModal) return;
  pendingMageSlot = null;
  pendingMagePlayerIndex = null;
  mageModal.style.display = "none";
}

function handleMageAction(action) {
  if (!pendingMageSlot || pendingMagePlayerIndex === null) return;
  const player = players[pendingMagePlayerIndex];
  if (!player) return;
  const opponent = players[getOpponentIndex(pendingMagePlayerIndex)];
  if (action === "flower-infl") {
    if ((player.flowerCount || 0) <= 0) {
      showPickupToast("Нужен таинственный цветок.");
      return;
    }
    player.flowerCount -= 1;
    player.resources.influence += 300;
    updatePlayerResources(pendingMagePlayerIndex);
    showPickupToast("Таинственный цветок обменян на 300 влияния.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "flower-infl");
    flashPrice(btn, 1, "assets/icons/mystic_flower.png", "Таинственный цветок");
    return;
  }
  if (action === "flower-gold") {
    if ((player.flowerCount || 0) <= 0) {
      showPickupToast("Нужен таинственный цветок.");
      return;
    }
    player.flowerCount -= 1;
    player.pocket.gold += 1000;
    updatePlayerResources(pendingMagePlayerIndex);
    showPickupToast("Таинственный цветок обменян на 1000 золота.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "flower-gold");
    flashPrice(btn, 1, "assets/icons/mystic_flower.png", "Таинственный цветок");
    return;
  }
  if (action === "clover-luck") {
    if ((player.cloverCount || 0) <= 0) {
      showPickupToast("Нужен клевер.");
      return;
    }
    player.cloverCount -= 1;
    player.luckPotionCount = (player.luckPotionCount || 0) + 1;
    updatePlayerResources(pendingMagePlayerIndex);
    showPickupToast("Зелье удачи добавлено в инвентарь.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "clover-luck");
    flashPrice(btn, 1, "assets/icons/clover.png", "Клевер");
    return;
  }
  const baseCost = getMageActionCost(action);
  const cost = baseCost === null ? null : getDiscountedGoldCost(player, baseCost);
  if (cost === null || getTotalGold(player) < cost) {
    showPickupToast("Не хватает золота.");
    return;
  }
  if (action === "poison" && (player.flowerCount || 0) <= 0) {
    showPickupToast("Нужен таинственный цветок.");
    return;
  }
  spendGold(player, cost);
  if (action === "slow") {
    if (opponent) opponent.slowTurnsRemaining = MAGE_SLOW_DURATION;
    showPickupToast("Противник замедлен на 25 ходов.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "slow");
    flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
  } else if (action === "no-double") {
    if (opponent) opponent.noDoubleTurnsRemaining = MAGE_NO_DOUBLE_DURATION;
    showPickupToast("Двойной ход отменен на 25 ходов.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "no-double");
    flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
  } else if (action === "poison") {
    player.flowerCount = Math.max(0, (player.flowerCount || 0) - 1);
    player.poisonCount = (player.poisonCount || 0) + 1;
    showPickupToast("Яд добавлен в инвентарь.");
    const btn = mageActionButtons.find(b => b.dataset.mageAction === "poison");
    flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    flashPrice(btn, 1, "assets/icons/mystic_flower.png", "Таинственный цветок");
  }
  updatePlayerResources(pendingMagePlayerIndex);
}

mageActionButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    handleMageAction(btn.dataset.mageAction);
  });
});

if (mageCancelBtn) {
  mageCancelBtn.addEventListener("click", closeMageModal);
}

if (mageModal) {
  mageModal.addEventListener("click", event => {
    if (event.target === mageModal) {
      closeMageModal();
    }
  });
}

function openStoneModal(key, playerIndex) {
  if (!stoneModal) return;
  pendingStoneKey = key;
  pendingStonePlayerIndex = playerIndex;
  stoneModal.style.display = "flex";
}

function closeStoneModal() {
  if (!stoneModal) return;
  pendingStoneKey = null;
  pendingStonePlayerIndex = null;
  stoneModal.style.display = "none";
}

function openStoneResultModal(text) {
  if (!stoneResultModal || !stoneResultText) return;
  stoneResultText.textContent = text;
  stoneResultModal.style.display = "flex";
}

function closeStoneResultModal() {
  if (!stoneResultModal) return;
  stoneResultModal.style.display = "none";
}

function openTrollCaveModal(text) {
  if (!trollCaveModal || !trollCaveText) return;
  trollCaveText.textContent = text;
  trollCaveModal.style.display = "flex";
}

function closeTrollCaveModal() {
  if (!trollCaveModal) return;
  trollCaveModal.style.display = "none";
}

function applyStoneEffect(playerIndex) {
  const player = players[playerIndex];
  if (!player) return;
  const effects = ["gold", "influence", "army", "ring", "bonus-rolls", "slow-curse", "plague"];
  const choice = effects[Math.floor(Math.random() * effects.length)];
  if (choice === "gold") {
    player.pocket.gold += 500;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Вы получили 500 золота в карман.");
    return;
  }
  if (choice === "influence") {
    player.resources.influence += 150;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Вы получили 150 влияния.");
    return;
  }
  if (choice === "army") {
    player.pocket.army += 15;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Люди тянутся к вам: вы получили 15 войск в карман.");
    return;
  }
  if (choice === "ring") {
    player.ringCount = (player.ringCount || 0) + 1;
    updatePlayerResources(playerIndex);
    openStoneResultModal("Камень раскалывается, и вы находите Кольцо убеждения.");
    return;
  }
  if (choice === "slow-curse") {
    player.slowTurnsRemaining = Math.max(player.slowTurnsRemaining || 0, 12);
    updatePlayerResources(playerIndex);
    openStoneResultModal("На вас проклятие замедления: -3 к броску на 12 ходов.");
    return;
  }
  if (choice === "plague") {
    let lost = 0;
    if (player.pocket.army > 0) {
      lost = Math.min(10, player.pocket.army);
      player.pocket.army -= lost;
    } else {
      const castleKey = getFirstOwnedCastleKey(playerIndex);
      if (castleKey) {
        const stats = ensureCastleStats(castleKey);
        const stored = stats.storageArmy || 0;
        if (stored > 0) {
          lost = Math.min(10, stored);
          stats.storageArmy = stored - lost;
          if (castleModalKey === castleKey && castleModalPlayerIndex === playerIndex) {
            refreshCastleModal(castleKey, playerIndex);
          }
        }
      }
    }
    updatePlayerResources(playerIndex);
    openStoneResultModal(lost > 0
      ? `Чума постигла ваши войска: потеряно ${lost} войск.`
      : "Чума постигла ваши войска, но потерь нет.");
    return;
  }
  player.stoneBonusRollsRemaining = 5;
  updatePlayerResources(playerIndex);
  openStoneResultModal("Вы ходите 5 раз подряд.");
}

if (stoneTouchBtn) {
  stoneTouchBtn.addEventListener("click", () => {
    if (pendingStoneKey) {
      clearStone(pendingStoneKey);
    }
    if (pendingStoneKey && pendingStonePlayerIndex !== null) {
      applyStoneEffect(pendingStonePlayerIndex);
    }
    closeStoneModal();
  });
}

if (stoneCloseBtn) {
  stoneCloseBtn.addEventListener("click", closeStoneModal);
}

if (stoneModal) {
  stoneModal.addEventListener("click", event => {
    if (event.target === stoneModal) {
      closeStoneModal();
    }
  });
}

if (stoneResultClose) {
  stoneResultClose.addEventListener("click", closeStoneResultModal);
}

if (stoneResultModal) {
  stoneResultModal.addEventListener("click", event => {
    if (event.target === stoneResultModal) {
      closeStoneResultModal();
    }
  });
}

if (trollCaveClose) {
  trollCaveClose.addEventListener("click", closeTrollCaveModal);
}

if (trollCaveModal) {
  trollCaveModal.addEventListener("click", event => {
    if (event.target === trollCaveModal) {
      closeTrollCaveModal();
    }
  });
}

function openMasterModal(playerIndex) {
  if (!masterModal || !masterBuyHilt) return;
  const player = players[playerIndex];
  const totalResources = getTotalResources(player);
  masterBuyHilt.disabled = !player || totalResources < 800;
  if (masterBuyGold) {
    masterBuyGold.disabled = !player || totalResources < 800;
  }
  if (masterBuyToken) {
    masterBuyToken.disabled = !player || getTotalGold(player) < 1500;
  }
  if (masterBuyGoldRainbow) {
    masterBuyGoldRainbow.disabled = !player || (player.rainbowStoneCount || 0) <= 0;
  }
  if (masterBuyTerrorRing) {
    masterBuyTerrorRing.disabled = !player || (player.ringCount || 0) <= 0;
  }
  masterModal.style.display = "flex";
  pendingMasterPlayerIndex = playerIndex;
}

function closeMasterModal() {
  if (!masterModal) return;
  masterModal.style.display = "none";
  pendingMasterPlayerIndex = null;
}

if (masterBuyHilt) {
  masterBuyHilt.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player) return;
    const totalResources = getTotalResources(player);
    if (totalResources < 800) return;
    spendResources(player, 800);
    player.heroHiltCount = (player.heroHiltCount || 0) + 1;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Рукоять меча героя получена.");
    flashPrice(masterBuyHilt, 800, "assets/icons/icon-resources.png", "Ресурсы");
  });
}

if (masterBuyGold) {
  masterBuyGold.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player) return;
    const totalResources = getTotalResources(player);
    if (totalResources < 800) return;
    spendResources(player, 800);
    player.pocket.gold += 1500;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Получено 1500 золота.");
    flashPrice(masterBuyGold, 800, "assets/icons/icon-resources.png", "Ресурсы");
  });
}

if (masterBuyToken) {
  masterBuyToken.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player) return;
    if (getTotalGold(player) < 1500) return;
    spendGold(player, 1500);
    player.tokenCount = (player.tokenCount || 0) + 1;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Жетон получен.");
    flashPrice(masterBuyToken, 1500, "assets/icons/icon-gold.png", "Золото");
  });
}

if (masterBuyGoldRainbow) {
  masterBuyGoldRainbow.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player || (player.rainbowStoneCount || 0) <= 0) return;
    player.rainbowStoneCount -= 1;
    player.pocket.gold += 1000;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Получено 1000 золота.");
    flashPrice(masterBuyGoldRainbow, 1, "assets/icons/rainbow_stone.png", "Радужный камень");
  });
}

if (masterBuyTerrorRing) {
  masterBuyTerrorRing.addEventListener("click", () => {
    if (pendingMasterPlayerIndex === null) return;
    const player = players[pendingMasterPlayerIndex];
    if (!player || (player.ringCount || 0) <= 0) return;
    player.ringCount -= 1;
    player.terrorRingCount = (player.terrorRingCount || 0) + 1;
    player.attack += 8;
    updatePlayerResources(pendingMasterPlayerIndex);
    showPickupToast("Кольцо ужаса получено.");
    flashPrice(masterBuyTerrorRing, 1, "assets/icons/ring_persuasion.png", "Кольцо убеждения");
  });
}

if (masterCloseBtn) {
  masterCloseBtn.addEventListener("click", closeMasterModal);
}

if (masterModal) {
  masterModal.addEventListener("click", event => {
    if (event.target === masterModal) {
      closeMasterModal();
    }
  });
}

const cityPoisonBtn = document.querySelector('[data-city-poison="apply-poison"]');

function applyDevTurnValue() {
  if (!devTurnInput) return;
  const raw = Number(devTurnInput.value);
  if (!Number.isFinite(raw)) return;
  turnCounter = Math.max(0, Math.floor(raw));
  updateTurnUI();
}

function skipDevTurns() {
  if (!devSkipInput) return;
  const raw = Number(devSkipInput.value);
  if (!Number.isFinite(raw)) return;
  const count = Math.max(0, Math.floor(raw));
  for (let i = 0; i < count; i += 1) {
    if (gameEnded) break;
    endTurn();
  }
}

if (devTurnApply) {
  devTurnApply.addEventListener("click", applyDevTurnValue);
}
if (devSkipApply) {
  devSkipApply.addEventListener("click", skipDevTurns);
}

function enableTestMode() {
  testModeEnabled = true;
  players.forEach((player, index) => {
    player.resources.gold = 0;
    player.resources.army = 0;
    player.resources.influence = 0;
    player.resources.resources = 0;
    player.pocket.gold = 20000;
    player.pocket.army = 200;
    player.pocket.resources = 5000;
    updatePlayerResources(index);
  });
  showPickupToast("Тестовый режим включен.");
}

function disableTestMode() {
  testModeEnabled = false;
  players.forEach((player, index) => {
    player.resources.gold = 0;
    player.resources.army = 0;
    player.resources.influence = 0;
    player.resources.resources = 0;
    player.pocket.gold = 0;
    player.pocket.army = 0;
    player.pocket.resources = 0;
    updatePlayerResources(index);
  });
  showPickupToast("???????? ????? ????????. ??????? ????????.");
}

function updateRobberToggleButtons() {
  if (disableRobbersBtn) disableRobbersBtn.disabled = true;
  if (enableRobbersBtn) enableRobbersBtn.disabled = true;
}

function setRobbersEnabled(nextValue) {
  robbersEnabled = false;
  if (!robbersEnabled) {
    robberEvent = null;
    robberAmbushThisSession = false;
    hideRobberModal();
  }
  updateRobberToggleButtons();
  showPickupToast("Разбойники отключены.");
  if (typeof emitStateNow === "function") {
    emitStateNow(true);
  }
}


if (testModeBtn) {
  testModeBtn.addEventListener("click", enableTestMode);
}
if (disableTestModeBtn) {
  disableTestModeBtn.addEventListener("click", disableTestMode);
}
if (disableRobbersBtn) {
  disableRobbersBtn.addEventListener("click", () => setRobbersEnabled(false));
}
if (enableRobbersBtn) {
  enableRobbersBtn.addEventListener("click", () => setRobbersEnabled(true));
}
updateRobberToggleButtons();

function recalcPlayerResourceIncome(playerIndex) {
  const player = players[playerIndex];
  if (!player) return 0;
  let total = 0;
  Object.entries(castleOwnersByKey).forEach(([key, owner]) => {
    if (owner === playerIndex) {
      const stats = ensureCastleStats(key);
      if (stats.lumber && !isSpecialFeatureDisabled(playerIndex, "lumber", key)) {
        total += CASTLE_FEATURES.lumber.income;
      }
      if (stats.mine && !isSpecialFeatureDisabled(playerIndex, "mine", key)) {
        total += CASTLE_FEATURES.mine.income;
      }
      if (stats.clay && !isSpecialFeatureDisabled(playerIndex, "clay", key)) {
        total += CASTLE_FEATURES.clay.income;
      }
    }
  });
  player.income.resources = total;
  const panel = playerPanels[playerIndex];
  if (panel) {
    const incomeSpan = panel.querySelector('[data-income="resources"]');
    if (incomeSpan) {
      incomeSpan.textContent = `+${total}`;
    }
  }
  return total;
}

function collectCastleIncomes(playerIndex) {
  const player = players[playerIndex];
  if (!player) return 0;
  const income = recalcPlayerResourceIncome(playerIndex);
  if (income > 0) {
    player.resources.resources += income;
    updatePlayerResources(playerIndex);
  }
  return income;
}

let barracksPlayerIndex = null;
let lavkaPlayerIndex = null;
let workshopPlayerIndex = null;
let hirePlayerIndex = null;

const mercenaries = [];
let mercenaryIdCounter = 1;
const thieves = [];
let thiefIdCounter = 1;
const cutthroats = [];
let cutthroatIdCounter = 1;
const THIEF_SPEED = 7;
const THIEF_CASTLE_GOLD_LOSS = 1000;
const CUTTHROAT_SPEED = 5;
const CUTTHROAT_STRENGTH = 20;
const CUTTHROAT_COST = 1000;
let repairPending = null;
let gameEnded = false;

function showGameOver(winnerIndex) {
  gameEnded = true;
  if (rollBtn) rollBtn.disabled = true;
  const winnerLabel = typeof winnerIndex === "number" ? `Победил Игрок ${winnerIndex + 1}` : "Игра окончена";
  if (gameOverText) gameOverText.textContent = winnerLabel;
  if (gameOverModal) gameOverModal.style.display = "flex";
}

function getCastleBaseKeyForPos(x, y) {
  const castles = importantNodes.filter(node => node.type === "castle");
  for (const castle of castles) {
    if (x >= castle.x && x <= castle.x + 1 && y >= castle.y && y <= castle.y + 1) {
      return `${castle.x},${castle.y}`;
    }
  }
  return null;
}

function getDragonBaseKeyForPos(x, y) {
  const dragons = importantNodes.filter(node => node.type === "dragon");
  for (const dragon of dragons) {
    if (x >= dragon.x && x <= dragon.x + 1 && y >= dragon.y && y <= dragon.y + 1) {
      return `${dragon.x},${dragon.y}`;
    }
  }
  return null;
}

let gameTimerSeconds = 0;
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

if (gameTimerDisplay) {
  gameTimerDisplay.textContent = `?????: ${formatTime(gameTimerSeconds)}`;
  setInterval(() => {
    if (gameEnded) return;
    gameTimerSeconds += 1;
    gameTimerDisplay.textContent = `?????: ${formatTime(gameTimerSeconds)}`;
  }, 1000);
}

function getTotalGold(player) {
  return (player.resources.gold || 0) + (player.pocket.gold || 0);
}

function getDiscountedGoldCost(player, baseCost) {
  if (!player || !player.ringCount) return baseCost;
  const discounted = Math.round(baseCost * 0.85);
  return Math.max(0, discounted);
}

function setTradePrice(btn, html) {
  if (!btn) return;
  const price = btn.querySelector(".trade-price");
  if (price) {
    price.innerHTML = html;
  }
}

function goldPriceHtml(cost) {
  return `<img class="price-icon" src="assets/icons/icon-gold.png" alt="Золото" />Цена: ${cost} золота`;
}

function flashPrice(btn, amountText, iconSrc, iconAlt) {
  if (!btn) return;
  const target = btn.querySelector(".trade-price") || btn;
  const flash = document.createElement("span");
  flash.className = "price-flash";
  flash.innerHTML =
    `<span class="price-minus">-${amountText}</span>` +
    `<img class="price-icon" src="${iconSrc}" alt="${iconAlt || ""}" />`;
  target.appendChild(flash);
  setTimeout(() => {
    flash.remove();
  }, 900);
}

function spendGold(player, amount) {
  let remaining = Math.max(0, amount);
  const fromPocket = Math.min(player.pocket.gold || 0, remaining);
  player.pocket.gold -= fromPocket;
  remaining -= fromPocket;
  if (remaining > 0) {
    player.resources.gold = Math.max(0, (player.resources.gold || 0) - remaining);
  }
}

function getTotalResources(player) {
  return (player.resources.resources || 0) + (player.pocket.resources || 0);
}

function spendResources(player, amount) {
  let remaining = Math.max(0, amount);
  const fromPocket = Math.min(player.pocket.resources || 0, remaining);
  player.pocket.resources -= fromPocket;
  remaining -= fromPocket;
  if (remaining > 0) {
    player.resources.resources = Math.max(0, (player.resources.resources || 0) - remaining);
  }
}

function getFirstOwnedCastleKey(playerIndex) {
  return Object.keys(castleOwnersByKey).find(key => castleOwnersByKey[key] === playerIndex) || null;
}

function addArmyToOwnedCastle(playerIndex, amount) {
  const castleKey = getFirstOwnedCastleKey(playerIndex);
  if (!castleKey) return false;
  const stats = ensureCastleStats(castleKey);
  stats.storageArmy = (stats.storageArmy || 0) + amount;
  if (castleModalKey === castleKey && castleModalPlayerIndex === playerIndex) {
    refreshCastleModal(castleKey, playerIndex);
  }
  return true;
}

function grantPurchasedArmy(playerIndex, amount) {
  const player = players[playerIndex];
  if (player) {
    player.pocket.army += amount;
    showPickupToast(`В карман: +${amount} войск`);
  }
  return "pocket";
}

function ensureSwordIconOnCastle(playerIndex) {
  const key = getFirstOwnedCastleKey(playerIndex);
  if (!key) return false;
  const cell = grid[key];
  if (!cell) return false;
  if (cell.querySelector(".castle-sword")) return true;
  const icon = document.createElement("div");
  icon.className = "castle-sword";
  icon.textContent = "М";
  cell.appendChild(icon);
  return true;
}

function openBarracks(playerIndex) {
  barracksPlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const cost50 = getDiscountedGoldCost(player, 2000);
  const cost130 = getDiscountedGoldCost(player, 4000);
  barracksButtons.forEach(btn => {
    const type = btn.getAttribute("data-buy");
    if (type === "army-50") btn.disabled = gold < cost50;
    if (type === "army-130") btn.disabled = gold < cost130;
    if (type === "army-100-infl") btn.disabled = player.pocket.army < 100;
    if (type === "army-50") setTradePrice(btn, goldPriceHtml(cost50));
    if (type === "army-130") setTradePrice(btn, goldPriceHtml(cost130));
  });
  barracksModal.style.display = "flex";
}

function closeBarracks() {
  barracksModal.style.display = "none";
  barracksPlayerIndex = null;
}

barracksClose.addEventListener("click", closeBarracks);
barracksModal.addEventListener("click", (e) => {
  if (e.target === barracksModal) closeBarracks();
});

barracksButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (barracksPlayerIndex === null) return;
    const player = players[barracksPlayerIndex];
    const type = btn.getAttribute("data-buy");
    if (type === "army-50") {
      const cost = getDiscountedGoldCost(player, 2000);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      grantPurchasedArmy(barracksPlayerIndex, 50);
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "army-130") {
      const cost = getDiscountedGoldCost(player, 4000);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      grantPurchasedArmy(barracksPlayerIndex, 130);
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "army-100-infl") {
      if (player.pocket.army < 100) return;
      player.pocket.army -= 100;
      player.resources.influence += 300;
      showPickupToast("Получено 300 влияния.");
      flashPrice(btn, 100, "assets/icons/icon-army.png", "Войска");
    }
    updatePlayerResources(barracksPlayerIndex);
    openBarracks(barracksPlayerIndex);
  });
});

function openLavka(playerIndex) {
  lavkaPlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const cost50 = getDiscountedGoldCost(player, 800);
  const cost100 = getDiscountedGoldCost(player, 1200);
  const costPotion = getDiscountedGoldCost(player, 250);
  lavkaButtons.forEach(btn => {
    const type = btn.getAttribute("data-lavka-buy");
    if (type === "res-50") btn.disabled = gold < cost50;
    if (type === "res-100") btn.disabled = gold < cost100;
    if (type === "res-1000-infl") btn.disabled = getTotalResources(player) < 1000;
    if (type === "potion-invis") btn.disabled = gold < costPotion;
    if (type === "potion-luck") btn.disabled = gold < costPotion;
    if (type === "res-50") setTradePrice(btn, goldPriceHtml(cost50));
    if (type === "res-100") setTradePrice(btn, goldPriceHtml(cost100));
    if (type === "potion-invis") setTradePrice(btn, goldPriceHtml(costPotion));
    if (type === "potion-luck") setTradePrice(btn, goldPriceHtml(costPotion));
  });
  lavkaModal.style.display = "flex";
}

function closeLavka() {
  lavkaModal.style.display = "none";
  lavkaPlayerIndex = null;
}

lavkaClose.addEventListener("click", closeLavka);
lavkaModal.addEventListener("click", (e) => {
  if (e.target === lavkaModal) closeLavka();
});

lavkaButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (lavkaPlayerIndex === null) return;
    const player = players[lavkaPlayerIndex];
    const type = btn.getAttribute("data-lavka-buy");
    if (type === "res-50") {
      const cost = getDiscountedGoldCost(player, 800);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.resources.resources += 50;
      showPickupToast("+50 ресурсов");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "res-100") {
      const cost = getDiscountedGoldCost(player, 1200);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.resources.resources += 100;
      showPickupToast("+100 ресурсов");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "res-1000-infl") {
      if (getTotalResources(player) < 1000) return;
      spendResources(player, 1000);
      player.resources.influence += 300;
      showPickupToast("Получено 300 влияния.");
      flashPrice(btn, 1000, "assets/icons/icon-resources.png", "Ресурсы");
    }
    if (type === "potion-invis") {
      const cost = getDiscountedGoldCost(player, 250);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.invisPotionCount = (player.invisPotionCount || 0) + 1;
      showPickupToast("Зелье невидимости добавлено в инвентарь.");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "potion-luck") {
      const cost = getDiscountedGoldCost(player, 250);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.luckPotionCount = (player.luckPotionCount || 0) + 1;
      showPickupToast("Зелье удачи добавлено в инвентарь.");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    updatePlayerResources(lavkaPlayerIndex);
    openLavka(lavkaPlayerIndex);
  });
});

function openWorkshop(playerIndex) {
  workshopPlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const costArmor = getDiscountedGoldCost(player, 1500);
  const costSword = getDiscountedGoldCost(player, 2500);
  const costHeroSword = getDiscountedGoldCost(player, 5000);
  workshopButtons.forEach(btn => {
    const type = btn.getAttribute("data-workshop-buy");
    if (type === "armor") btn.disabled = gold < costArmor || player.hasArmor === true;
    if (type === "sword") btn.disabled = gold < costSword || player.hasWorkshopSword === true;
    if (type === "hero-sword") btn.disabled = gold < costHeroSword || player.hasSword === true || (player.rainbowStoneCount || 0) <= 0 || (player.heroHiltCount || 0) <= 0;
    if (type === "rainbow-infl") btn.disabled = (player.rainbowStoneCount || 0) <= 0;
    if (type === "armor") setTradePrice(btn, goldPriceHtml(costArmor));
    if (type === "sword") setTradePrice(btn, goldPriceHtml(costSword));
    if (type === "hero-sword") {
      setTradePrice(
        btn,
        `${goldPriceHtml(costHeroSword)} + <img class="price-icon" src="assets/icons/rainbow_stone.png" alt="Радужный камень" />Радужный камень + <img class="price-icon" src="assets/icons/hero_hilt.png" alt="Рукоять" />Рукоять`
      );
    }
  });
  workshopModal.style.display = "flex";
}

function closeWorkshop() {
  workshopModal.style.display = "none";
  workshopPlayerIndex = null;
}

workshopClose.addEventListener("click", closeWorkshop);
workshopModal.addEventListener("click", (e) => {
  if (e.target === workshopModal) closeWorkshop();
});

workshopButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (workshopPlayerIndex === null) return;
    const player = players[workshopPlayerIndex];
    const type = btn.getAttribute("data-workshop-buy");
    if (type === "armor" && !player.hasArmor) {
      const cost = getDiscountedGoldCost(player, 1500);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.hasArmor = true;
      player.attack += 7;
      showPickupToast("Доспехи: +7 атаки");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "sword" && !player.hasWorkshopSword) {
      const cost = getDiscountedGoldCost(player, 2500);
      if (getTotalGold(player) < cost) return;
      spendGold(player, cost);
      player.hasWorkshopSword = true;
      player.attack += 12;
      showPickupToast("Меч: +12 атаки");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "hero-sword" && !player.hasSword) {
      const cost = getDiscountedGoldCost(player, 5000);
      if (getTotalGold(player) < cost || (player.rainbowStoneCount || 0) <= 0 || (player.heroHiltCount || 0) <= 0) return;
      spendGold(player, cost);
      player.rainbowStoneCount -= 1;
      player.heroHiltCount -= 1;
      player.hasSword = true;
      ensureSwordIconOnCastle(workshopPlayerIndex);
      showPickupToast("Меч героя приобретен");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
      flashPrice(btn, 1, "assets/icons/rainbow_stone.png", "Радужный камень");
      flashPrice(btn, 1, "assets/icons/hero_hilt.png", "Рукоять");
    }
    if (type === "rainbow-infl") {
      if ((player.rainbowStoneCount || 0) <= 0) return;
      player.rainbowStoneCount -= 1;
      player.resources.influence += 300;
      showPickupToast("Получено 300 влияния.");
      flashPrice(btn, 1, "assets/icons/rainbow_stone.png", "Радужный камень");
    }
    updatePlayerResources(workshopPlayerIndex);
    openWorkshop(workshopPlayerIndex);
  });
});

function getHireBasePosition() {
  const hireNode = importantNodes.find(n => n.id === 6);
  if (!hireNode) return null;
  return { x: hireNode.x, y: hireNode.y };
}

function getMercenaryAtKey(key) {
  return mercenaries.find(entry => entry.key === key) || null;
}

function setCellToMercenary(x, y) {
  const key = `${x},${y}`;
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("important", "mercenary");
  cell.textContent = "";
  setCellIcon(cell, "mercenary_unit.png", "Наёмники");
  return true;
}

function clearMercenaryCell(x, y) {
  setCellToInactive(x, y);
}

function getCutthroatAtKey(key) {
  return cutthroats.find(entry => entry.key === key) || null;
}

function setCellToCutthroat(x, y) {
  const key = `${x},${y}`;
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("important", "cutthroat");
  cell.textContent = "";
  setCellIcon(cell, "cutthroat.png", "Головорезы");
  return true;
}

function clearCutthroatCell(x, y) {
  setCellToInactive(x, y);
}

function getThiefAtKey(key) {
  return thieves.find(entry => entry.key === key) || null;
}

function setCellToThief(x, y) {
  const key = `${x},${y}`;
  const cell = grid[key];
  if (!cell) return false;
  cell.classList.remove("inactive");
  cell.classList.add("important", "thief");
  cell.textContent = "";
  setCellIcon(cell, "thief.png", "Вор");
  return true;
}

function clearThiefCell(x, y) {
  setCellToInactive(x, y);
}

function findHireSpawnCell() {
  const base = getHireBasePosition();
  if (!base) return null;
  const candidates = [
    { x: base.x + 1, y: base.y },
    { x: base.x - 1, y: base.y },
    { x: base.x, y: base.y + 1 },
    { x: base.x, y: base.y - 1 }
  ];
  for (const pos of candidates) {
    if (pos.x < 0 || pos.x >= COLS || pos.y < 0 || pos.y >= ROWS) continue;
    const key = `${pos.x},${pos.y}`;
    const cell = grid[key];
    if (!cell) continue;
    if (!cell.classList.contains("inactive")) continue;
    if (blockedCellKeys.has(key)) continue;
    return pos;
  }
  return null;
}

function findEnemySpecialCell(playerIndex, featureKey) {
  const candidates = Object.entries(specialByPos)
    .map(([key, entry]) => ({ key, entry }))
    .filter(({ entry }) => entry.ownerIndex !== null && entry.ownerIndex !== playerIndex)
    .filter(({ entry }) => entry.featureKey === featureKey)
    .filter(({ entry }) => entry.disabled !== true);
  if (candidates.length === 0) return null;
  return candidates[0];
}

function findEnemyCastleKey(playerIndex) {
  const opponentIndex = getOpponentIndex(playerIndex);
  return getFirstOwnedCastleKey(opponentIndex);
}

function spawnMercenary(playerIndex, featureKey, strength, baseCost) {
  const target = findEnemySpecialCell(playerIndex, featureKey);
  if (!target) {
    showPickupToast("Нет доступной вражеской клетки для атаки.");
    return false;
  }
  const spawnPos = findHireSpawnCell();
  if (!spawnPos) {
    showPickupToast("Нет места рядом для наёмников.");
    return false;
  }
  const player = players[playerIndex];
  const cost = getDiscountedGoldCost(player, baseCost);
  if (getTotalGold(player) < cost) {
    showPickupToast("Не хватает золота.");
    return false;
  }
  spendGold(player, cost);
  updatePlayerResources(playerIndex);

  const key = `${spawnPos.x},${spawnPos.y}`;
  setCellToMercenary(spawnPos.x, spawnPos.y);
  mercenaries.push({
    id: mercenaryIdCounter++,
    key,
    x: spawnPos.x,
    y: spawnPos.y,
    ownerIndex: playerIndex,
    targetKey: target.key,
    featureKey,
    strength
  });
  showPickupToast("Наёмники отправлены.");
  return true;
}

function spawnThief(playerIndex) {
  const targetKey = findEnemyCastleKey(playerIndex);
  if (!targetKey) {
    showPickupToast("РќРµС‚ РІСЂР°Р¶РµСЃРєРѕРіРѕ Р·Р°РјРєР° РґР»СЏ РІРѕСЂР°.");
    return false;
  }
  const spawnPos = findHireSpawnCell();
  if (!spawnPos) {
    showPickupToast("РќРµС‚ РјРµСЃС‚Р° СЂСЏРґРѕРј РґР»СЏ РІРѕСЂР°.");
    return false;
  }
  const player = players[playerIndex];
  if ((player.tokenCount || 0) < 1) {
    showPickupToast("РќСѓР¶РµРЅ 1 Р¶РµС‚РѕРЅ.");
    return false;
  }
  player.tokenCount -= 1;
  updatePlayerResources(playerIndex);

  const key = `${spawnPos.x},${spawnPos.y}`;
  setCellToThief(spawnPos.x, spawnPos.y);
  thieves.push({
    id: thiefIdCounter++,
    key,
    x: spawnPos.x,
    y: spawnPos.y,
    ownerIndex: playerIndex,
    targetKey
  });
  showPickupToast("Р’РѕСЂ РѕС‚РїСЂР°РІР»РµРЅ.");
  return true;
}

function spawnCutthroat(playerIndex) {
  const spawnPos = findHireSpawnCell();
  if (!spawnPos) {
    showPickupToast("Нет места рядом для наемников.");
    return false;
  }
  const player = players[playerIndex];
  const cost = getDiscountedGoldCost(player, CUTTHROAT_COST);
  if (getTotalGold(player) < cost) {
    showPickupToast("Не хватает золота.");
    return false;
  }
  spendGold(player, cost);
  updatePlayerResources(playerIndex);
  const key = `${spawnPos.x},${spawnPos.y}`;
  setCellToCutthroat(spawnPos.x, spawnPos.y);
  cutthroats.push({
    id: cutthroatIdCounter++,
    key,
    x: spawnPos.x,
    y: spawnPos.y,
    ownerIndex: playerIndex,
    targetPlayerIndex: getOpponentIndex(playerIndex),
    strength: CUTTHROAT_STRENGTH
  });
  showPickupToast("Головорезы отправлены.");
  return true;
}

function openHire(playerIndex) {
  hirePlayerIndex = playerIndex;
  const player = players[playerIndex];
  const gold = getTotalGold(player);
  const costLumber = getDiscountedGoldCost(player, 500);
  const costMine = getDiscountedGoldCost(player, 750);
  const costClay = getDiscountedGoldCost(player, 1200);
  const costCutthroat = getDiscountedGoldCost(player, CUTTHROAT_COST);
  const hasEnemyCastle = Boolean(findEnemyCastleKey(playerIndex));
  hireButtons.forEach(btn => {
    const type = btn.getAttribute("data-hire");
    const hasTarget = Boolean(findEnemySpecialCell(playerIndex, type));
    if (type === "lumber") btn.disabled = gold < costLumber || !hasTarget;
    if (type === "mine") btn.disabled = gold < costMine || !hasTarget;
    if (type === "clay") btn.disabled = gold < costClay || !hasTarget;
    if (type === "thief") btn.disabled = (player.tokenCount || 0) < 1 || !hasEnemyCastle;
    if (type === "cutthroat") btn.disabled = gold < costCutthroat;
    if (type === "lumber") setTradePrice(btn, goldPriceHtml(costLumber));
    if (type === "mine") setTradePrice(btn, goldPriceHtml(costMine));
    if (type === "clay") setTradePrice(btn, goldPriceHtml(costClay));
    if (type === "thief") {
      setTradePrice(
        btn,
        '<img class="price-icon" src="assets/icons/token.png" alt="Жетон" />Цена: 1 жетон'
      );
    }
    if (type === "cutthroat") setTradePrice(btn, goldPriceHtml(costCutthroat));
  });
  hireModal.style.display = "flex";
}

function closeHire() {
  hireModal.style.display = "none";
  hirePlayerIndex = null;
}

hireClose.addEventListener("click", closeHire);
hireModal.addEventListener("click", (e) => {
  if (e.target === hireModal) closeHire();
});

  hireButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (hirePlayerIndex === null) return;
      const type = btn.getAttribute("data-hire");
      const player = players[hirePlayerIndex];
      const costLumber = getDiscountedGoldCost(player, 500);
      const costMine = getDiscountedGoldCost(player, 750);
      const costClay = getDiscountedGoldCost(player, 1200);
      const costCutthroat = getDiscountedGoldCost(player, CUTTHROAT_COST);
      if (type === "lumber") {
      const ok = spawnMercenary(hirePlayerIndex, "lumber", 15, 500);
      if (ok) flashPrice(btn, costLumber, "assets/icons/icon-gold.png", "Золото");
      }
      if (type === "mine") {
      const ok = spawnMercenary(hirePlayerIndex, "mine", 25, 750);
      if (ok) flashPrice(btn, costMine, "assets/icons/icon-gold.png", "Золото");
      }
      if (type === "clay") {
      const ok = spawnMercenary(hirePlayerIndex, "clay", 50, 1200);
      if (ok) flashPrice(btn, costClay, "assets/icons/icon-gold.png", "Золото");
      }
      if (type === "thief") {
      const ok = spawnThief(hirePlayerIndex);
      if (ok) flashPrice(btn, 1, "assets/icons/token.png", "Жетон");
      }
      if (type === "cutthroat") {
      const ok = spawnCutthroat(hirePlayerIndex);
      if (ok) flashPrice(btn, costCutthroat, "assets/icons/icon-gold.png", "Золото");
      }
      openHire(hirePlayerIndex);
    });
  });

function openRepairModal(entry, playerIndex) {
  if (!entry || !repairModal || !repairConfirm) return;
  let cost = 0;
  let label = "ресурс";
  if (entry.featureKey === "lumber") {
    cost = 25;
    label = "лесопилку";
  }
    if (entry.featureKey === "mine") {
      cost = 100;
    label = "шахту";
  }
    if (entry.featureKey === "clay") {
      cost = 150;
    label = "глиняный карьер";
  }
  const player = players[playerIndex];
  const total = getTotalResources(player);
  if (repairText) {
    repairText.textContent = `Починить ${label} за ${cost} ресурсов?`;
  }
  setTradePrice(repairConfirm, `<img class="price-icon" src="assets/icons/icon-resources.png" alt="Ресурсы" />Цена: ${cost} ресурсов`);
  repairConfirm.disabled = total < cost;
  repairModal.style.display = "flex";
  repairPending = { key: entry.key || `${entry.x},${entry.y}`, cost, playerIndex, entry };
}

function closeRepairModal() {
  if (repairModal) repairModal.style.display = "none";
  repairPending = null;
}

if (repairCancel) {
  repairCancel.addEventListener("click", closeRepairModal);
}
if (repairModal) {
  repairModal.addEventListener("click", (e) => {
    if (e.target === repairModal) closeRepairModal();
  });
}
  if (repairConfirm) {
  repairConfirm.addEventListener("click", () => {
    if (!repairPending) return;
    const player = players[repairPending.playerIndex];
    if (!player) return;
    if (getTotalResources(player) < repairPending.cost) return;
    spendResources(player, repairPending.cost);
    setSpecialCellDisabled(repairPending.key, false);
    if (repairPending.entry && repairPending.entry.featureKey) {
      applySpecialFeatureIcon(repairPending.entry.x, repairPending.entry.y, repairPending.entry.featureKey);
    }
    recalcPlayerResourceIncome(repairPending.playerIndex);
    updatePlayerResources(repairPending.playerIndex);
    showPickupToast("Ресурс восстановлен.");
    closeRepairModal();
    flashPrice(repairConfirm, repairPending.cost, "assets/icons/icon-resources.png", "Ресурсы");
  });
}

function openContextForKey(key, playerIndex) {
  const [x, y] = key.split(",").map(Number);
  const castleKey = getCastleBaseKeyForPos(x, y) || key;
  const node = nodeByPos[castleKey];
  if (masterActive && key === MASTER_CELL.key) {
    openMasterModal(playerIndex);
    return;
  }
  const mageSlot = getMageSlotByKey(key);
  if (mageSlot && mageSlot.active) {
    openMageModal(mageSlot, playerIndex);
    return;
  }
  if (node && node.type === "castle") {
    const owner = castleOwnersByKey[castleKey];
    if (typeof owner === "number" && owner !== playerIndex) {
      const player = players[playerIndex];
      if (!player || player.pocket.army <= 0) {
        showPickupToast("В кармане нет войск для боя.");
        return;
      }
      const result = resolveCastleBattle(playerIndex, castleKey);
      showBattleModal(result);
      if (result.healthRemaining <= 0) {
        showGameOver(playerIndex);
      } else if (result.winnerIndex === playerIndex) {
        const ownedKey = getFirstOwnedCastleKey(playerIndex);
        if (ownedKey && ownedKey !== castleKey) {
          showPickupToast("Нельзя захватить второй замок.");
        } else {
          castleOwnersByKey[castleKey] = playerIndex;
          node.elem.classList.add("owned");
          node.elem.style.background = player.color;
          node.elem.style.borderColor = player.color;
          recalcPlayerResourceIncome(playerIndex);
        }
      }
      if (typeof owner === "number") {
        recalcPlayerResourceIncome(owner);
      }
      endTurn();
      return;
    }
  }
  if (node && node.type === "castle" && castleOwnersByKey[castleKey] === playerIndex) {
    showCastleModal(castleKey, playerIndex);
    return;
  }
  const specialEntry = specialByPos[key];
  if (specialEntry && specialEntry.disabled && specialEntry.ownerIndex === playerIndex) {
    openRepairModal({ ...specialEntry, key }, playerIndex);
    return;
  }
  if (node && node.id === 2) return openBarracks(playerIndex);
  if (node && node.id === 9) return openLavka(playerIndex);
  if (node && node.id === 19) return openWorkshop(playerIndex);
  if (node && node.id === 15) return openCity(playerIndex);
  if (node && node.id === 6) return openHire(playerIndex);
}

function isMercenaryStepAllowed(nx, ny, targetKey) {
  const key = `${nx},${ny}`;
  if (blockedCellKeys.has(key)) return false;
  if (key === targetKey) return true;
  const cell = grid[key];
  if (!cell || !cell.classList.contains("inactive")) return false;
  if (resourceByPos[key]) return false;
  if (specialByPos[key]) return false;
  if (players.some(p => p.x === nx && p.y === ny)) return false;
  if (mercenaries.some(m => m.key === key)) return false;
  return true;
}

function findMercenaryPath(startKey, targetKey, maxDepth = 25) {
  const [sx, sy] = startKey.split(",").map(Number);
  const [tx, ty] = targetKey.split(",").map(Number);
  const queue = [{ x: sx, y: sy }];
  const prev = new Map();
  const startId = `${sx},${sy}`;
  prev.set(startId, null);
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];
  let depth = 0;
  while (queue.length && depth <= maxDepth) {
    const nextQueue = [];
    for (const node of queue) {
      const key = `${node.x},${node.y}`;
      if (key === targetKey) {
        const path = [];
        let cur = key;
        while (cur && cur !== startId) {
          path.push(cur);
          cur = prev.get(cur);
        }
        path.reverse();
        return path;
      }
      for (const { dx, dy } of dirs) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nkey = `${nx},${ny}`;
        if (prev.has(nkey)) continue;
        if (!isMercenaryStepAllowed(nx, ny, targetKey)) continue;
        prev.set(nkey, key);
        nextQueue.push({ x: nx, y: ny });
      }
    }
    queue.splice(0, queue.length, ...nextQueue);
    depth += 1;
  }
  return null;
}

function moveMercenary(mercenary) {
  const target = mercenary.targetKey;
  if (mercenary.key === target) return;
  const path = findMercenaryPath(mercenary.key, target, 80);
  if (!path || path.length === 0) return;
  const steps = Math.min(5, path.length);
  for (let i = 0; i < steps; i += 1) {
    const [nx, ny] = path[i].split(",").map(Number);
    clearMercenaryCell(mercenary.x, mercenary.y);
    mercenary.x = nx;
    mercenary.y = ny;
    mercenary.key = `${nx},${ny}`;
    if (mercenary.key === target) break;
    setCellToMercenary(nx, ny);
  }
}

function disableTargetResource(targetKey) {
  const entry = specialByPos[targetKey];
  if (!entry) return;
  setSpecialCellDisabled(targetKey, true);
  const cell = grid[targetKey];
  if (cell) {
    cell.classList.remove("mercenary", "inactive");
    cell.classList.add("important", "special");
    if (entry.extraClass) cell.classList.add(entry.extraClass);
    cell.textContent = entry.label;
  }
  if (typeof entry.ownerIndex === "number") {
    recalcPlayerResourceIncome(entry.ownerIndex);
  }
}

function advanceMercenaries() {
  for (let i = mercenaries.length - 1; i >= 0; i--) {
    const mercenary = mercenaries[i];
    if (!specialByPos[mercenary.targetKey] || specialByPos[mercenary.targetKey].disabled) {
      clearMercenaryCell(mercenary.x, mercenary.y);
      mercenaries.splice(i, 1);
      continue;
    }
    moveMercenary(mercenary);
    if (mercenary.key === mercenary.targetKey) {
      disableTargetResource(mercenary.targetKey);
      showPickupToast("Наёмники вывели ресурс из строя.");
      mercenaries.splice(i, 1);
    }
  }
}

function isThiefStepAllowed(nx, ny, targetKey) {
  const key = `${nx},${ny}`;
  if (blockedCellKeys.has(key)) return false;
  if (key === targetKey) return true;
  const cell = grid[key];
  if (!cell || !cell.classList.contains("inactive")) return false;
  if (resourceByPos[key]) return false;
  if (specialByPos[key]) return false;
  if (players.some(p => p.x === nx && p.y === ny)) return false;
  if (mercenaries.some(m => m.key === key)) return false;
  if (thieves.some(t => t.key === key)) return false;
  if (cutthroats.some(c => c.key === key)) return false;
  return true;
}

function isCutthroatStepAllowed(nx, ny, targetKey) {
  const key = `${nx},${ny}`;
  if (blockedCellKeys.has(key)) return false;
  if (key === targetKey) return true;
  const cell = grid[key];
  if (!cell || !cell.classList.contains("inactive")) return false;
  if (resourceByPos[key]) return false;
  if (specialByPos[key]) return false;
  if (players.some(p => p.x === nx && p.y === ny)) return false;
  if (mercenaries.some(m => m.key === key)) return false;
  if (thieves.some(t => t.key === key)) return false;
  if (cutthroats.some(c => c.key === key)) return false;
  return true;
}

function findCutthroatPath(startKey, targetKey, maxDepth = 25) {
  const [sx, sy] = startKey.split(",").map(Number);
  const queue = [{ x: sx, y: sy }];
  const prev = new Map();
  const startId = `${sx},${sy}`;
  prev.set(startId, null);
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];
  let depth = 0;
  while (queue.length && depth <= maxDepth) {
    const nextQueue = [];
    for (const node of queue) {
      const key = `${node.x},${node.y}`;
      if (key === targetKey) {
        const path = [];
        let cur = key;
        while (cur && cur !== startId) {
          path.push(cur);
          cur = prev.get(cur);
        }
        path.reverse();
        return path;
      }
      for (const { dx, dy } of dirs) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nkey = `${nx},${ny}`;
        if (prev.has(nkey)) continue;
        if (!isCutthroatStepAllowed(nx, ny, targetKey)) continue;
        prev.set(nkey, key);
        nextQueue.push({ x: nx, y: ny });
      }
    }
    queue.splice(0, queue.length, ...nextQueue);
    depth += 1;
  }
  return null;
}

function findThiefPath(startKey, targetKey, maxDepth = 25) {
  const [sx, sy] = startKey.split(",").map(Number);
  const queue = [{ x: sx, y: sy }];
  const prev = new Map();
  const startId = `${sx},${sy}`;
  prev.set(startId, null);
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];
  let depth = 0;
  while (queue.length && depth <= maxDepth) {
    const nextQueue = [];
    for (const node of queue) {
      const key = `${node.x},${node.y}`;
      if (key === targetKey) {
        const path = [];
        let cur = key;
        while (cur && cur !== startId) {
          path.push(cur);
          cur = prev.get(cur);
        }
        path.reverse();
        return path;
      }
      for (const { dx, dy } of dirs) {
        const nx = node.x + dx;
        const ny = node.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const nkey = `${nx},${ny}`;
        if (prev.has(nkey)) continue;
    if (!isThiefStepAllowed(nx, ny, targetKey)) continue;
        prev.set(nkey, key);
        nextQueue.push({ x: nx, y: ny });
      }
    }
    queue.splice(0, queue.length, ...nextQueue);
    depth += 1;
  }
  return null;
}

function removeThiefAtIndex(index) {
  const thief = thieves[index];
  if (!thief) return;
  const node = nodeByPos[thief.key];
  if (!node || node.type !== "castle") {
    clearThiefCell(thief.x, thief.y);
  }
  thieves.splice(index, 1);
}

function moveThief(thief) {
  const target = thief.targetKey;
  if (!target || thief.key === target) return;
  const path = findThiefPath(thief.key, target, 80);
  if (!path || path.length === 0) return;
  const steps = Math.min(THIEF_SPEED, path.length);
  const targetNode = nodeByPos[target];
  const targetIsCastle = targetNode && targetNode.type === "castle";
  for (let i = 0; i < steps; i += 1) {
    const [nx, ny] = path[i].split(",").map(Number);
    clearThiefCell(thief.x, thief.y);
    thief.x = nx;
    thief.y = ny;
    thief.key = `${nx},${ny}`;
    const reachedTarget = thief.key === target;
    if (reachedTarget && targetIsCastle) break;
    setCellToThief(nx, ny);
    if (reachedTarget) break;
  }
}

function moveCutthroat(cutthroat) {
  const targetPlayer = players[cutthroat.targetPlayerIndex];
  if (!targetPlayer) return;
  const targetKey = `${targetPlayer.x},${targetPlayer.y}`;
  if (cutthroat.key === targetKey) return;
  const path = findCutthroatPath(cutthroat.key, targetKey, 80);
  if (!path || path.length === 0) return;
  const steps = Math.min(CUTTHROAT_SPEED, path.length);
  clearCutthroatCell(cutthroat.x, cutthroat.y);
  for (let i = 0; i < steps; i++) {
    const [nx, ny] = path[i].split(",").map(Number);
    cutthroat.x = nx;
    cutthroat.y = ny;
    cutthroat.key = `${nx},${ny}`;
    if (cutthroat.key === targetKey) break;
  }
  if (cutthroat.key !== targetKey) {
    setCellToCutthroat(cutthroat.x, cutthroat.y);
  }
}

function advanceCutthroats() {
  for (let i = cutthroats.length - 1; i >= 0; i--) {
    const cutthroat = cutthroats[i];
    const targetPlayer = players[cutthroat.targetPlayerIndex];
    if (!targetPlayer) {
      clearCutthroatCell(cutthroat.x, cutthroat.y);
      cutthroats.splice(i, 1);
      continue;
    }
    const targetKey = `${targetPlayer.x},${targetPlayer.y}`;
    moveCutthroat(cutthroat);
    if (cutthroat.key === targetKey) {
      const beforeArmy = Math.max(0, targetPlayer.pocket.army || 0);
      const rawDamage = Math.floor(Math.random() * (23 - 18 + 1)) + 18;
      const killed = Math.min(beforeArmy, rawDamage);
      targetPlayer.pocket.army = beforeArmy - killed;
      updatePlayerResources(cutthroat.targetPlayerIndex);
      showPickupToast(`Головорезы убили ${killed} войск игрока ${targetPlayer.id + 1}`);
      clearCutthroatCell(cutthroat.x, cutthroat.y);
      cutthroats.splice(i, 1);
    }
  }
}

function advanceThieves() {
  for (let i = thieves.length - 1; i >= 0; i--) {
    const thief = thieves[i];
    if (!thief.targetKey) {
      removeThiefAtIndex(i);
      continue;
    }
    moveThief(thief);
    if (thief.key === thief.targetKey) {
      const ownerIndex = castleOwnersByKey[thief.targetKey];
      if (typeof ownerIndex === "number" && ownerIndex !== thief.ownerIndex) {
        const targetPlayer = players[ownerIndex];
        targetPlayer.resources.gold = Math.max(
          0,
          (targetPlayer.resources.gold || 0) - THIEF_CASTLE_GOLD_LOSS
        );
        updatePlayerResources(ownerIndex);
        showPickupToast(`Вор украл ${THIEF_CASTLE_GOLD_LOSS} золота из замка.`);
      }
      removeThiefAtIndex(i);
    }
  }
}

function openCity(playerIndex) {
  const player = players[playerIndex];
  if (!player) return;
  const totalGold = (player.resources.gold || 0) + (player.pocket.gold || 0);
  const kills = player.barbarianKills || 0;
  if (cityKillsInfo) {
    cityKillsInfo.textContent = `Убито лагерей варваров: ${kills}`;
  }
  cityRewardButtons.forEach(btn => {
    const amount = btn.getAttribute("data-city-reward");
    if (amount === "5") {
      btn.disabled = kills < 5 || player.barbarianRewards.r5 === true;
    }
    if (amount === "10") {
      btn.disabled = kills < 10 || player.barbarianRewards.r10 === true;
    }
    if (amount === "20") {
      btn.disabled = kills < 20 || player.barbarianRewards.r20 === true;
    }
  });
  cityExchangeButtons.forEach(btn => {
    const amount = btn.getAttribute("data-city-exchange");
    if (amount === "100") {
      const cost = getDiscountedGoldCost(player, 1000);
      btn.disabled = totalGold < cost;
      setTradePrice(btn, goldPriceHtml(cost));
    }
    if (amount === "300") {
      const cost = getDiscountedGoldCost(player, 2500);
      btn.disabled = totalGold < cost;
      setTradePrice(btn, goldPriceHtml(cost));
    }
  });
  if (cityPoisonBtn) {
    cityPoisonBtn.disabled = (player.poisonCount || 0) <= 0;
  }
  cityModal.style.display = "flex";
  cityPlayerIndex = playerIndex;
}

function closeCity() {
  cityModal.style.display = "none";
  cityPlayerIndex = null;
}

let cityPlayerIndex = null;
cityClose.addEventListener("click", closeCity);
cityModal.addEventListener("click", (e) => {
  if (e.target === cityModal) closeCity();
});

cityRewardButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (cityPlayerIndex === null) return;
    const player = players[cityPlayerIndex];
    const amount = btn.getAttribute("data-city-reward");
    if (amount === "5" && player.barbarianKills >= 5 && !player.barbarianRewards.r5) {
      player.barbarianRewards.r5 = true;
      player.resources.gold += 1500;
      showPickupToast("Награда: +1500 золота");
    }
    if (amount === "10" && player.barbarianKills >= 10 && !player.barbarianRewards.r10) {
      player.barbarianRewards.r10 = true;
      player.resources.gold += 3000;
      showPickupToast("Награда: +3000 золота");
    }
    if (amount === "20" && player.barbarianKills >= 20 && !player.barbarianRewards.r20) {
      player.barbarianRewards.r20 = true;
      player.resources.gold += 5000;
      showPickupToast("Награда: +5000 золота");
    }
    updatePlayerResources(cityPlayerIndex);
    openCity(cityPlayerIndex);
  });
});

cityExchangeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (cityPlayerIndex === null) return;
    const player = players[cityPlayerIndex];
    const amount = btn.getAttribute("data-city-exchange");
    if (amount === "100") {
      const cost = getDiscountedGoldCost(player, 1000);
      if ((player.resources.gold + player.pocket.gold) < cost) return;
      spendGold(player, cost);
      player.resources.influence += 100;
      showPickupToast("+100 влияния");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    if (amount === "300") {
      const cost = getDiscountedGoldCost(player, 2500);
      if ((player.resources.gold + player.pocket.gold) < cost) return;
      spendGold(player, cost);
      player.resources.influence += 300;
      showPickupToast("+300 влияния");
      flashPrice(btn, cost, "assets/icons/icon-gold.png", "Золото");
    }
    updatePlayerResources(cityPlayerIndex);
    openCity(cityPlayerIndex);
  });
});

function handleCityPoisonUse() {
  if (cityPlayerIndex === null) return;
  const player = players[cityPlayerIndex];
  if (!player || !player.poisonCount) {
    showPickupToast("У вас нет яда.");
    return;
  }
  if (player.resources.influence >= POISON_INFLUENCE_THRESHOLD) {
    player.poisonCount = Math.max(0, (player.poisonCount || 0) - 1);
    updatePlayerResources(cityPlayerIndex);
    closeCity();
    showPickupToast("Яд отравил короля.");
    showGameOver(cityPlayerIndex);
  } else {
    showPickupToast(`Нужно ${POISON_INFLUENCE_THRESHOLD} влияния, чтобы яд сработал.`);
  }
}

if (cityPoisonBtn) {
  cityPoisonBtn.addEventListener("click", handleCityPoisonUse);
}

function updateGuardModalButtons(playerIndex, unlocked) {
  const player = players[playerIndex];
  if (!player) return;
  guardBribeBtn.disabled = unlocked || getTotalGold(player) < 500;
  guardInfluenceBtn.disabled = unlocked || player.resources.influence < 300;
  guardPassBtn.disabled = !unlocked;
}

function showGuardModalFor(playerIndex, x, y, unlocked) {
  pendingGuardMove = {x, y};
  pendingGuardPlayerIndex = playerIndex;
  updateGuardModalButtons(playerIndex, Boolean(unlocked));
  guardModal.style.display = "flex";
}

function hideGuardModal() {
  guardModal.style.display = "none";
  pendingGuardMove = null;
  pendingGuardPlayerIndex = null;
}

  function handleGuardDecision(type) {
    if (!pendingGuardMove || pendingGuardPlayerIndex === null) return;
    const player = players[pendingGuardPlayerIndex];
    if (!player) return;
    let success = false;
    if (type === "gold" && getTotalGold(player) >= 500) {
      spendGold(player, 500);
      success = true;
      flashPrice(guardBribeBtn, 500, "assets/icons/icon-gold.png", "Золото");
    }
    if (type === "influence" && player.resources.influence >= 300) {
      success = true;
    }
    if (!success) return;
    guardAccess[pendingGuardPlayerIndex] = true;
    updatePlayerResources(pendingGuardPlayerIndex);
    const move = pendingGuardMove;
    hideGuardModal();
    finalizeMove(move.x, move.y);
  }

  guardBribeBtn.addEventListener("click", () => handleGuardDecision("gold"));
  guardInfluenceBtn.addEventListener("click", () => handleGuardDecision("influence"));
  guardPassBtn.addEventListener("click", () => {
    if (!pendingGuardMove || pendingGuardPlayerIndex === null) return;
    const move = pendingGuardMove;
    hideGuardModal();
    finalizeMove(move.x, move.y);
  });
  guardModalCancel.addEventListener("click", hideGuardModal);
  guardModal.addEventListener("click", (event) => {
    if (event.target === guardModal) {
      hideGuardModal();
    }
  });

  function showRobberModal() {
    if (!robberModal) return;
    updateRobberModalContent();
    robberModal.style.display = "flex";
  }

  function hideRobberModal() {
    if (!robberModal) return;
    robberModal.style.display = "none";
    if (robberBribeBtn) {
      robberBribeBtn.disabled = true;
    }
  }

  function handleRobberFight() {
    if (!robberEvent) return;
    const fighterIndex = robberEvent.playerIndex ?? currentPlayerIndex;
    const result = resolveRobberBattle(fighterIndex, robberEvent.army);
    hideRobberModal();
    robberEvent = null;
    currentPlayerIndex = fighterIndex;
    updateTurnUI();
    showBattleModal(result);
    scheduleAutoRoll();
  }

function handleRobberBribe() {
  if (!robberEvent) return;
  const playerIndex = robberEvent.playerIndex ?? currentPlayerIndex;
  const player = players[playerIndex];
  const cost = robberEvent.bribeCost || 0;
  if (!player || getTotalGold(player) < cost) return;
  spendGold(player, cost);
  updatePlayerResources(playerIndex);
  showPickupToast(`Разбойникам отдано ${cost} золота, бой отменён`);
  flashPrice(robberBribeBtn, cost, "assets/icons/icon-gold.png", "Золото");
  robberEvent = null;
  hideRobberModal();
  updateTurnUI();
  scheduleAutoRoll();
}

  function updateRobberModalContent() {
    if (!robberEvent) return;
    if (robberCount) {
      robberCount.textContent = robberEvent.army;
    }
    if (robberBribeInfo) {
      robberBribeInfo.textContent = robberEvent.bribeCost;
    }
    if (robberBribeBtn) {
      const playerIndex = robberEvent.playerIndex ?? currentPlayerIndex;
      const player = players[playerIndex];
      robberBribeBtn.disabled = !player || getTotalGold(player) < robberEvent.bribeCost;
    }
  }

function shouldShowRobberModal() {
  if (!robberEvent) return false;
  if (!robbersEnabled) return false;
  const hasLocalIndex = typeof localPlayerIndex !== "undefined" && localPlayerIndex !== null;
  const compareIndex = hasLocalIndex ? localPlayerIndex : currentPlayerIndex;
  return robberEvent.playerIndex === compareIndex;
}

function updateRobberModalVisibility() {
  if (!robberModal) return;
  if (shouldShowRobberModal()) {
    updateRobberModalContent();
    robberModal.style.display = "flex";
  } else {
    hideRobberModal();
  }
}

function processRobberAmbushChance() {
  if (typeof socket !== "undefined" && socket && !isHost) return false;
  if (!robbersEnabled) return false;
  if (robberAmbushThisSession) return false;
  if (robberEvent || movesRemaining > 0) return false;
  if (turnCounter < 10) return false;
  const currentPlayer = players[currentPlayerIndex];
  if (currentPlayer) {
    const castleKey = getCastleBaseKeyForPos(currentPlayer.x, currentPlayer.y);
    if (castleKey && castleOwnersByKey[castleKey] === currentPlayerIndex) {
      return false;
    }
  }
  if (Math.random() >= ROBBER_CHANCE) return false;
  const baseArmy = Math.floor(Math.random() * 26) + 10;
  const strengthMultiplier = turnCounter >= 150 ? 1.5 : 1;
  const army = Math.max(1, Math.ceil(baseArmy * strengthMultiplier));
  const bribeCost =
      150 + Math.round(((army - 5) / 10) * (250 - 150));
  robberEvent = {playerIndex: currentPlayerIndex, army, bribeCost};
  robberAmbushThisSession = true;
    if (rollBtn) rollBtn.disabled = true;
    updateRobberModalVisibility();
    return true;
  }

  if (robberFightBtn) {
    robberFightBtn.addEventListener("click", handleRobberFight);
  }
  if (robberBribeBtn) {
    robberBribeBtn.addEventListener("click", handleRobberBribe);
  }

function resolveRobberBattle(playerIndex, armySize) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = armySize;
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Разбойники";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Разбойники";
    winnerIndex = null;
  }
  const playerWon = winnerIndex === playerIndex;
  const rewardMultiplier = turnCounter >= 150 ? 1.7 : 1;
  const goldReward = playerWon
    ? Math.floor(Math.random() * (ROBBER_GOLD_REWARD_MAX - ROBBER_GOLD_REWARD_MIN + 1)) + ROBBER_GOLD_REWARD_MIN
    : 0;
  const resourceReward = playerWon
    ? Math.floor(Math.random() * (ROBBER_RESOURCE_REWARD_MAX - ROBBER_RESOURCE_REWARD_MIN + 1)) +
      ROBBER_RESOURCE_REWARD_MIN
    : 0;
  const scaledGoldReward = Math.floor(goldReward * rewardMultiplier);
  const scaledResourceReward = Math.floor(resourceReward * rewardMultiplier);
  let penaltyGold = 0;
  let penaltyResources = 0;
  if (playerWon) {
    player.pocket.gold += scaledGoldReward;
    player.pocket.resources += scaledResourceReward;
    updatePlayerResources(playerIndex);
  } else {
    penaltyGold = Math.floor(player.pocket.gold * ROBBER_LOSS_PENALTY);
    penaltyResources = Math.floor(player.pocket.resources * ROBBER_LOSS_PENALTY);
    player.pocket.gold = Math.max(0, player.pocket.gold - penaltyGold);
    player.pocket.resources = Math.max(0, player.pocket.resources - penaltyResources);
    player.resources.influence -= ROBBER_INFLUENCE_LOSS;
    showPickupToast(
      `Разбойники: -${penaltyGold} золота, -${penaltyResources} ресурсов, влияние -${ROBBER_INFLUENCE_LOSS}`
    );
    updatePlayerResources(playerIndex);
  }
  return {
    type: "robber",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    goldReward: scaledGoldReward,
    resourceReward: scaledResourceReward,
    penaltyGold,
    penaltyResources,
    influenceLoss: playerWon ? 0 : ROBBER_INFLUENCE_LOSS
  };
}

function resolveTrollBattle(playerIndex, trollArmy) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = Math.max(0, trollArmy);
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "\u0422\u0440\u043e\u043b\u043b\u0438";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "\u0422\u0440\u043e\u043b\u043b\u0438";
    winnerIndex = null;
  }
  const playerWon = winnerIndex === playerIndex;
  if (playerWon) {
    player.trollClubCount = (player.trollClubCount || 0) + 1;
    const gotToken = Math.random() < 0.5;
    if (gotToken) {
      player.tokenCount = (player.tokenCount || 0) + 1;
    }
    player.attack += 8;
    showPickupToast("Вы получили Дубинку троллей: +8 атаки.");
    if (gotToken) {
      showPickupToast("Вы получили Жетон.");
    }
  }
  updatePlayerResources(playerIndex);
  return {
    type: "troll",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    defenderInitial: initialDefArmy
  };
}

function rollTrollCaveLoot(playerIndex) {
  const player = players[playerIndex];
  if (!player) return null;
  const scaleSteps = Math.floor((turnCounter || 0) / 75);
  const scale = 1 + (0.5 * scaleSteps);
  const gold = Math.floor(Math.random() * 301 * scale);
  const resources = Math.floor(Math.random() * 51 * scale);
  const influenceLoss = Math.floor(Math.random() * 51);
  const gotRainbow = Math.random() < 0.05;
  const gotFlower = Math.random() < 0.05;
  const gotToken = Math.random() < 0.15;
  player.pocket.gold += gold;
  player.pocket.resources += resources;
  player.resources.influence -= influenceLoss;
  if (gotRainbow) {
    player.rainbowStoneCount = (player.rainbowStoneCount || 0) + 1;
  }
  if (gotFlower) {
    player.flowerCount = (player.flowerCount || 0) + 1;
  }
  if (gotToken) {
    player.tokenCount = (player.tokenCount || 0) + 1;
  }
  updatePlayerResources(playerIndex);
  const parts = [
    `\u0417\u043e\u043b\u043e\u0442\u043e: +${gold}`,
    `\u0420\u0435\u0441\u0443\u0440\u0441\u044b: +${resources}`,
    `\u0412\u043b\u0438\u044f\u043d\u0438\u0435: -${influenceLoss}`
  ];
  if (gotRainbow) parts.push("\u0420\u0430\u0434\u0443\u0436\u043d\u044b\u0439 \u043a\u0430\u043c\u0435\u043d\u044c: \u043d\u0430\u0439\u0434\u0435\u043d");
  if (gotFlower) parts.push("\u0422\u0430\u0438\u043d\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0446\u0432\u0435\u0442\u043e\u043a: \u043d\u0430\u0439\u0434\u0435\u043d");
  if (gotToken) parts.push("\u0416\u0435\u0442\u043e\u043d: \u043d\u0430\u0439\u0434\u0435\u043d");
  return parts.join(". ");
}

function stealResources(winnerIndex, loserIndex) {
  const winner = players[winnerIndex];
  const loser = players[loserIndex];
    const stolen = {gold: 0, army: 0, resources: 0};
    ["gold", "army", "resources"].forEach(type => {
      const amount = Math.floor(loser.pocket[type] * 0.8);
      if (amount <= 0) return;
      loser.pocket[type] -= amount;
      winner.pocket[type] += amount;
      stolen[type] = amount;
    });
    updatePlayerResources(loserIndex);
    updatePlayerResources(winnerIndex);
  return stolen;
}

function resolveBarbarianBattle(playerIndex, barbarian) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = barbarian.army;
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Варвары";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Варвары";
    winnerIndex = null;
  }
  const playerWon = winnerIndex === playerIndex;
  const rewardMultiplier = turnCounter >= 150 ? 1.7 : 1;
  const influenceReward = playerWon ? Math.floor(scaleBarbarianReward(initialDefArmy, 35, 60) * rewardMultiplier) : 0;
  const goldReward = playerWon ? Math.floor(scaleBarbarianReward(initialDefArmy, 200, 350) * rewardMultiplier) : 0;
  const resourceReward = playerWon ? Math.floor(scaleBarbarianReward(initialDefArmy, 20, 35) * rewardMultiplier) : 0;
  let penaltyGold = 0;
  let penaltyResources = 0;
  if (playerWon) {
    player.resources.influence += influenceReward;
    player.pocket.gold += goldReward;
    player.pocket.resources += resourceReward;
    updatePlayerResources(playerIndex);
  } else {
    penaltyGold = Math.floor(player.pocket.gold * 0.5);
    penaltyResources = Math.floor(player.pocket.resources * 0.5);
    player.pocket.gold = Math.max(0, player.pocket.gold - penaltyGold);
    player.pocket.resources = Math.max(0, player.pocket.resources - penaltyResources);
    showPickupToast(`В карман: потери ${penaltyGold} золота, ${penaltyResources} ресурсов`);
    updatePlayerResources(playerIndex);
  }
  return {
    type: "barbarian",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    influenceReward,
    goldReward,
    resourceReward,
    penaltyGold,
    penaltyResources,
    defenderInitial: initialDefArmy
  };
}

function resolveDragonBattle(playerIndex, dragonArmy = 75) {
  const player = players[playerIndex];
  if (!player) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = Math.max(0, dragonArmy);
  let defenderRemaining = initialDefArmy;
  const heroStrike = Math.max(0, player.attack || 0);
  if (heroStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - heroStrike);
  }
  const exchange = simulateArmyExchange(initialAttArmy, defenderRemaining, initialAttArmy, initialDefArmy);
  const attackerRemaining = exchange.attackerRemaining;
  defenderRemaining = exchange.defenderRemaining;
  const attackerThreshold = exchange.attackerThreshold;
  const defenderThreshold = exchange.defenderThreshold;
  player.pocket.army = attackerRemaining;
  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Дракон";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Дракон";
    winnerIndex = null;
  }
  updatePlayerResources(playerIndex);
  return {
    type: "dragon",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex,
    defenderInitial: initialDefArmy
  };
}

function resolveBattle(attackerIndex, defenderIndex, options = {}) {
  const attacker = players[attackerIndex];
  const defender = players[defenderIndex];
  const initialDefArmy = Math.max(0, defender.pocket.army);
  const initialAttArmy = Math.max(0, attacker.pocket.army);

  let attackerRemaining = initialAttArmy;
  let defenderRemaining = initialDefArmy;

  // Личная атака защитника срабатывает первой
  const defenderStrike = Math.max(0, defender.attack || 0);
  if (defenderStrike > 0 && attackerRemaining > 0) {
    attackerRemaining = Math.max(0, attackerRemaining - defenderStrike);
  }

  // Затем личная атака атакующего
  const attackerStrike = Math.max(0, attacker.attack || 0);
  if (attackerStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(0, defenderRemaining - attackerStrike);
  }

  // Затем идут удары войск: по очереди, случайный урон 1–3
  while (attackerRemaining > 3 && defenderRemaining > 3) {
    const defHit = Math.floor(Math.random() * 3) + 1;
    attackerRemaining = Math.max(0, attackerRemaining - defHit);
    if (attackerRemaining <= 3) break;
    const attHit = Math.floor(Math.random() * 3) + 1;
    defenderRemaining = Math.max(0, defenderRemaining - attHit);
  }

  attacker.pocket.army = Math.max(0, attackerRemaining);
  defender.pocket.army = Math.max(0, defenderRemaining);

  let winnerIndex = attackerIndex;
  if (defenderRemaining > attackerRemaining) {
    winnerIndex = defenderIndex;
  }
  let stolen = null;
  if (!options.noSteal) {
    const loserIndex = winnerIndex === attackerIndex ? defenderIndex : attackerIndex;
    stolen = stealResources(winnerIndex, loserIndex);
  }

  return {
    attackerName: attacker.name,
    defenderName: defender.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName: players[winnerIndex].name,
    winnerIndex,
    defenderIndex,
    attackerIndex,
    stolen
  };
}

function resolveMercenaryBattle(playerIndex, mercenary) {
  const player = players[playerIndex];
  if (!player || !mercenary) return null;
  const initialAttArmy = Math.max(0, player.pocket.army);
  const initialDefArmy = Math.max(0, mercenary.strength);
  const attackerThreshold = Math.max(1, Math.round(initialAttArmy * 0.1));
  const defenderThreshold = Math.max(1, Math.round(initialDefArmy * 0.1));
  let defenderRemaining = initialDefArmy;
  let attackersUsed = 0;
  const availableAttackers = initialAttArmy;
  while (attackersUsed < availableAttackers && defenderRemaining > defenderThreshold) {
    const maxKillAllowed = Math.max(1, defenderRemaining - defenderThreshold);
    const kills = Math.min(Math.floor(Math.random() * 3) + 1, maxKillAllowed);
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - kills);
    attackersUsed += 1;
  }
  const attackerRemaining = Math.max(0, availableAttackers - attackersUsed);
  player.pocket.army = attackerRemaining;

  let winnerName = player.name;
  let winnerIndex = playerIndex;
  if (attackerRemaining <= attackerThreshold && defenderRemaining > defenderThreshold) {
    winnerName = "Наёмники";
    winnerIndex = null;
  } else if (attackerRemaining > attackerThreshold && defenderRemaining <= defenderThreshold) {
    winnerName = player.name;
    winnerIndex = playerIndex;
  } else if (defenderRemaining > attackerRemaining) {
    winnerName = "Наёмники";
    winnerIndex = null;
  }
  mercenary.strength = Math.max(0, defenderRemaining);
  updatePlayerResources(playerIndex);
  return {
    type: "mercenary",
    attackerIndex: playerIndex,
    attackerName: player.name,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    winnerName,
    winnerIndex
  };
}

function resolveCastleBattle(attackerIndex, castleKey) {
  const attacker = players[attackerIndex];
  const stats = ensureCastleStats(castleKey);
  const defenderOwner = castleOwnersByKey[castleKey];
  const initialDefArmy = Math.max(0, stats.storageArmy || 0);
  const initialAttArmy = Math.max(0, attacker.pocket.army || 0);
  let defenderRemaining = initialDefArmy;
  let attackerRemaining = initialAttArmy;
  const defenderThreshold = initialDefArmy > 0 ? Math.ceil(initialDefArmy * 0.25) : 0;

  const attackerStrike = Math.max(0, attacker.attack || 0);
  if (attackerStrike > 0 && defenderRemaining > 0) {
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - attackerStrike);
  }

  while (attackerRemaining > 3 && defenderRemaining > defenderThreshold) {
    const defHit = Math.floor(Math.random() * 3) + 1;
    attackerRemaining = Math.max(0, attackerRemaining - defHit);
    if (attackerRemaining <= 3) break;
    const attHit = Math.floor(Math.random() * 3) + 1;
    defenderRemaining = Math.max(defenderThreshold, defenderRemaining - attHit);
  }

  let armorRemaining = stats.armorCurrent;
  let healthRemaining = stats.healthCurrent;
  const shouldFightArmor =
    (initialDefArmy === 0 || defenderRemaining <= defenderThreshold) &&
    attackerRemaining > 0 &&
    armorRemaining > 0;
  if (shouldFightArmor) {
    while (attackerRemaining > 0 && armorRemaining > 0) {
      const armorHit = Math.floor(Math.random() * 3) + 1;
      armorRemaining = Math.max(0, armorRemaining - armorHit);
      if (armorRemaining <= 0) break;
      const defHit = Math.floor(Math.random() * 3) + 1;
      attackerRemaining = Math.max(0, attackerRemaining - defHit);
    }
  }

  if (armorRemaining <= 0 && attackerRemaining > 0 && healthRemaining > 0) {
    const perUnit = 0.4 + Math.random() * 0.2;
    const damage = attackerRemaining * perUnit;
    healthRemaining = Math.max(0, Math.round((healthRemaining - damage) * 10) / 10);
  }

  attacker.pocket.army = Math.max(0, attackerRemaining);
  stats.storageArmy = Math.max(0, defenderRemaining);
  stats.armorCurrent = Math.max(0, armorRemaining);
  stats.healthCurrent = Math.max(0, healthRemaining);

  let winner = "Замок";
  let winnerIndex = null;
  if (stats.storageArmy <= 0 && stats.armorCurrent <= 0 && stats.healthCurrent <= 0) {
    winner = attacker.name;
    winnerIndex = attackerIndex;
  } else if (attackerRemaining <= 3) {
    winner = "Замок";
    winnerIndex = null;
  }

  updatePlayerResources(attackerIndex);
  return {
    type: "castle",
    attackerIndex,
    attackerName: attacker.name,
    defenderOwner,
    castleKey,
    attackerLost: initialAttArmy - attackerRemaining,
    defenderLost: initialDefArmy - defenderRemaining,
    attackerRemaining,
    defenderRemaining,
    armorRemaining: stats.armorCurrent,
    healthRemaining: stats.healthCurrent,
    winnerName: winner,
    winnerIndex
  };
}

function buildBattleSummaryLines(result) {
    if (result.type === "barbarian") {
      const rewardLine =
        result.winnerIndex === result.attackerIndex && result.influenceReward
          ? `Награда: +${result.influenceReward} влияние, +${result.goldReward} золота, +${result.resourceReward} ресурсов`
          : null;
      const penaltyLine =
        result.penaltyGold || result.penaltyResources
          ? `Проигравший потерял ${result.penaltyGold || 0} золота и ${result.penaltyResources || 0} ресурсов`
          : null;
      return [
        "<strong>ИТОГИ БОЯ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Варвары: Потеряли ${result.defenderLost} войск`,
        `Варвары: Изначально ${result.defenderInitial} войск`,
        " ",
        `Победитель : ${result.winnerName}`,
        rewardLine,
        penaltyLine
      ].filter(Boolean);
    }
    if (result.type === "troll") {
      return [
        "<strong>\u0411\u041e\u0419 \u0421 \u0422\u0420\u041e\u041b\u041b\u042f\u041c\u0418</strong>",
        `${result.attackerName}: \u041f\u043e\u0442\u0435\u0440\u044f\u043b ${result.attackerLost} \u0432\u043e\u0439\u0441\u043a`,
        `\u0422\u0440\u043e\u043b\u043b\u0438: \u041f\u043e\u0442\u0435\u0440\u044f\u043b\u0438 ${result.defenderLost} \u0432\u043e\u0439\u0441\u043a`,
        `\u0422\u0440\u043e\u043b\u043b\u0438: \u0418\u0437\u043d\u0430\u0447\u0430\u043b\u044c\u043d\u043e ${result.defenderInitial} \u0432\u043e\u0439\u0441\u043a`,
        "\u00A0",
        `\u041f\u043e\u0431\u0435\u0434\u0438\u0442\u0435\u043b\u044c : ${result.winnerName}`
      ].filter(Boolean);
    }
    if (result.type === "dragon") {
      return [
        "<strong>БОЙ С ДРАКОНОМ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Дракон: Потерял ${result.defenderLost} войск`,
        `Дракон: Изначально ${result.defenderInitial} войск`,
        "\u00A0",
        `Победитель : ${result.winnerName}`
      ].filter(Boolean);
    }
    if (result.type === "robber") {
      const penaltyLine =
        result.penaltyGold || result.penaltyResources
          ? `Проигравший потерял ${result.penaltyGold || 0} золота, ${result.penaltyResources || 0} ресурсов и влияние -${result.influenceLoss || 0}`
          : null;
      const rewardLine =
        result.goldReward || result.resourceReward
          ? `Награда: +${result.goldReward} золота, +${result.resourceReward} ресурсов`
          : null;
      return [
        "<strong>НА ВАС НАПАЛИ РАЗБОЙНИКИ</strong>",
        "<strong>ИТОГИ БОЯ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Разбойники: Потеряли ${result.defenderLost} войск`,
        "\u00A0",
        `Победитель : ${result.winnerName}`,
        rewardLine,
        penaltyLine
      ].filter(Boolean);
    }
    if (result.type === "mercenary") {
      return [
        "<strong>БОЙ С НАЁМНИКАМИ</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Наёмники: Потеряли ${result.defenderLost} войск`,
        "\u00A0",
        `Победитель : ${result.winnerName}`
      ].filter(Boolean);
    }
    if (result.type === "castle") {
      return [
        "<strong>БОЙ ЗА ЗАМОК</strong>",
        `${result.attackerName}: Потерял ${result.attackerLost} войск`,
        `Гарнизон: Потерял ${result.defenderLost} войск`,
        `Броня замка: ${result.armorRemaining}`,
        `Здоровье замка: ${result.healthRemaining}`,
        "\u00A0",
        `Победитель : ${result.winnerName}`
      ].filter(Boolean);
    }
    const lines = [];
    if (result.defenderAutoKilled > 0) {
      lines.push(`Обороняющийся сразу убил ${result.defenderAutoKilled} войск.`);
    }
    lines.push(
      `Игрок ${result.attackerIndex + 1}: Потерял ${result.attackerLost} войск`,
      `Игрок ${result.defenderIndex + 1}: Потерял ${result.defenderLost} войск`,
      "\u00A0",
      `Победитель : ${result.winnerName}`
    );
    const stolenParts = [];
    if (result.stolen) {
      if (result.stolen.gold) stolenParts.push(`${result.stolen.gold} золота`);
      if (result.stolen.army) stolenParts.push(`${result.stolen.army} войск`);
      if (result.stolen.resources) stolenParts.push(`${result.stolen.resources} ресурсов`);
    }
    if (stolenParts.length) {
      lines.push(`Победитель забрал ${stolenParts.join(", ")} из кармана проигравшего.`);
    }
    return lines;
  }

function shouldShowBattleForLocal(result) {
  if (!result) return false;
  const localIndex = getLocalPlayerIndex();
  if (localIndex === null) return true;
  const keys = [
    "attackerIndex",
    "defenderIndex",
    "playerIndex",
    "winnerIndex",
    "loserIndex",
    "targetPlayerIndex"
  ];
  let hasIndex = false;
  for (const key of keys) {
    if (typeof result[key] === "number") {
      hasIndex = true;
      if (result[key] === localIndex) return true;
    }
  }
  if (hasIndex) return false;
  return localIndex === currentPlayerIndex;
}

function showBattleModal(result, force = false) {
  if (!battleModal || !battleSummary || !result) return;
  const inMultiplayer = typeof socket !== "undefined" && socket;
  if (inMultiplayer && !force && !shouldShowBattleForLocal(result)) return;
  if (inMultiplayer && force && !shouldShowBattleForLocal(result)) return;
  if (!force) {
    const snapshot = JSON.parse(JSON.stringify(result));
    lastBattleResult = snapshot;
    lastBattleId += 1;
  }
  const lines = buildBattleSummaryLines(result);
  battleSummary.innerHTML = lines.map(line => `<p>${line}</p>`).join("");
  battleModal.style.display = "flex";
}

  function hideBattleModal() {
    if (battleModal) battleModal.style.display = "none";
  }

  battleClose.addEventListener("click", hideBattleModal);
  battleModal.addEventListener("click", (event) => {
    if (event.target === battleModal) {
      hideBattleModal();
    }
  });

function refreshCastleModal(key, playerIndex) {
  if (!castleModal) return;
  const stats = ensureCastleStats(key);
  const player = players[playerIndex];
  castleLevelValue.textContent = stats.level;
  castleArmorValue.textContent = `Броня: ${stats.armorCurrent}`;
  castleHealthValue.textContent = `Здоровье: ${stats.healthCurrent}`;
  const wallBadge = typeof castleWallBadge !== "undefined"
    ? castleWallBadge
    : document.getElementById("castleWallBadge");
  if (wallBadge) {
    wallBadge.style.display = "inline-flex";
    wallBadge.style.visibility = stats.wall ? "visible" : "hidden";
  }
  if (castleNextBonus) {
    const nextLevel = Math.min(3, stats.level + 1);
    if (stats.level >= 3) {
      castleNextBonus.textContent = "Следующий уровень: максимум";
    } else {
      const nextInfo = CASTLE_LEVELS[nextLevel] || CASTLE_LEVELS[stats.level];
      const curInfo = CASTLE_LEVELS[stats.level] || CASTLE_LEVELS[1];
      const armorDelta = Math.max(0, (nextInfo.armor || 0) - (curInfo.armor || 0));
      const healthDelta = Math.max(0, (nextInfo.health || 0) - (curInfo.health || 0));
      castleNextBonus.textContent = `Следующий уровень: +${armorDelta} брони, +${healthDelta} здоровья`;
    }
  }
  const playerResources = player ? player.resources.resources : 0;
  const upgradeCost = stats.level >= 2 ? 750 : 500;
  castleUpgradeBtn.disabled = stats.level >= 3 || playerResources < upgradeCost;
  if (castleUpgradeCostLabel) {
    castleUpgradeCostLabel.textContent = String(upgradeCost);
  }
  if (ballistaBuyBtn) {
    const hasBallista = player ? (player.ballistaCount || 0) > 0 : false;
    ballistaBuyBtn.disabled = !player || hasBallista || playerResources < BALLISTA_COST;
  }
  if (boltBuyBtn) {
    boltBuyBtn.disabled = !player || playerResources < BOLT_COST;
  }
    castleFeatureButtons.forEach(btn => {
      const feature = btn.dataset.castleFeature;
      const def = CASTLE_FEATURES[feature];
      if (!def) return;
      const purchased = stats[feature];
      btn.disabled = purchased || playerResources < (def?.cost || 0);
      const statusElem = castleFeatureStatusElems[feature];
      if (statusElem) {
        statusElem.textContent = purchased ? "Куплено" : "";
      }
    });
    if (castleWithdrawArmy) {
      const storage = stats.storageArmy || 0;
      castleWithdrawArmy.textContent = storage;
      if (castleWithdrawBtn) {
        castleWithdrawBtn.disabled = storage <= 0;
      }
      if (castleWithdrawInput) {
        castleWithdrawInput.value = "0";
        castleWithdrawInput.max = storage;
      }
    }
    if (castleDepositInput && castleDepositBtn) {
      const pocketArmy = player ? player.pocket.army : 0;
      castleDepositInput.value = "0";
      castleDepositInput.max = pocketArmy;
      castleDepositBtn.disabled = pocketArmy <= 0;
    }
    if (castleStorageDisplay) {
      castleStorageDisplay.textContent = stats.storageArmy || 0;
    }
  }

  function showCastleModal(key, playerIndex) {
    if (!castleModal) return;
    castleModalKey = key;
    castleModalPlayerIndex = playerIndex;
    refreshCastleModal(key, playerIndex);
    castleModal.style.display = "flex";
  }

  function hideCastleModal() {
    if (castleModal) castleModal.style.display = "none";
    castleModalKey = null;
    castleModalPlayerIndex = null;
  }

function buyCastleFeature(featureKey) {
  if (!castleModalKey || castleModalPlayerIndex === null) return;
  const stats = ensureCastleStats(castleModalKey);
  const player = players[castleModalPlayerIndex];
  const featureDef = CASTLE_FEATURES[featureKey];
  if (!featureDef || stats[featureKey]) return;
  if (!player || player.resources.resources < featureDef.cost) return;
  player.resources.resources -= featureDef.cost;
  stats[featureKey] = true;
  ensureCastleStats(castleModalKey);
  updatePlayerResources(castleModalPlayerIndex);
  updateCastleBadge(castleModalKey);
  applyCastleFeatureSpecialCell(castleModalKey, featureKey);
  showPickupToast(`Покупка: ${featureDef.label}`);
  recalcPlayerResourceIncome(castleModalPlayerIndex);
  refreshCastleModal(castleModalKey, castleModalPlayerIndex);
  const btn = castleFeatureButtons.find(b => b.dataset.castleFeature === featureKey);
  flashPrice(btn, featureDef.cost, "assets/icons/icon-resources.png", "Ресурсы");
}

  const CASTLE_FEATURE_SPECIALS = {
    11: {
      lumber: { x: 0, y: 22, label: "ЛЕС", extraClass: "forest" }, // E661
      mine: { x: 0, y: 24, label: "ШАХ", extraClass: "resource" }, // E721
      clay: { x: 2, y: 24, label: "ГЛИН", extraClass: "resource" } // E723
    },
    17: {
      lumber: { x: 29, y: 2, label: "ЛЕС", extraClass: "forest" }, // E90
      mine: { x: 29, y: 0, label: "ШАХ", extraClass: "resource" }, // E30
      clay: { x: 27, y: 0, label: "ГЛИН", extraClass: "resource" } // E28
    }
  };

function applyCastleFeatureSpecialCell(castleKey, featureKey) {
  const node = nodeByPos[castleKey];
  if (!node || node.type !== "castle") return;
  const cfg = CASTLE_FEATURE_SPECIALS[node.id]?.[featureKey];
  if (!cfg) return;
  if (typeof setSpecialCell !== "function") return;
  const placed = setSpecialCell(cfg.x, cfg.y, cfg.label, cfg.extraClass, castleModalPlayerIndex, featureKey, castleKey);
  if (!placed) return;
  applySpecialFeatureIcon(cfg.x, cfg.y, featureKey);
}

function applySpecialFeatureIcon(x, y, featureKey) {
  const cell = grid[`${x},${y}`];
  const iconByFeature = {
    lumber: { file: "lumber.png", alt: "Лесопилка" },
    mine: { file: "mine.png", alt: "Шахта" },
    clay: { file: "clay.png", alt: "Глиняный карьер" }
  };
  const iconDef = iconByFeature[featureKey];
  if (cell && iconDef && typeof setCellIcon === "function") {
    cell.textContent = "";
    setCellIcon(cell, iconDef.file, iconDef.alt);
  }
}

  castleFeatureButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const feature = btn.dataset.castleFeature;
      buyCastleFeature(feature);
    });
  });
  if (ballistaBuyBtn) {
    ballistaBuyBtn.addEventListener("click", () => {
      if (!castleModalKey || castleModalPlayerIndex === null) return;
      const player = players[castleModalPlayerIndex];
      if (!player) return;
      if ((player.ballistaCount || 0) >= 1) return;
      if (player.resources.resources < BALLISTA_COST) return;
      player.resources.resources -= BALLISTA_COST;
      player.ballistaCount = 1;
      updatePlayerResources(castleModalPlayerIndex);
      updateInventory(castleModalPlayerIndex);
      refreshCastleModal(castleModalKey, castleModalPlayerIndex);
      showPickupToast("Куплена Баллиста.");
      flashPrice(ballistaBuyBtn, BALLISTA_COST, "assets/icons/icon-resources.png", "Ресурсы");
    });
  }
  if (boltBuyBtn) {
    boltBuyBtn.addEventListener("click", () => {
      if (!castleModalKey || castleModalPlayerIndex === null) return;
      const player = players[castleModalPlayerIndex];
      if (!player) return;
      if (player.resources.resources < BOLT_COST) return;
      player.resources.resources -= BOLT_COST;
      player.boltCount = (player.boltCount || 0) + 1;
      updatePlayerResources(castleModalPlayerIndex);
      updateInventory(castleModalPlayerIndex);
      refreshCastleModal(castleModalKey, castleModalPlayerIndex);
      showPickupToast("Куплен Болт для баллисты.");
      flashPrice(boltBuyBtn, BOLT_COST, "assets/icons/icon-resources.png", "Ресурсы");
    });
  }

  if (castleDepositBtn) {
    castleDepositBtn.addEventListener("click", () => {
      if (!castleModalKey || castleModalPlayerIndex === null) return;
      const player = players[castleModalPlayerIndex];
      const stats = ensureCastleStats(castleModalKey);
      let amount = 0;
      if (castleDepositInput) {
        amount = Math.floor(Math.max(0, Number(castleDepositInput.value) || 0));
      }
      const available = player ? player.pocket.army : 0;
      amount = Math.min(amount, available);
      if (amount <= 0 || !player) return;
      player.pocket.army -= amount;
      stats.storageArmy = (stats.storageArmy || 0) + amount;
      updatePlayerResources(castleModalPlayerIndex);
      recalcPlayerResourceIncome(castleModalPlayerIndex);
      refreshCastleModal(castleModalKey, castleModalPlayerIndex);
      showPickupToast(`В замок: +${amount} войск`);
    });
  }
  if (castleWithdrawBtn) {
    castleWithdrawBtn.addEventListener("click", () => {
      if (!castleModalKey || castleModalPlayerIndex === null) return;
      const player = players[castleModalPlayerIndex];
      const stats = ensureCastleStats(castleModalKey);
      const available = stats.storageArmy || 0;
      let amount = 0;
      if (castleWithdrawInput) {
        amount = Math.floor(Math.max(0, Number(castleWithdrawInput.value) || 0));
      }
      amount = Math.min(amount, available);
      if (amount <= 0 || !player) return;
      stats.storageArmy = available - amount;
      player.pocket.army += amount;
      updatePlayerResources(castleModalPlayerIndex);
      refreshCastleModal(castleModalKey, castleModalPlayerIndex);
      showPickupToast(`В карман: +${amount} войск`);
    });
  }

  castleUpgradeBtn.addEventListener("click", () => {
    if (!castleModalKey || castleModalPlayerIndex === null) return;
    const stats = castleStatsByKey[castleModalKey];
    const player = players[castleModalPlayerIndex];
    const upgradeCost = stats && stats.level >= 2 ? 750 : 500;
    if (!stats || stats.level >= 3 || player.resources.resources < upgradeCost) return;
    player.resources.resources -= upgradeCost;
    stats.level += 1;
    ensureCastleStats(castleModalKey);
    updatePlayerResources(castleModalPlayerIndex);
    updateCastleBadge(castleModalKey);
    refreshCastleModal(castleModalKey, castleModalPlayerIndex);
    recalcPlayerResourceIncome(castleModalPlayerIndex);
    flashPrice(castleUpgradeBtn, upgradeCost, "assets/icons/icon-resources.png", "Ресурсы");
  });

  castleModalClose.addEventListener("click", hideCastleModal);
  castleModal.addEventListener("click", (event) => {
    if (event.target === castleModal) {

      hideCastleModal();
    }
  });

function updatePawn(player, index) {
  const pawn = pawns[index];
  const pawnSize = Math.max(16, Math.round(cellSize * 0.7));
  pawn.style.width = pawnSize + "px";
  pawn.style.height = pawnSize + "px";
  pawn.style.borderWidth = Math.max(2, Math.round(cellSize * 0.07)) + "px";
  pawn.style.fontSize = Math.max(12, Math.round(cellSize * 0.38)) + "px";
  const centerX = player.x * cellSize + cellSize / 2;
  const centerY = player.y * cellSize + cellSize / 2;
  pawn.style.left = centerX + "px";
  pawn.style.top  = centerY + "px";
  pawn.style.transform = "translate3d(-50%, -50%, 0)";
  pawn.style.zIndex = 10 + index;
}
function updatePawns() {
  players.forEach(updatePawn);
  players.forEach((_, idx) => updatePlayerResources(idx));
}
updatePawns();

let currentPlayerIndex = 0;
let movesRemaining = 0;
let lastRoll = null;
let lastRollText = "-";
let lastDie1 = null;
let lastDie2 = null;
let extraTurnPending = false;
let extraTurnReason = null;
let justRolledDouble = false;
let robberAmbushThisSession = false;
let reachableKeys = new Set();
let autoRollTimer = null;
let doubleSound = null;
let audioUnlocked = false;
let testModeEnabled = false;
let lastBattleResult = null;
let lastBattleId = 0;
let turnEndPending = false;

function tickAllTimedBuffs() {
  players.forEach(player => {
    if (!player) return;
    if (player.slowTurnsRemaining > 0) {
      player.slowTurnsRemaining = Math.max(0, player.slowTurnsRemaining - 1);
    }
    if (player.noDoubleTurnsRemaining > 0) {
      player.noDoubleTurnsRemaining = Math.max(0, player.noDoubleTurnsRemaining - 1);
    }
    if (player.stunnedTurnsRemaining > 0) {
      player.stunnedTurnsRemaining = Math.max(0, player.stunnedTurnsRemaining - 1);
    }
    if (player.invisTurnsRemaining > 0) {
      player.invisTurnsRemaining = Math.max(0, player.invisTurnsRemaining - 1);
    }
    if (player.luckTurnsRemaining > 0) {
      player.luckTurnsRemaining = Math.max(0, player.luckTurnsRemaining - 1);
    }
  });
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (!doubleSound) {
    doubleSound = document.getElementById("doubleSound") || new Audio("assets/sfx/double.mp3");
  }
  doubleSound.play().then(() => {
    doubleSound.pause();
    doubleSound.currentTime = 0;
  }).catch(() => {});
}
document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

function clearReachable() {
  reachableKeys.forEach(key => {
    const cell = grid[key];
    if (cell) cell.classList.remove("reachable");
  });
  reachableKeys.clear();
}

const MOVES_DIRS = [
  {dx: 1, dy: 0},
  {dx: -1, dy: 0},
  {dx: 0, dy: 1},
  {dx: 0, dy: -1}
];

function showReachable() {
  clearReachable();
  if (ballistaModePlayerIndex === currentPlayerIndex) return;
  if (movesRemaining <= 0) return;
  const currentPlayer = players[currentPlayerIndex];
  const queue = [{x: currentPlayer.x, y: currentPlayer.y, steps: 0}];
  const visited = new Set([`${currentPlayer.x},${currentPlayer.y}`]);

  while (queue.length) {
    const {x, y, steps} = queue.shift();
    const key = `${x},${y}`;
    const isGuardCell = guardKey && key === guardKey;
    if (steps > 0) {
      const cell = grid[key];
      if (cell) {
        cell.classList.add("reachable");
        reachableKeys.add(key);
      }
    }
    if (steps === movesRemaining) continue;
    const player = players[currentPlayerIndex];
    const canAttemptGuard = guardAccess[currentPlayerIndex];
    if (isGuardCell && !canAttemptGuard) continue;
    for (const {dx, dy} of MOVES_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      const node = nodeByPos[key];
      if (node && node.id === 15 && player.resources.influence < 500) continue;
      if (blockedCellKeys.has(key)) continue;
      visited.add(key);
      queue.push({x: nx, y: ny, steps: steps + 1});
    }
  }
}

function finalizeMove(gridX, gridY) {
  const key = `${gridX},${gridY}`;
  const currentPlayer = players[currentPlayerIndex];
  currentPlayer.x = gridX;
  currentPlayer.y = gridY;
  movesRemaining = 0;
  clearReachable();
  updatePawns();

  const castleKey = getCastleBaseKeyForPos(gridX, gridY) || key;
  const node = nodeByPos[castleKey];
  if (node && node.type === "castle") {
    const previousOwner = castleOwnersByKey[castleKey];
    if (typeof previousOwner === "number" && previousOwner !== currentPlayerIndex) {
      const battleResult = resolveCastleBattle(currentPlayerIndex, castleKey);
      showBattleModal(battleResult);
      if (battleResult.healthRemaining <= 0) {
        showGameOver(currentPlayerIndex);
      }
      if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
        const ownedKey = getFirstOwnedCastleKey(currentPlayerIndex);
        if (ownedKey && ownedKey !== castleKey) {
          showPickupToast("Нельзя захватить второй замок.");
          castleOwnersByKey[castleKey] = undefined;
          node.elem.classList.remove("owned");
          node.elem.style.background = "";
          node.elem.style.borderColor = "";
          updateCastleBadge(castleKey);
        } else {
          castleOwnersByKey[castleKey] = currentPlayerIndex;
          node.elem.classList.add("owned");
          node.elem.style.background = currentPlayer.color;
          node.elem.style.borderColor = currentPlayer.color;
          recalcPlayerResourceIncome(currentPlayerIndex);
        }
      }
      if (typeof previousOwner === "number") {
        recalcPlayerResourceIncome(previousOwner);
      }
      endTurn();
      return;
    }
    if (previousOwner !== currentPlayerIndex) {
      const ownedKey = getFirstOwnedCastleKey(currentPlayerIndex);
      if (ownedKey && ownedKey !== castleKey) {
        showPickupToast("Нельзя захватить второй замок.");
      } else {
        castleOwnersByKey[castleKey] = currentPlayerIndex;
        node.elem.classList.add("owned");
        node.elem.style.background = currentPlayer.color;
        node.elem.style.borderColor = currentPlayer.color;
        if (typeof previousOwner === "number") {
          recalcPlayerResourceIncome(previousOwner);
        }
      }
    }
    if (castleOwnersByKey[castleKey] === currentPlayerIndex) {
      depositPocketCurrencyToPlayer(currentPlayerIndex);
      recalcPlayerResourceIncome(currentPlayerIndex);
      showCastleModal(castleKey, currentPlayerIndex);
    }
  }
  const dragonKey = getDragonBaseKeyForPos(gridX, gridY);
  if (dragonKey) {
    if (!currentPlayer.hasSword) {
      showPickupToast("Без меча героя нельзя вступить в бой с драконом.");
      endTurn();
      return;
    }
    const battleResult = resolveDragonBattle(currentPlayerIndex, 50);
    showBattleModal(battleResult);
    if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
      showGameOver(currentPlayerIndex);
    }
    endTurn();
    return;
  }
  const barbarianCell = barbarianCells.find(cell => cell.key === key);
  if (barbarianCell) {
    const battleResult = resolveBarbarianBattle(currentPlayerIndex, barbarianCell);
    if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
      currentPlayer.barbarianKills = (currentPlayer.barbarianKills || 0) + 1;
    }
    removeBarbarianCell(key);
    scheduleBarbarianRespawn();
    showBattleModal(battleResult);
    endTurn();
    return;
  }
  const trollHere = typeof isTrollAtKey === "function" && isTrollAtKey(key);
  if (trollHere) {
    if (currentPlayer.invisTurnsRemaining > 0) {
      showPickupToast("Невидимость: тролли вас не атакуют.");
    } else {
      const trollArmy = 25;
      const battleResult = resolveTrollBattle(currentPlayerIndex, trollArmy);
      if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
        if (typeof handleTrollDefeat === "function") {
          handleTrollDefeat();
        }
      }
      showBattleModal(battleResult);
      endTurn();
      return;
    }
  }
  const specialEntry = specialByPos[key];
  if (specialEntry && specialEntry.disabled && specialEntry.ownerIndex === currentPlayerIndex) {
    openRepairModal({ ...specialEntry, key }, currentPlayerIndex);
  }
  if (specialEntry && specialEntry.type === "portal") {
    const otherKey = typeof getOtherPortalKey === "function" ? getOtherPortalKey(key) : null;
    if (otherKey) {
      const [tx, ty] = otherKey.split(",").map(Number);
      if (typeof clearPortalPair === "function") {
        clearPortalPair();
      }
      currentPlayer.x = tx;
      currentPlayer.y = ty;
      updatePawns();
      showPickupToast("Портал перенес вас.");
      endTurn();
      return;
    }
  }
  if (specialEntry && specialEntry.type === "troll-cave") {
    const trollInCave = typeof isTrollInCaveAtKey === "function" && isTrollInCaveAtKey(key);
    if (!trollInCave) {
      const caveIndex = typeof getTrollCaveIndexByKey === "function" ? getTrollCaveIndexByKey(key) : -1;
      const alreadyLooted = caveIndex >= 0 && TROLL_CAVES && TROLL_CAVES[caveIndex]?.looted;
      if (alreadyLooted) {
        openTrollCaveModal("\u041f\u0435\u0449\u0435\u0440\u0430 \u043f\u0443\u0441\u0442\u0430.");
      } else {
        const lootText = rollTrollCaveLoot(currentPlayerIndex);
        if (caveIndex >= 0 && typeof markTrollCaveLooted === "function") {
          markTrollCaveLooted(caveIndex, true);
        }
        if (lootText) {
          openTrollCaveModal(lootText);
        }
      }
      endTurn();
      return;
    }
  }
  if (specialEntry && specialEntry.type === "mage") {
    const mageSlot = getMageSlotById(specialEntry.mageId);
    if (mageSlot && mageSlot.active) {
      openMageModal(mageSlot, currentPlayerIndex);
    }
  }
  if (node && node.id === 2) {
    openBarracks(currentPlayerIndex);
  }
  if (node && node.id === 9) {
    openLavka(currentPlayerIndex);
  }
  if (node && node.id === 19) {
    openWorkshop(currentPlayerIndex);
  }
  if (node && node.id === 15) {
    openCity(currentPlayerIndex);
  }
  if (node && node.id === 6) {
    openHire(currentPlayerIndex);
  }

  if (stoneByPos[key]) {
    openStoneModal(key, currentPlayerIndex);
  }
  if (rainbowByPos[key]) {
    currentPlayer.rainbowStoneCount = (currentPlayer.rainbowStoneCount || 0) + 1;
    updatePlayerResources(currentPlayerIndex);
    showPickupToast("Радужный камень добавлен в инвентарь.");
    clearRainbowStone(key);
  }
  if (masterActive && key === MASTER_CELL.key) {
    openMasterModal(currentPlayerIndex);
  }

  const resourceNode = resourceByPos[key];
  if (resourceNode) {
    const {type, x, y} = resourceNode;
    let amount = Math.floor(Math.random() * (type.max - type.min + 1)) + type.min;
    if (turnCounter >= 150) {
      amount = Math.floor(amount * 1.75);
    }
    if (currentPlayer.luckTurnsRemaining > 0) {
      amount = Math.floor(amount * 1.6);
    }
    currentPlayer.pocket[type.key] += amount;
    updatePlayerResources(currentPlayerIndex);
    delete resourceByPos[key];
    setCellToInactive(x, y);
    const label = type.key === "gold" ? "золота" : type.key === "army" ? "войск" : "ресурсов";
    showPickupToast(`В карман: +${amount} ${label}`);
  }

  if (treasure && treasure.key === key) {
    const goldReward = Math.floor(Math.random() * (1200 - 700 + 1)) + 700;
    currentPlayer.pocket.gold += goldReward;
    updatePlayerResources(currentPlayerIndex);
    showPickupToast(`Сокровище: +${goldReward} золота в карман`);
    clearTreasure();
  }
  if (flowerArtifact && flowerArtifact.key === key) {
    currentPlayer.flowerCount = (currentPlayer.flowerCount || 0) + 1;
    updatePlayerResources(currentPlayerIndex);
    showPickupToast("Таинственный цветок добавлен в инвентарь.");
    clearFlower();
  }
  if (cloverArtifact && cloverArtifact.key === key) {
    currentPlayer.cloverCount = (currentPlayer.cloverCount || 0) + 1;
    updatePlayerResources(currentPlayerIndex);
    showPickupToast("Клевер добавлен в инвентарь.");
    if (typeof clearClover === "function") {
      clearClover();
    }
  }
  endTurn();
}

function updateTurnUI() {
  const currentPlayer = players[currentPlayerIndex];
  const allowLocal = canLocalAct();
  document.body.classList.toggle("turn-locked", !allowLocal);
  if (turnInfo) {
    turnInfo.textContent = "";
    turnInfo.style.display = "none";
  }
  if (movesInfo) {
    movesInfo.textContent = "";
    movesInfo.style.display = "none";
  }
  if (rollInfo) {
    if (lastDie1 === null || lastDie2 === null) {
      rollInfo.innerHTML = 'БРОСОК <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
      rollInfo.classList.add("rolling");
    } else {
      rollInfo.textContent = `БРОСОК ${lastDie1} + ${lastDie2}`;
      rollInfo.classList.remove("rolling");
    }
  }
  if (rollBtn) {
    rollBtn.disabled = !allowLocal;
    rollBtn.style.display = "none";
  }
  if (endTurnBtn) {
    endTurnBtn.disabled = !allowLocal;
  }
  doubleMsg.style.display = justRolledDouble ? "block" : "none";
  if (currentPlayerName) {
    currentPlayerName.textContent = `ИГРОК ${currentPlayer.id + 1}`;
    currentPlayerName.style.color = currentPlayer.color;
  }
  playerPanels.forEach((panel, index) => {
    panel.classList.toggle("active", index === currentPlayerIndex);
  });
  pawns.forEach((pawn, index) => {
    pawn.classList.toggle("active-turn", index === currentPlayerIndex);
  });
  if (turnCounterDisplay) {
    turnCounterDisplay.textContent = `СЧЁТЧИК ХОДОВ: ${turnCounter}`;
  }
  if (devTurnInput) {
    devTurnInput.value = String(turnCounter);
  }
  updateStatusPanel();
  if (typeof updateRobberModalVisibility === "function") {
    updateRobberModalVisibility();
  }
}

function showBallistaRange() {
  clearReachable();
  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const dist = Math.abs(x - currentPlayer.x) + Math.abs(y - currentPlayer.y);
      if (dist === 0 || dist > BALLISTA_RANGE) continue;
      const key = `${x},${y}`;
      const cell = grid[key];
      if (!cell) continue;
      cell.classList.add("reachable");
      reachableKeys.add(key);
    }
  }
}

function endTurn(force = false) {
  if (!force) {
    turnEndPending = true;
    updateTurnUI();
    return;
  }
  turnEndPending = false;
  ballistaModePlayerIndex = null;
  tickAllTimedBuffs();
  collectCastleIncomes(currentPlayerIndex);
  turnCounter += 1;
  handleMageCellTimers();
  if (turnCounter === 150 && !worldDangerShown) {
    showWorldDangerModal();
    worldDangerShown = true;
  }
  if (!barbarianPhaseStarted && turnCounter >= BARBARIAN_START_TURN) {
    spawnInitialBarbarianCells();
    barbarianPhaseStarted = true;
  }
  handleBarbarianRespawns();
  advanceMercenaries();
  advanceThieves();
  advanceCutthroats();
  movesRemaining = 0;
  lastRoll = null;
  lastRollText = "-";
  clearReachable();

  turnsUntilResources = Math.max(0, turnsUntilResources - 1);
  if (turnsUntilResources === 0) {
    spawnResources();
  }

  let spawnedTreasureThisTurn = false;
  turnsUntilTreasure -= 1;
  if (turnsUntilTreasure <= 0) {
    spawnTreasure();
    turnsUntilTreasure = TREASURE_INTERVAL;
    spawnedTreasureThisTurn = true;
  }
  if (treasure && !spawnedTreasureThisTurn) {
    treasureTurnsRemaining -= 1;
    if (treasureTurnsRemaining <= 0) {
      clearTreasure();
    }
  }
  handleFlowerTimers();
  if (typeof handleCloverTimers === "function") {
    handleCloverTimers();
  }
  handleStoneTimers();
  if (typeof handlePortalTimers === "function") {
    handlePortalTimers();
  }
  handleStoneSpawns();
  if (typeof handlePortalSpawns === "function") {
    handlePortalSpawns();
  }
  if (typeof handleCloverSpawns === "function") {
    handleCloverSpawns();
  }
  handleRainbowTimers();
  handleRainbowSpawns();
  handleMasterCell();
  if (typeof handleTrollsTurn === "function") {
    handleTrollsTurn();
  }

  const keepCurrentPlayer = extraTurnPending;
  extraTurnPending = false;
  if (keepCurrentPlayer) {
    justRolledDouble = extraTurnReason === "double";
  } else {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    justRolledDouble = false;
    robberAmbushThisSession = false;
  }
  extraTurnReason = null;

  updateTurnUI();
  players.forEach((_, idx) => updatePlayerResources(idx));
  const inMultiplayer = typeof socket !== "undefined" && socket;
  if (!inMultiplayer) {
    scheduleAutoRoll();
  } else if (isHost && typeof localPlayerIndex !== "undefined" &&
    localPlayerIndex !== null && localPlayerIndex === currentPlayerIndex) {
    scheduleAutoRoll();
  }
}

function scheduleAutoRoll() {
  if (autoRollTimer) {
    clearTimeout(autoRollTimer);
  }
  if (gameEnded) return;
  if (movesRemaining > 0) return;
  if (rollInfo) {
    rollInfo.innerHTML = 'БРОСОК <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
    rollInfo.classList.add("rolling");
  }
  lastDie1 = null;
  lastDie2 = null;
  autoRollTimer = setTimeout(() => {
    autoRollTimer = null;
    tryAutoRoll();
  }, 1500);
}

function tryAutoRoll() {
  const inMultiplayer = typeof socket !== "undefined" && socket;
  if (inMultiplayer && !isHost) return;
  if (gameEnded) return;
  if (movesRemaining > 0) return;
  if (processRobberAmbushChance()) return;
  doRoll();
}

function doRoll() {
  const die1 = testModeEnabled ? 12 : Math.floor(Math.random() * 6) + 1;
  const die2 = testModeEnabled ? 13 : Math.floor(Math.random() * 6) + 1;
  lastDie1 = die1;
  lastDie2 = die2;
  const currentPlayer = players[currentPlayerIndex];
  if (currentPlayer && currentPlayer.stunnedTurnsRemaining > 0) {
    showPickupToast("Тролли оглушили вас — пропуск хода.");
    movesRemaining = 0;
    lastRoll = null;
    lastRollText = "-";
    clearReachable();
    extraTurnPending = false;
    extraTurnReason = null;
    justRolledDouble = false;
    tickAllTimedBuffs();
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateTurnUI();
    players.forEach((_, idx) => updatePlayerResources(idx));
    scheduleAutoRoll();
    return;
  }
  const stoneBonusActive = currentPlayer && currentPlayer.stoneBonusRollsRemaining > 0;
  const bonus = stoneBonusActive ? 1 : 0;
  const roll = die1 + die2 + bonus;
  lastRoll = roll;
  lastRollText = bonus > 0 ? `${die1} + ${die2} + 1 = ${roll}` : `${die1} + ${die2} = ${roll}`;
  if (stoneBonusActive && currentPlayer) {
    currentPlayer.stoneBonusRollsRemaining = Math.max(0, currentPlayer.stoneBonusRollsRemaining - 1);
  }
  const penalty = currentPlayer && currentPlayer.slowTurnsRemaining > 0 ? MAGE_SLOW_PENALTY : 0;
  let effectiveMoves = roll;
  if (penalty > 0 && currentPlayer) {
    effectiveMoves = Math.max(0, roll - penalty);
  }
  const rolledDouble = die1 === die2;
  const allowDouble = !stoneBonusActive;
  const effectiveDouble = rolledDouble && allowDouble;
  justRolledDouble = false;
  let extraTurn = stoneBonusActive || effectiveDouble;
  extraTurnReason = stoneBonusActive ? "stone" : (effectiveDouble ? "double" : null);
  if (effectiveDouble) {
    robberAmbushThisSession = true;
  }
  if (!stoneBonusActive && currentPlayer && currentPlayer.noDoubleTurnsRemaining > 0 && effectiveDouble) {
    extraTurn = false;
    extraTurnReason = null;
  }
  extraTurnPending = extraTurn;
  if (effectiveDouble) {
    showDoubleToast();
  }
  if (effectiveMoves <= 0) {
    movesRemaining = 0;
    showPickupToast("Маг замедлил вас — ход пропущен.");
    endTurn();
    return;
  }
  movesRemaining = effectiveMoves;
  showReachable();
  updateTurnUI();
}

if (rollBtn) {
  rollBtn.addEventListener("click", () => {
    tryAutoRoll();
  });
}
if (endTurnBtn) {
  endTurnBtn.addEventListener("click", () => {
    if (!canLocalAct()) return;
    if (movesRemaining > 0) {
      movesRemaining = 0;
      clearReachable();
    }
    showPickupToast("Ход завершен.");
    endTurn(true);
    if (typeof emitStateNow === "function") {
      emitStateNow(true);
    }
  });
}
function resetGameState() {
  gameEnded = false;
  worldDangerShown = false;
  robberEvent = null;
  robberAmbushThisSession = false;
  robbersEnabled = false;
  lastBattleResult = null;
  lastBattleId = 0;
  testModeEnabled = false;
  clearReachable();
  if (autoRollTimer) {
    clearTimeout(autoRollTimer);
    autoRollTimer = null;
  }

  const startX = startNode.x;
  const startY = startNode.y;
  players.forEach((player, index) => {
    player.x = startX;
    player.y = startY;
    player.resources.gold = 0;
    player.resources.army = 0;
    player.resources.influence = 0;
    player.resources.resources = 0;
    player.pocket.gold = 0;
    player.pocket.army = 0;
    player.pocket.resources = 0;
    player.income.resources = 0;
    player.attack = 6;
    player.hasSword = false;
    player.hasArmor = false;
    player.hasWorkshopSword = false;
    player.barbarianKills = 0;
    player.slowTurnsRemaining = 0;
    player.noDoubleTurnsRemaining = 0;
    player.poisonCount = 0;
    player.invisPotionCount = 0;
    player.luckPotionCount = 0;
    player.invisTurnsRemaining = 0;
    player.luckTurnsRemaining = 0;
    player.cloverCount = 0;
    player.trollClubCount = 0;
    player.flowerCount = 0;
    player.tokenCount = 0;
    player.ballistaCount = 0;
    player.boltCount = 0;
    player.ringCount = 0;
    player.terrorRingCount = 0;
    player.rainbowStoneCount = 0;
    player.heroHiltCount = 0;
    player.stoneBonusRollsRemaining = 0;
    player.stunnedTurnsRemaining = 0;
    player.barbarianRewards = { r5: false, r10: false, r20: false };
    updatePlayerResources(index);
  });

  guardAccess.forEach((_, index) => {
    guardAccess[index] = false;
  });
  pendingGuardMove = null;
  pendingGuardPlayerIndex = null;

  currentPlayerIndex = 0;
  movesRemaining = 0;
  lastRoll = null;
  lastRollText = "-";
  lastDie1 = null;
  lastDie2 = null;
  extraTurnPending = false;
  extraTurnReason = null;
  justRolledDouble = false;
  reachableKeys = new Set();

  turnCounter = 0;
  if (typeof turnsUntilResources !== "undefined") {
    turnsUntilResources = RESOURCE_INTERVAL;
  }
  if (typeof turnsUntilTreasure !== "undefined") {
    turnsUntilTreasure = TREASURE_INTERVAL;
  }
  if (typeof treasureTurnsRemaining !== "undefined") {
    treasureTurnsRemaining = 0;
  }
  if (typeof flowerTurnsRemaining !== "undefined") {
    flowerTurnsRemaining = 0;
  }
  if (typeof masterTurnsRemaining !== "undefined") {
    masterTurnsRemaining = 0;
  }
  if (typeof masterActive !== "undefined") {
    masterActive = false;
  }
  if (typeof masterNextSpawnTurn !== "undefined") {
    masterNextSpawnTurn = MASTER_SPAWN_INTERVAL;
  }
  if (typeof cloverTurnsRemaining !== "undefined") {
    cloverTurnsRemaining = 0;
  }

  if (typeof treasure !== "undefined") treasure = null;
  if (typeof flowerArtifact !== "undefined") flowerArtifact = null;
  if (typeof cloverArtifact !== "undefined") cloverArtifact = null;

  if (typeof resetDynamicCells === "function") {
    resetDynamicCells();
  } else {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const key = `${x},${y}`;
        if (nodeByPos[key]) continue;
        setCellToInactive(x, y, { skipTreasureCleanup: true });
      }
    }
    Object.keys(resourceByPos).forEach(key => delete resourceByPos[key]);
    Object.keys(specialByPos).forEach(key => delete specialByPos[key]);
    Object.keys(stoneByPos).forEach(key => delete stoneByPos[key]);
    Object.keys(rainbowByPos).forEach(key => delete rainbowByPos[key]);
    barbarianCells.length = 0;
    barbarianRespawnTimers.length = 0;
    mercenaries.length = 0;
    thieves.length = 0;
    cutthroats.length = 0;
  }
  thieves.length = 0;
  cutthroats.length = 0;
  cutthroatIdCounter = 1;

  Object.keys(castleOwnersByKey).forEach(key => {
    castleOwnersByKey[key] = undefined;
    const node = nodeByPos[key];
    if (node && node.elem) {
      node.elem.classList.remove("owned");
      node.elem.style.background = "";
      node.elem.style.borderColor = "";
    }
  });
  Object.keys(castleStatsByKey).forEach(key => delete castleStatsByKey[key]);
  importantNodes.forEach(node => {
    if (node.type !== "castle") return;
    const key = `${node.x},${node.y}`;
    castleOwnersByKey[key] = undefined;
    ensureCastleStats(key);
    updateCastleBadge(key);
  });

  mercenaryIdCounter = 1;
  thiefIdCounter = 1;
  barbarianPhaseStarted = false;
  robberEvent = null;

  if (typeof initFlowerSpawns === "function") initFlowerSpawns();
  if (typeof initStoneSpawns === "function") initStoneSpawns();
  if (typeof initCloverSpawns === "function") initCloverSpawns();
  if (typeof initRainbowSpawns === "function") initRainbowSpawns();
  if (typeof initPortalState === "function") initPortalState();

  if (typeof mageSlot !== "undefined") {
    mageSlot.active = false;
    mageSlot.turnsRemaining = 0;
    mageSlot.cell = null;
    mageSlot.key = null;
    mageSlot.x = null;
    mageSlot.y = null;
    mageSlot.nextSpawnTurn = 20;
    mageSlot.nextSpawnIndex = null;
    if (mageSlot.timerElem) {
      mageSlot.timerElem.remove();
      mageSlot.timerElem = null;
    }
  }

  if (typeof TROLL_CAVES !== "undefined") {
    TROLL_CAVES.forEach(cave => (cave.looted = false));
  }
  if (typeof initTrollState === "function") initTrollState();

  gameTimerSeconds = 0;
  if (gameTimerDisplay) {
    gameTimerDisplay.textContent = `?????: ${formatTime(gameTimerSeconds)}`;
  }

  updatePawns();
  players.forEach((_, index) => {
    recalcPlayerResourceIncome(index);
    updatePlayerResources(index);
  });
  updateTurnUI();
  updateStatusPanel();

  if (typeof emitStateNow === "function") {
    emitStateNow(true);
  }
}

if (newGameBtn) {
  newGameBtn.addEventListener("click", () => {
    resetGameState();
  });
}
function relayout() {
  const bodyPadding = 16;
  const gap = 32;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const leftWidth = playerSlotLeft?.offsetWidth || 260;
  const rightWidth = playerSlotRight?.offsetWidth || 260;
  let controlsBeside = true;
  if (playerSlotLeft && playerSlotRight) {
    const leftRect = playerSlotLeft.getBoundingClientRect();
    const rightRect = playerSlotRight.getBoundingClientRect();
    controlsBeside = Math.abs(leftRect.top - rightRect.top) < Math.max(leftRect.height, rightRect.height) * 0.5;
  }
  const controlsWidth = controlsBeside ? leftWidth + rightWidth : leftWidth;
  const gapCount = controlsBeside ? 2 : 1;
  const availableW = Math.max(0, viewportW - bodyPadding * 2 - controlsWidth - gap * gapCount);
  const summaryHeight = summaryBar ? summaryBar.getBoundingClientRect().height : 0;
  const availableH = Math.max(0, viewportH - bodyPadding * 2 - summaryHeight - gap * 2);

  const sizeByWidth = availableW > 0 ? availableW / COLS : MIN_CELL;
  const sizeByHeight = availableH > 0 ? availableH / ROWS : MIN_CELL;
  const nextSize = Math.floor(Math.min(sizeByWidth, sizeByHeight, MAX_CELL));
  const clamped = Math.max(MIN_CELL, nextSize);

  applyCellSize(clamped);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = grid[`${x},${y}`];
      cell.style.left = (x * cellSize) + "px";
      cell.style.top  = (y * cellSize) + "px";
    }
  }

  updatePawns();
}

applyCellSize(BASE_CELL);
relayout();
updateTurnUI();
window.addEventListener("resize", relayout);
scheduleAutoRoll();







