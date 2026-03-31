// ────────────────────────────────────────
//   ХОД ПО СОСЕДНИМ КЛЕТКАМ (вверх, вниз, влево, вправо)
// ────────────────────────────────────────
game.addEventListener("click", e => {
  if (gameEnded) return;
  const rect = game.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const gridX = Math.floor(clickX / cellSize);
  const gridY = Math.floor(clickY / cellSize);

  if (gridX < 0 || gridX >= COLS || gridY < 0 || gridY >= ROWS) return;

  const key = `${gridX},${gridY}`;
  const currentPlayer = players[currentPlayerIndex];
  const inMultiplayer = typeof socket !== "undefined" && socket;
  if (typeof tryBallistaShot === "function" && ballistaModePlayerIndex === currentPlayerIndex) {
    if (tryBallistaShot(gridX, gridY)) {
      return;
    }
  }
  if (gridX === currentPlayer.x && gridY === currentPlayer.y) {
    openContextForKey(key, currentPlayerIndex);
    return;
  }
  if (movesRemaining <= 0) {
    return;
  }
  if (!reachableKeys.has(key)) {
    return;
  }
  const mercenaryTarget = getMercenaryAtKey(key);
  if (mercenaryTarget) {
    if (currentPlayer.pocket.army <= 0) {
      showPickupToast("В кармане нет войск для боя.");
      return;
    }
    // Сначала игрок становится на клетку наёмника, затем начинается бой
    currentPlayer.x = gridX;
    currentPlayer.y = gridY;
    updatePawns();
    const battleResult = resolveMercenaryBattle(currentPlayerIndex, mercenaryTarget);
    if (battleResult && battleResult.winnerIndex === currentPlayerIndex) {
      clearMercenaryCell(mercenaryTarget.x, mercenaryTarget.y);
      const idx = mercenaries.findIndex(m => m.id === mercenaryTarget.id);
      if (idx !== -1) mercenaries.splice(idx, 1);
    }
    showBattleModal(battleResult);
    endTurn();
    return;
  }
  const cutthroatTarget = typeof getCutthroatAtKey === "function" ? getCutthroatAtKey(key) : null;
  if (cutthroatTarget) {
    showPickupToast("Головорезы атакуют при соприкосновении.");
    return;
  }
  const thiefTarget = getThiefAtKey(key);
  if (thiefTarget) {
    const hit = Math.random() < 0.5;
    if (!hit) {
      showPickupToast("Вы промахнулись");
      endTurn();
      return;
    }
    clearThiefCell(thiefTarget.x, thiefTarget.y);
    const idx = thieves.findIndex(t => t.id === thiefTarget.id);
    if (idx !== -1) thieves.splice(idx, 1);
    finalizeMove(gridX, gridY);
    return;
  }
  const node = nodeByPos[key];
  if (node && node.id === 15 && currentPlayer.resources.influence < 500) {
    showPickupToast("Нужно 500 влияния, чтобы войти к Королю.");
    return;
  }
  const barbarianTarget = barbarianCells.find(cell => cell.key === key);
  const isGuardCell = guardKey && key === guardKey;
  if (isGuardCell) {
    const playerPosKey = `${currentPlayer.x},${currentPlayer.y}`;
    const nearGuard = guardApproachKeys.has(playerPosKey);
    if (!guardAccess[currentPlayerIndex] && !nearGuard) {
      showPickupToast("Подойдите ближе к страже!");
      return;
    }
    if (!guardAccess[currentPlayerIndex]) {
      const canBribe = getTotalGold(currentPlayer) >= 500;
      const canInfluence = currentPlayer.resources.influence >= 300;
      if (!canBribe && !canInfluence) {
        showPickupToast("Нужно 500 золота или 300 влияния, чтобы оплатить проход к стражу");
        return;
      }
    }
    showGuardModalFor(currentPlayerIndex, gridX, gridY, guardAccess[currentPlayerIndex]);
    return;
  }

  const defenderIndex = players.findIndex((player, index) => {
    return index !== currentPlayerIndex && player.x === gridX && player.y === gridY;
  });

  if (defenderIndex !== -1) {
    if (currentPlayer.pocket.army <= 0) {
      showPickupToast("В кармане нет войск для боя.");
      return;
    }
    const castleKey = getCastleBaseKeyForPos(gridX, gridY) || key;
    const node = nodeByPos[castleKey];
    const defenderOwnsCastle =
      node &&
      node.type === "castle" &&
      typeof castleOwnersByKey !== "undefined" &&
      castleOwnersByKey[castleKey] === defenderIndex;
    const battleResult = resolveBattle(currentPlayerIndex, defenderIndex, { noSteal: defenderOwnsCastle });
    const attackerWon = battleResult && battleResult.winnerIndex === currentPlayerIndex;
    if (defenderOwnsCastle && attackerWon) {
      showPickupToast("Победа над игроком. Начинается штурм замка.");
      finalizeMove(gridX, gridY);
      return;
    }
    if (attackerWon) {
      finalizeMove(gridX, gridY);
    } else {
      endTurn();
    }
    showBattleModal(battleResult, true);
    return;
  }
  if (barbarianTarget) {
    if (currentPlayer.pocket.army <= 0) {
      showPickupToast("В кармане нет войск для боя.");
      return;
    }
  }

  if (blockedCellKeys.has(key)) return;
  if (!reachableKeys.has(key)) {
    return;
  }

  finalizeMove(gridX, gridY);
});
