// ────────────────────────────────────────
//   СОЗДАНИЕ ВСЁ СЕТКИ 30×25
// ────────────────────────────────────────
const game = document.getElementById("game");
const container = document.getElementById("container");
const summaryBar = document.getElementById("summaryBar");
const playerSlotLeft = document.getElementById("playerSlotLeft");
const playerSlotRight = document.getElementById("playerSlotRight");
const resourceCountdown = document.getElementById("resourceCountdown");
const resourceCountdownLeft = document.getElementById("resourceCountdownLeft");
const resourceCountdownRight = document.getElementById("resourceCountdownRight");
const treasureState = document.getElementById("treasureState");
const treasureStateRight = document.getElementById("treasureStateRight");
const rollBtn = document.getElementById("rollBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const newGameBtn = document.getElementById("newGameBtn");
const turnInfo = document.getElementById("turnInfo");
const rollInfo = document.getElementById("rollInfo");
const movesInfo = document.getElementById("movesInfo");
const doubleMsg = document.getElementById("doubleMsg");
const currentPlayerName = document.getElementById("currentPlayerName");
const pickupToast = document.getElementById("pickupToast");
const pickupText = document.getElementById("pickupText");
const doubleToast = document.getElementById("doubleToast");
const barracksModal = document.getElementById("barracksModal");
const barracksClose = document.getElementById("barracksClose");
const barracksButtons = Array.from(document.querySelectorAll("[data-buy]"));
const lavkaModal = document.getElementById("lavkaModal");
const lavkaClose = document.getElementById("lavkaClose");
const lavkaButtons = Array.from(document.querySelectorAll("[data-lavka-buy]"));
const workshopModal = document.getElementById("workshopModal");
const workshopClose = document.getElementById("workshopClose");
const workshopButtons = Array.from(document.querySelectorAll("[data-workshop-buy]"));
const hireModal = document.getElementById("hireModal");
const hireClose = document.getElementById("hireClose");
const hireButtons = Array.from(document.querySelectorAll("[data-hire]"));
const repairModal = document.getElementById("repairModal");
const repairConfirm = document.getElementById("repairConfirm");
const repairCancel = document.getElementById("repairCancel");
const repairText = document.getElementById("repairText");
const gameOverModal = document.getElementById("gameOverModal");
const gameOverText = document.getElementById("gameOverText");
const cityModal = document.getElementById("cityModal");
const cityClose = document.getElementById("cityClose");
const cityRewardButtons = Array.from(document.querySelectorAll("[data-city-reward]"));
const cityExchangeButtons = Array.from(document.querySelectorAll("[data-city-exchange]"));
const cityKillsInfo = document.getElementById("cityKillsInfo");
const turnCounterDisplay = document.getElementById("turnCounter");
const gameTimerDisplay = document.getElementById("gameTimer");
const playerPanels = Array.from(document.querySelectorAll(".player-panel"));
const inventoryPanels = Array.from(document.querySelectorAll(".inventory-panel"));
const playerColorDots = Array.from(document.querySelectorAll(".player-color"));
const guardModal = document.getElementById("guardModal");
const guardBribeBtn = document.getElementById("guardBribeBtn");
const guardInfluenceBtn = document.getElementById("guardInfluenceBtn");
const guardPassBtn = document.getElementById("guardPassBtn");
const guardModalCancel = document.getElementById("guardModalCancel");
const robberModal = document.getElementById("robberModal");
const robberModalText = document.getElementById("robberModalText");
const robberFightBtn = document.getElementById("robberFightBtn");
const robberBribeBtn = document.getElementById("robberBribeBtn");
const robberBribeInfo = document.getElementById("robberBribeInfo");
const robberCount = document.getElementById("robberCount");
const stoneModal = document.getElementById("stoneModal");
const stoneTouchBtn = document.getElementById("stoneTouchBtn");
const stoneCloseBtn = document.getElementById("stoneCloseBtn");
const stoneResultModal = document.getElementById("stoneResultModal");
const stoneResultText = document.getElementById("stoneResultText");
const stoneResultClose = document.getElementById("stoneResultClose");
const trollCaveModal = document.getElementById("trollCaveModal");
const trollCaveText = document.getElementById("trollCaveText");
const trollCaveClose = document.getElementById("trollCaveClose");
const masterModal = document.getElementById("masterModal");
const masterBuyHilt = document.getElementById("masterBuyHilt");
const masterBuyGold = document.getElementById("masterBuyGold");
const masterBuyToken = document.getElementById("masterBuyToken");
const masterBuyGoldRainbow = document.getElementById("masterBuyGoldRainbow");
const masterBuyTerrorRing = document.getElementById("masterBuyTerrorRing");
const masterCloseBtn = document.getElementById("masterCloseBtn");
const battleModal = document.getElementById("battleModal");
const battleSummary = document.getElementById("battleSummary");
const battleClose = document.getElementById("battleClose");
const castleModal = document.getElementById("castleModal");
const castleLevelValue = document.getElementById("castleLevelValue");
const castleArmorValue = document.getElementById("castleArmorValue");
const castleHealthValue = document.getElementById("castleHealthValue");
const castleNextBonus = document.getElementById("castleNextBonus");
const castleUpgradeBtn = document.getElementById("castleUpgradeBtn");
const castleUpgradeCostLabel = document.getElementById("castleUpgradeCost");
const castleModalClose = document.getElementById("castleModalClose");
const castleWallBadge = document.getElementById("castleWallBadge");
const castleWithdrawInput = document.getElementById("castleWithdrawInput");
const castleWithdrawBtn = document.getElementById("castleWithdrawBtn");
const castleDepositInput = document.getElementById("castleDepositInput");
const castleDepositBtn = document.getElementById("castleDepositBtn");
const castleStorageDisplay = document.querySelector("[data-castle-storage]");
const castleWithdrawArmy = document.querySelector("[data-castle-army]");
const ballistaBuyBtn = document.getElementById("ballistaBuyBtn");
const boltBuyBtn = document.getElementById("boltBuyBtn");
let castleModalKey = null;
let castleModalPlayerIndex = null;
const castleFeatureButtons = Array.from(document.querySelectorAll("[data-castle-feature]"));
const castleFeatureStatusElems = {};
castleFeatureButtons.forEach(btn => {
  const feature = btn.dataset.castleFeature;
  castleFeatureStatusElems[feature] = document.querySelector(`[data-feature-status="${feature}"]`);
});
const blockedCellNumbers = [739, 709, 679, 650, 620, 591, 562, 505, 504, 477, 476, 450, 449, 448];
const blockedCellKeys = new Set(blockedCellNumbers.map(num => {
  const index = num - 1;
  const x = index % COLS;
  const y = Math.floor(index / COLS);
  return `${x},${y}`;
}));
const grid = {};

function applyCellSize(size) {
  cellSize = size;
  document.documentElement.style.setProperty("--cell-size", `${cellSize}px`);
  document.documentElement.style.setProperty("--cell-font", `${Math.max(10, Math.round(cellSize * 0.25))}px`);
  game.style.width = (COLS * cellSize) + "px";
  game.style.height = (ROWS * cellSize) + "px";

  const dragonCell = document.querySelector(".dragon-2x2");
  if (dragonCell) {
    dragonCell.style.width = `calc(${cellSize}px * 2)`;
    dragonCell.style.height = `calc(${cellSize}px * 2)`;
  }
  const castleCells = document.querySelectorAll(".castle-2x2");
  castleCells.forEach(cell => {
    cell.style.width = `calc(${cellSize}px * 2)`;
    cell.style.height = `calc(${cellSize}px * 2)`;
  });
}

for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const cell = document.createElement("div");
    cell.className = "cell inactive";
    cell.style.left = (x * cellSize) + "px";
    cell.style.top  = (y * cellSize) + "px";
    cell.textContent = "";
    const coordLabel = document.createElement("span");
    coordLabel.className = "cell-coords";
    coordLabel.textContent = `${(x + 1).toString().padStart(2, "0")}:${(y + 1).toString().padStart(2, "0")}`;
    cell.appendChild(coordLabel);

    const key = `${x},${y}`;
    if (blockedCellKeys.has(key)) {
      cell.classList.add("blocked");
    }
    grid[key] = cell;
    game.appendChild(cell);
  }
}
