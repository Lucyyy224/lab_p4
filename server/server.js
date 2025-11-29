// importing http and WebSocket modules
const http = require('http');
const { WebSocketServer } = require('ws');

// creating a simple HTTP server just to respond with a message
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type':'text/plain' });
  res.end('WebSocket server is running');
});

// passing the HTTP server to the WebSocket server
const wss = new WebSocketServer({ server });

// storing all active rooms (each room has a Set of sockets)
const rooms = new Map();

// storing each room’s state (like its random topic)
const roomState = new Map();

// defining the list of drawing topics to choose from
const TOPICS = ['butterfly','bird','cat'];

// picking one random topic from the list
function pickTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

// sending a message to everyone in the same room except the sender
function broadcast(roomId, data, except) {
  const set = rooms.get(roomId);
  if (!set) return;
  const msg = JSON.stringify(data);
  set.forEach(c => {
    if (c !== except && c.readyState === c.OPEN) c.send(msg);
  });
}

// listening for a new client connection
wss.on('connection', (socket) => {
  socket.meta = { roomId: null, userId: null };

  // telling the server what to do when it receives a message
  socket.on('message', (buf) => {
    let data; 
    try { data = JSON.parse(buf.toString()); } catch { return; }

    // when a new user joins a room
    if (data.type === 'join') {
      const { roomId, userId } = data;
      socket.meta = { roomId, userId };

      // create the room if it doesn’t exist yet
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(socket);

      // if this room has no topic yet, give it one
      if (!roomState.has(roomId)) {
        roomState.set(roomId, { topic: pickTopic() });
      }

      // send the room’s topic info back to this client
      const state = roomState.get(roomId);
      socket.send(JSON.stringify({ type:'roomState', ...state }));

      return;
    }

    const { roomId } = socket.meta;
    if (!roomId) return;

    // share draw or clear actions with everyone else in the room
    if (data.type === 'draw' || data.type === 'clear') {
      broadcast(roomId, data, socket);
    }
  });

  // when someone disconnects, clean up their room data
  socket.on('close', () => {
    const { roomId } = socket.meta;
    const set = rooms.get(roomId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) {
      rooms.delete(roomId);
      roomState.delete(roomId);
    }
  });
});

// starting the WebSocket server on port 3002
const PORT = 3002;
server.listen(PORT, () => {
  console.log('WS server on ws://localhost:3002');
});
