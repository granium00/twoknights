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

function pickPlayerIndex() {
  const used = new Set(playerAssignments.values());
  if (!used.has(0)) return 0;
  if (!used.has(1)) return 1;
  return 0;
}

io.on("connection", socket => {
  const isHost = !hostId;
  if (isHost) hostId = socket.id;
  const playerIndex = pickPlayerIndex();
  playerAssignments.set(socket.id, playerIndex);
  socket.emit("role", { isHost, playerIndex });

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
  });

  socket.on("disconnect", () => {
    playerAssignments.delete(socket.id);
    if (socket.id === hostId) {
      hostId = null;
      const ids = Array.from(io.sockets.sockets.keys());
      if (ids.length > 0) {
        hostId = ids[0];
        io.to(hostId).emit("role", { isHost: true, playerIndex: playerAssignments.get(hostId) });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
