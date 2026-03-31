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
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 0, y: 0 }
  ]
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createAuthoritativeState() {
  return clone(DEFAULT_STATE);
}

function applyAuthoritativeAction(state, action) {
  if (!action || typeof action.type !== "string") return state;
  switch (action.type) {
    case "bootstrap": {
      if (!action.state) return state;
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
            state.players[idx] = { id: idx, x: 0, y: 0 };
          }
          if (typeof p.x === "number") state.players[idx].x = p.x;
          if (typeof p.y === "number") state.players[idx].y = p.y;
        });
      }
      state.tick += 1;
      return state;
    }
    case "roll": {
      if (action.playerIndex !== state.currentPlayerIndex) return state;
      if (typeof action.roll === "number") {
        state.lastRoll = action.roll;
        state.movesRemaining = action.roll;
      }
      if (typeof action.die1 === "number") state.lastDie1 = action.die1;
      if (typeof action.die2 === "number") state.lastDie2 = action.die2;
      state.tick += 1;
      return state;
    }
    case "move": {
      if (action.playerIndex !== state.currentPlayerIndex) return state;
      if (typeof action.x !== "number" || typeof action.y !== "number") return state;
      if (state.movesRemaining <= 0) return state;
      const player = state.players[action.playerIndex];
      if (!player) return state;
      player.x = action.x;
      player.y = action.y;
      state.movesRemaining = Math.max(0, state.movesRemaining - 1);
      state.tick += 1;
      return state;
    }
    case "end_turn": {
      if (action.playerIndex !== state.currentPlayerIndex) return state;
      state.movesRemaining = 0;
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      state.turnCounter += 1;
      state.tick += 1;
      return state;
    }
    case "noop":
      state.tick += 1;
      return state;
    default:
      return state;
  }
}

module.exports = {
  createAuthoritativeState,
  applyAuthoritativeAction
};
