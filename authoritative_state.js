const DEFAULT_STATE = {
  version: 1,
  tick: 0,
  currentPlayerIndex: 0,
  turnCounter: 0
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
