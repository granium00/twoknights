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

let hostId = null;
let latestState = null;
const playerAssignments = new Map();

function getAvailablePlayers() {
  const used = new Set(Array.from(playerAssignments.values()).filter(value => value !== null));
  const available = [];
  if (!used.has(0)) available.push(0);
  if (!used.has(1)) available.push(1);
  return available;
}

function getSocketIdByPlayerIndex(index) {
  for (const [socketId, value] of playerAssignments.entries()) {
    if (value === index) return socketId;
  }
  return null;
}

function broadcastRoles() {
  const availablePlayers = getAvailablePlayers();
  io.sockets.sockets.forEach(sock => {
    sock.emit("role", {
      isHost: sock.id === hostId,
      playerIndex: playerAssignments.get(sock.id),
      availablePlayers
    });
  });
}

io.on("connection", socket => {
  const isHost = !hostId;
  if (isHost) hostId = socket.id;
  playerAssignments.set(socket.id, null);
  socket.emit("role", { isHost, playerIndex: null, availablePlayers: getAvailablePlayers() });
  io.emit("playerAvailability", { availablePlayers: getAvailablePlayers() });

  if (latestState) {
    socket.emit("stateUpdate", latestState);
  }

  socket.on("clientAction", action => {
    if (hostId) {
      io.emit("hostAction", action);
    }
  });

  socket.on("hostAction", action => {
    socket.broadcast.emit("hostAction", action);
  });

  socket.on("hostState", state => {
    latestState = state;
    socket.broadcast.emit("stateUpdate", state);
    if (state && typeof state.currentPlayerIndex === "number") {
      const desiredHost = getSocketIdByPlayerIndex(state.currentPlayerIndex);
      if (desiredHost && desiredHost !== hostId) {
        hostId = desiredHost;
        broadcastRoles();
      }
    }
  });

  socket.on("pickupToast", payload => {
    if (!payload || typeof payload.text !== "string") return;
    io.emit("pickupToast", { text: payload.text });
  });

  socket.on("requestPlayerIndex", index => {
    if (index !== 0 && index !== 1) return;
    const taken = Array.from(playerAssignments.values()).some(value => value === index);
    if (taken) {
      socket.emit("role", {
        isHost: socket.id === hostId,
        playerIndex: playerAssignments.get(socket.id),
        availablePlayers: getAvailablePlayers()
      });
      return;
    }
    playerAssignments.set(socket.id, index);
    if (!latestState && index === 0) {
      hostId = socket.id;
    } else if (latestState && typeof latestState.currentPlayerIndex === "number" &&
      latestState.currentPlayerIndex === index) {
      hostId = socket.id;
    }
    socket.emit("role", {
      isHost: socket.id === hostId,
      playerIndex: index,
      availablePlayers: getAvailablePlayers()
    });
    io.emit("playerAvailability", { availablePlayers: getAvailablePlayers() });
    broadcastRoles();
  });

  socket.on("disconnect", () => {
    playerAssignments.delete(socket.id);
    io.emit("playerAvailability", { availablePlayers: getAvailablePlayers() });
    if (socket.id === hostId) {
      hostId = null;
      const ids = Array.from(io.sockets.sockets.keys());
      if (ids.length > 0) {
        hostId = ids[0];
        broadcastRoles();
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
