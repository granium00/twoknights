const COLS = 30;
const ROWS = 25;

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
      return state;
    }
    case "move": {
      if (action.playerIndex !== state.currentPlayerIndex) return state;
      if (typeof action.x !== "number" || typeof action.y !== "number") return state;
      if (action.x < 0 || action.x >= COLS || action.y < 0 || action.y >= ROWS) return state;
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
