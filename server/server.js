
const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('WebSocket server is running');
});


const wss = new WebSocketServer({ server });


const rooms = new Map();

function broadcast(roomId, data, exceptSocket = null) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client !== exceptSocket && client.readyState === client.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (socket) => {
  socket.meta = { roomId: null, userId: null };

  socket.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      return;
    }

    if (data.type === 'join') {
      const { roomId, userId } = data;
      socket.meta = { roomId, userId };

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(socket);
      console.log(`${userId} joined room ${roomId}`);
      return;
    }


    const { roomId } = socket.meta;
    if (roomId) broadcast(roomId, data, socket);
  });

  socket.on('close', () => {
    const { roomId } = socket.meta;
    if (!roomId) return;
    const set = rooms.get(roomId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) rooms.delete(roomId);
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Server running on ws://localhost:${PORT}`);
});
