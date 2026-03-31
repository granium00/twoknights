const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = decoded.replace(/\0/g, "");
  const resolved = path.normalize(path.join(ROOT, cleaned));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith("/socket.io/")) {
    return;
  }
  const urlPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = safePath(urlPath);
  if (!filePath) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
});

const io = new Server(server, {
  cors: { origin: "*" }
});

let authoritativeState = null;
const playerAssignments = new Map();

function getAvailablePlayers() {
  const used = new Set(Array.from(playerAssignments.values()).filter(value => value !== null));
  const available = [];
  if (!used.has(0)) available.push(0);
  if (!used.has(1)) available.push(1);
  return available;
}

function broadcastRoles() {
  const availablePlayers = getAvailablePlayers();
  io.sockets.sockets.forEach(sock => {
    sock.emit("role", {
      isHost: false,
      playerIndex: playerAssignments.get(sock.id),
      availablePlayers
    });
  });
}

io.on("connection", socket => {
  playerAssignments.set(socket.id, null);
  socket.emit("role", { isHost: false, playerIndex: null, availablePlayers: getAvailablePlayers() });
  io.emit("playerAvailability", { availablePlayers: getAvailablePlayers() });

  if (authoritativeState) {
    socket.emit("auth:state", authoritativeState);
  }

  socket.on("auth:sync", payload => {
    if (!payload || !payload.state) return;
    const assignedPlayer = playerAssignments.get(socket.id);
    if (typeof payload.playerIndex === "number" && typeof assignedPlayer === "number") {
      if (payload.playerIndex !== assignedPlayer) return;
    }
    if (authoritativeState &&
      typeof authoritativeState.currentPlayerIndex === "number" &&
      typeof payload.playerIndex === "number" &&
      payload.playerIndex !== authoritativeState.currentPlayerIndex) {
      return;
    }
    if (typeof payload.state.currentPlayerIndex === "number" &&
      typeof payload.playerIndex === "number" &&
      authoritativeState &&
      payload.playerIndex !== authoritativeState.currentPlayerIndex &&
      payload.state.currentPlayerIndex !== payload.playerIndex) {
      return;
    }
    authoritativeState = payload.state;
    io.emit("auth:state", authoritativeState);
  });

  socket.on("auth:requestState", () => {
    if (authoritativeState) {
      socket.emit("auth:state", authoritativeState);
    }
  });

  socket.on("pickupToast", payload => {
    if (!payload || typeof payload.text !== "string") return;
    io.emit("pickupToast", { text: payload.text, senderId: socket.id });
  });

  socket.on("requestPlayerIndex", index => {
    if (index !== 0 && index !== 1) return;
    const taken = Array.from(playerAssignments.values()).some(value => value === index);
    if (taken) {
      socket.emit("role", {
        isHost: false,
        playerIndex: playerAssignments.get(socket.id),
        availablePlayers: getAvailablePlayers()
      });
      return;
    }
    playerAssignments.set(socket.id, index);
    socket.emit("role", {
      isHost: false,
      playerIndex: index,
      availablePlayers: getAvailablePlayers()
    });
    io.emit("playerAvailability", { availablePlayers: getAvailablePlayers() });
    broadcastRoles();
  });

  socket.on("disconnect", () => {
    playerAssignments.delete(socket.id);
    io.emit("playerAvailability", { availablePlayers: getAvailablePlayers() });
  });
});
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
